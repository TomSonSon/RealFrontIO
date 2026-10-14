import {
  decodeRealWorldCountryRaster,
  REAL_WORLD_COUNTRIES,
  REAL_WORLD_WIDTH as W,
} from "@openfront/engine-api/resources/RealWorldCountries";
import {
  REALISM_STRUCTURES,
  realismCapitalFor,
  realismCityCount,
  realismStructuresFor,
  type RealismStructureKind,
} from "@openfront/engine-api/resources/RealismStructures";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const bits = fs.readFileSync(
  path.join(ROOT, "resources/maps/realisticworld/map.bin"),
);
const owner = decodeRealWorldCountryRaster();
const byName = new Map(REAL_WORLD_COUNTRIES.map((c) => [c.name, c]));
const OCEAN_BIT = 1 << 5;

const NUCLEAR = [
  "United States",
  "Russia",
  "China",
  "United Kingdom",
  "France",
  "India",
  "Pakistan",
  "North Korea",
  "Israel",
];
const CAPS: Record<string, number> = {
  factory: 50,
  silo: 20,
  sam: 35,
  post: 60,
};
const SILO_CAPS: Record<string, number> = {
  "United States": 30,
  Russia: 30,
  China: 30,
};
const SPACING: Record<RealismStructureKind, number> = {
  city: 4,
  port: 6,
  factory: 4,
  silo: 8,
  sam: 2,
  post: 2,
};

// [country, capital, x, y] from lat/lon with x = (lon + 180) / 360 * 5000,
// y = (90 - lat) / 180 * 2500.
const CAPITALS: [string, string, number, number][] = [
  ["Germany", "Berlin", 2686, 521],
  ["France", "Paris", 2533, 571],
  ["United Kingdom", "London", 2498, 535],
  ["Spain", "Madrid", 2449, 689],
  ["Italy", "Rome", 2674, 668],
  ["Poland", "Warsaw", 2792, 525],
  ["Ukraine", "Kyiv", 2924, 549],
  ["Russia", "Moscow", 3022, 476],
  ["Egypt", "Cairo", 2934, 833],
  ["United States", "Washington DC", 1430, 710],
  ["Brazil", "Brasilia", 1835, 1469],
  ["China", "Beijing", 4117, 696],
  ["Japan", "Tokyo", 4440, 754],
  ["India", "New Delhi", 3572, 853],
  ["Australia", "Canberra", 4571, 1740],
];

function count(kind: RealismStructureKind, country?: string): number {
  return REALISM_STRUCTURES.filter(
    (s) => s.kind === kind && (country === undefined || s.country === country),
  ).length;
}

