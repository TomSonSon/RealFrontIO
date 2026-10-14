import {
  decodeWorldCountryRaster,
  WORLD_COUNTRIES,
} from "@openfront/engine-api/resources/WorldCountries";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORLD = path.join(ROOT, "resources/maps/world");
const WIDTH = 2000;

const terrain = fs.readFileSync(path.join(WORLD, "map.bin"));
const manifest = JSON.parse(
  fs.readFileSync(path.join(WORLD, "manifest.json"), "utf-8"),
) as { nations: { name: string; coordinates: [number, number] }[] };
const raster = decodeWorldCountryRaster();

const SUB_REGION_PARENT: Record<string, string> = {
  Alaska: "United States",
  California: "United States",
  Texas: "United States",
  Nunavut: "Canada",
  Yukon: "Canada",
  Quebec: "Canada",
  Siberia: "Russia",
  "West Antarctica": "Antarctica",
  "East Antarctica": "Antarctica",
};

// Manifest spawns that sit in a neighbouring country on this map (distance
// in tiles to the country's nearest tile, rounded up).
const MISPLACED_SPAWNS: Record<string, number> = {
  Bhutan: 23,
  Benin: 14,
  Pakistan: 32,
};

const CHECKSUM = 1955582236;
const isLand = (tile: number) => (terrain[tile] & 0x80) !== 0;

function distanceToCountry(index: number, x: number, y: number): number {
  let best = Infinity;
  for (let t = 0; t < raster.length; t++) {
    if (raster[t] !== index) continue;
    const d = Math.hypot((t % WIDTH) - x, Math.floor(t / WIDTH) - y);
    if (d < best) best = d;
  }
  return best;
}

describe("WorldCountries", () => {
  test("raster covers the whole map and decodes deterministically", () => {
    expect(raster.length).toBe(2_000_000);
    expect(decodeWorldCountryRaster()).toBe(raster);
    let checksum = 0;
    for (let i = 0; i < raster.length; i++) {
      checksum = (Math.imul(checksum, 31) + raster[i]) | 0;
    }
    expect(checksum).toBe(CHECKSUM);
  });

  test("every land tile has a country and every other tile has none", () => {
    for (let t = 0; t < raster.length; t++) {
      if (isLand(t) !== (raster[t] !== 0)) {
        throw new Error(`tile ${t} land=${isLand(t)} country=${raster[t]}`);
      }
    }
  });

  test("metadata matches the raster", () => {
    const tiles = new Array<number>(WORLD_COUNTRIES.length + 1).fill(0);
    for (let t = 0; t < raster.length; t++) tiles[raster[t]]++;
    WORLD_COUNTRIES.forEach((c, i) => {
      expect(c.index).toBe(i + 1);
      expect(c.tiles).toBe(tiles[c.index]);
      expect(c.tiles).toBeGreaterThan(0);
      expect(raster[c.anchor[1] * WIDTH + c.anchor[0]]).toBe(c.index);
    });
    const landTiles = tiles.slice(1).reduce((a, b) => a + b, 0);
    expect(landTiles).toBe(651_569);
    expect(new Set(WORLD_COUNTRIES.map((c) => c.iso3)).size).toBe(
      WORLD_COUNTRIES.length,
    );
  });

  test("manifest nations start inside their country", () => {
    const byName = new Map(WORLD_COUNTRIES.map((c) => [c.manifestName, c]));
    for (const nation of manifest.nations) {
      const parent = SUB_REGION_PARENT[nation.name] ?? nation.name;
      const country = byName.get(parent);
      expect(country, nation.name).toBeDefined();
      const [x, y] = nation.coordinates;
      if (nation.name in MISPLACED_SPAWNS) {
        const d = distanceToCountry(country!.index, x, y);
        expect(d, nation.name).toBeGreaterThan(0);
        expect(d, nation.name).toBeLessThanOrEqual(
          MISPLACED_SPAWNS[nation.name],
        );
      } else {
        expect(raster[y * WIDTH + x], nation.name).toBe(country!.index);
      }
    }
  });
});
