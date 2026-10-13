import {
  countryIndexRemap,
  countryNeighbors,
  deriveSeed,
  roster,
  seedForCountry,
} from "@openfront/engine-api/resources/RealismCountries";
import { REALISTIC_SEEDS } from "@openfront/engine-api/resources/RealismData";
import { WORLD_COUNTRIES } from "@openfront/engine-api/resources/WorldCountries";
import { realisticSeedFor } from "@openfront/engine/realism/RealisticWorld";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test, vi } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "resources/maps/world/manifest.json"),
    "utf-8",
  ),
) as { nations: { name: string; flag: string }[] };

function byName(name: string) {
  const country = roster().find((c) => c.name === name);
  if (country === undefined) throw new Error(`no roster country ${name}`);
  return country;
}

function nameAt(index: number): string {
  const country = roster().find((c) => c.index === index);
  if (country === undefined) throw new Error(`no roster index ${index}`);
  return country.name;
}

function tilesOf(...iso3s: string[]): number {
  return iso3s.reduce(
    (sum, iso3) =>
      sum + (WORLD_COUNTRIES.find((c) => c.iso3 === iso3)?.tiles ?? 0),
    0,
  );
}

describe("RealismCountries roster", () => {
  test("has about 180 countries after merging dependencies", () => {
    expect(roster().length).toBeGreaterThanOrEqual(176);
    expect(roster().length).toBeLessThanOrEqual(182);
  });

  test("names are unique and indices are dense in order", () => {
    const names = roster().map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(roster().map((c) => c.index)).toEqual(roster().map((_, i) => i + 1));
  });

  test("tiny dependencies fold into their sovereign", () => {
    const iso3s = roster().map((c) => c.iso3);
    for (const dependency of [
      "ALA",
      "FRO",
      "GGY",
      "HKG",
      "IMN",
      "JEY",
      "MAC",
      "SPM",
    ]) {
      expect(iso3s).not.toContain(dependency);
    }
    expect(byName("China").tiles).toBe(tilesOf("CHN", "HKG", "MAC"));
    expect(byName("United Kingdom").tiles).toBe(
      tilesOf("GBR", "GGY", "JEY", "IMN"),
    );
    expect(byName("France").tiles).toBe(tilesOf("FRA", "SPM"));
    expect(byName("Finland").tiles).toBe(tilesOf("FIN", "ALA"));
    expect(byName("Denmark").tiles).toBe(tilesOf("DNK", "FRO"));
  });

  test("the original index of a merged dependency maps to its sovereign", () => {
    const hong = WORLD_COUNTRIES.find((c) => c.iso3 === "HKG");
    if (hong === undefined) throw new Error("HKG missing");
    expect(countryIndexRemap()[hong.index]).toBe(byName("China").index);
    expect(countryIndexRemap()[0]).toBe(0);
  });

  test("Palestine and Siachen stay standalone", () => {
    expect(byName("Palestine").iso3).toBe("PSE");
    expect(byName("Siachen Glacier").iso3).toBe("KAS");
  });

  test("every flag code has a file in resources/flags", () => {
    const missing = roster()
      .filter((c) => c.flag !== "")
      .filter(
        (c) =>
          !fs.existsSync(path.join(ROOT, "resources/flags", `${c.flag}.svg`)),
      )
      .map((c) => c.name);
    expect(missing).toEqual([]);
  });

  test("countries without a flag", () => {
    expect(
      roster()
        .filter((c) => c.flag === "")
        .map((c) => c.name)
        .sort(),
    ).toEqual(["Northern Cyprus", "Siachen Glacier", "Somaliland"]);
  });

  test("manifest nations take their REALISTIC_SEEDS row and flag", () => {
    for (const nation of manifest.nations) {
      const country = roster().find((c) => c.name === nation.name);
      if (country === undefined) continue;
      expect(country.flag).toBe(nation.flag);
      const row = REALISTIC_SEEDS[nation.name];
      if (row !== undefined) expect(seedForCountry(nation.name)).toEqual(row);
    }
  });

  test("derived seeds stay within their clamps", () => {
    for (const country of roster()) {
      const seed = deriveSeed(country);
      expect(seed.troops).toBeGreaterThanOrEqual(6000);
      expect(seed.troops).toBeLessThanOrEqual(100_000);
      expect(seed.gold).toBeGreaterThanOrEqual(15_000);
      expect(seed.gold).toBeLessThanOrEqual(500_000);
      expect(seedForCountry(country.name)).toBeDefined();
    }
  });

  test("countries without a seed row resolve through realisticSeedFor", () => {
    expect(realisticSeedFor("Lesotho")).toEqual(deriveSeed(byName("Lesotho")));
    expect(realisticSeedFor("Kenya")).toEqual(REALISTIC_SEEDS.Kenya);
    expect(realisticSeedFor("Atlantis")).toBeUndefined();
  });

  test("Antarctica is passive despite its size and has the research-station seed", () => {
    const antarctica = byName("Antarctica");
    expect(antarctica.tiles).toBeGreaterThanOrEqual(25);
    expect(antarctica.passive).toBe(true);
    expect(antarctica.slow).toBe(false);
    expect(seedForCountry("Antarctica")).toEqual({ troops: 2000, gold: 5000 });
    expect(REALISTIC_SEEDS.Antarctica).toEqual({ troops: 2000, gold: 5000 });
  });

  test("passive and slow flags follow the tile count", () => {
    for (const country of roster()) {
      expect(country.passive).toBe(
        country.tiles < 25 || country.name === "Antarctica",
      );
      expect(country.slow).toBe(country.tiles >= 25 && country.tiles < 100);
    }
    expect(
      roster()
        .filter((c) => c.passive)
        .map((c) => c.name)
        .sort(),
    ).toEqual([
      "Andorra",
      "Antarctica",
      "Bahrain",
      "Brunei",
      "Liechtenstein",
      "Luxembourg",
      "San Marino",
      "Siachen Glacier",
      "Singapore",
      "Trinidad and Tobago",
    ]);
  });
});

describe("RealismCountries neighbours", () => {
  test("Spain borders Portugal and France", () => {
    const names = countryNeighbors(byName("Spain").index).map(nameAt);
    expect(names).toContain("Portugal");
    expect(names).toContain("France");
  });

  test("Lesotho borders only South Africa", () => {
    expect(countryNeighbors(byName("Lesotho").index).map(nameAt)).toEqual([
      "South Africa",
    ]);
  });

  test("lists are sorted ascending and symmetric", () => {
    for (const country of roster()) {
      const list = countryNeighbors(country.index);
      expect(list).toEqual([...list].sort((a, b) => a - b));
      for (const other of list) {
        expect(countryNeighbors(other)).toContain(country.index);
      }
    }
  });

  test("rebuilding from scratch gives identical output", async () => {
    const before = JSON.stringify([
      roster(),
      Array.from(countryIndexRemap()),
      roster().map((c) => countryNeighbors(c.index)),
    ]);
    vi.resetModules();
    const fresh =
      await import("@openfront/engine-api/resources/RealismCountries");
    const after = JSON.stringify([
      fresh.roster(),
      Array.from(fresh.countryIndexRemap()),
      fresh.roster().map((c) => fresh.countryNeighbors(c.index)),
    ]);
    expect(after).toBe(before);
  });
});