describe("RealismStructures", () => {
  it("gives every country exactly one capital inside its own territory", () => {
    for (const c of REAL_WORLD_COUNTRIES) {
      const capitals = realismStructuresFor(c.name).filter((s) => s.capital);
      expect(capitals, c.name).toHaveLength(1);
      expect(capitals[0].kind).toBe("city");
      expect(owner[capitals[0].y * W + capitals[0].x], c.name).toBe(c.index);
    }
  });

  it.each(CAPITALS)("places the capital of %s (%s)", (country, name, x, y) => {
    const capital = realismCapitalFor(country);
    expect(capital?.name).toBe(name);
    expect(Math.hypot(capital!.x - x, capital!.y - y)).toBeLessThanOrEqual(10);
  });

  it("keeps Moscow west of the Urals", () => {
    const moscow = realismCapitalFor("Russia")!;
    expect(owner[moscow.y * W + moscow.x]).toBe(byName.get("Russia")!.index);
    expect(moscow.x).toBeLessThan(((60 + 180) / 360) * 5000);
  });

  it("puts every structure on land of its own country, one per tile", () => {
    const tiles = new Set<number>();
    for (const s of REALISM_STRUCTURES) {
      const tile = s.y * W + s.x;
      expect(owner[tile], `${s.country} ${s.name}`).toBe(
        byName.get(s.country)!.index,
      );
      expect(bits[tile] & 0x80).not.toBe(0);
      expect(tiles.has(tile), `${s.country} ${s.name}`).toBe(false);
      tiles.add(tile);
    }
  });

  it("puts ports next to the ocean, never only a lake", () => {
    for (const s of REALISM_STRUCTURES) {
      if (s.kind !== "port") continue;
      const t = s.y * W + s.x;
      const near = [t - 1, t + 1, t - W, t + W].some(
        (n) => n >= 0 && n < bits.length && (bits[n] & OCEAN_BIT) !== 0,
      );
      expect(near, `${s.country} ${s.name}`).toBe(true);
    }
  });

  it("keeps the minimum spacing per kind", () => {
    for (const kind of Object.keys(SPACING) as RealismStructureKind[]) {
      const list = REALISM_STRUCTURES.filter(
        (s) => s.kind === kind && s.capital !== true,
      );
      const all = REALISM_STRUCTURES.filter((s) => s.kind === kind);
      const tooClose = list.filter((a) =>
        all.some(
          (b) => a !== b && Math.hypot(a.x - b.x, a.y - b.y) < SPACING[kind],
        ),
      );
      expect(
        tooClose.map((s) => `${kind} ${s.country} ${s.name}`),
        kind,
      ).toEqual([]);
    }
  });

  it("builds silos only for nuclear states", () => {
    const owners = new Set(
      REALISM_STRUCTURES.filter((s) => s.kind === "silo").map((s) => s.country),
    );
    for (const o of owners) expect(NUCLEAR).toContain(o);
    expect(owners.size).toBe(NUCLEAR.length);
  });

  it("respects the per-country caps", () => {
    for (const c of REAL_WORLD_COUNTRIES) {
      for (const [kind, cap] of Object.entries(CAPS)) {
        const limit = kind === "silo" ? (SILO_CAPS[c.name] ?? cap) : cap;
        expect(
          realismStructuresFor(c.name).filter((s) => s.kind === kind).length,
          `${c.name} ${kind}`,
        ).toBeLessThanOrEqual(limit);
      }
    }
  });

  it("totals stay in the expected bands", () => {
    const totals = Object.fromEntries(
      (["city", "port", "factory", "silo", "sam", "post"] as const).map((k) => [
        k,
        count(k),
      ]),
    );
    console.log("realism structure totals", totals, REALISM_STRUCTURES.length);
    expect(totals.city).toBeGreaterThanOrEqual(900);
    expect(totals.city).toBeLessThanOrEqual(2500);
    expect(totals.port).toBeGreaterThanOrEqual(600);
    expect(totals.port).toBeLessThanOrEqual(900);
    expect(totals.factory).toBeGreaterThanOrEqual(400);
    expect(totals.silo).toBeGreaterThanOrEqual(60);
    expect(totals.silo).toBeLessThanOrEqual(300);
    expect(totals.sam).toBeGreaterThanOrEqual(350);
    expect(totals.post).toBeGreaterThanOrEqual(600);
  });

  it("matches known countries", () => {
    expect(realismCityCount("Germany")).toBeGreaterThanOrEqual(15);
    expect(count("factory", "Germany")).toBeGreaterThanOrEqual(5);
    expect(realismCityCount("Luxembourg")).toBe(1);
    const siloStates = new Set(
      realismStructuresFor("United States")
        .filter((s) => s.kind === "silo")
        .map((s) => silo(s.x, s.y)),
    );
    expect(siloStates).toContain("Montana");
    expect(siloStates).toContain("Wyoming");
    expect(siloStates).toContain("North Dakota");
  });

  it("memoizes its helpers deterministically", () => {
    expect(realismStructuresFor("Germany")).toBe(
      realismStructuresFor("Germany"),
    );
    expect(realismStructuresFor("Nowhere")).toHaveLength(0);
    expect(realismCapitalFor("Nowhere")).toBeUndefined();
    const order = REALISM_STRUCTURES.map((s) => byName.get(s.country)!.index);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("stays small", () => {
    const size = fs.statSync(
      path.join(ROOT, "packages/engine-api/src/resources/RealismStructures.ts"),
    ).size;
    expect(size).toBeLessThan(400 * 1024);
  });
});

// Rough lon/lat boxes of the three US ICBM states (degrees).
function silo(x: number, y: number): string {
  const lon = (x / W) * 360 - 180;
  const lat = 90 - (y / 2500) * 180;
  if (lat >= 44.4 && lat <= 49 && lon >= -116 && lon <= -104) return "Montana";
  if (lat >= 41 && lat <= 45 && lon >= -111 && lon <= -104) return "Wyoming";
  if (lat >= 45.9 && lat <= 49 && lon >= -104 && lon <= -96.5)
    return "North Dakota";
  return "other";
}
