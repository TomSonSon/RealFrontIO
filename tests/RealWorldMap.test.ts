import { GameMapType, hiddenMaps } from "@openfront/engine-api/game/GameTypes";
import {
  decodeRealWorldCountryRaster,
  REAL_WORLD_COUNTRIES,
  REAL_WORLD_HEIGHT,
  REAL_WORLD_WIDTH,
} from "@openfront/engine-api/resources/RealWorldCountries";
import {
  decodeWorldCountryRaster,
  WORLD_COUNTRIES,
} from "@openfront/engine-api/resources/WorldCountries";
import { genTerrainFromBin } from "@openfront/engine-lib/game/TerrainMapLoader";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "resources/maps/realisticworld");
const W = REAL_WORLD_WIDTH;
const H = REAL_WORLD_HEIGHT;
const DEG = 360 / W;

const decodeStart = performance.now();
const raster = decodeRealWorldCountryRaster();
const decodeMs = performance.now() - decodeStart;
console.log(`Realistic World raster decode: ${decodeMs.toFixed(0)} ms`);

type Meta = { width: number; height: number; num_land_tiles: number };
const manifest = JSON.parse(
  fs.readFileSync(path.join(DIR, "manifest.json"), "utf-8"),
) as Record<"map" | "map4x" | "map16x", Meta>;
const bins = {
  map: fs.readFileSync(path.join(DIR, "map.bin")),
  map4x: fs.readFileSync(path.join(DIR, "map4x.bin")),
  map16x: fs.readFileSync(path.join(DIR, "map16x.bin")),
};

const CHECKSUM = 408613029;

function tileAt(lat: number, lon: number): number {
  const x = Math.floor((lon + 180) / DEG);
  const y = Math.floor((90 - lat) / DEG);
  return y * W + x;
}

const isLand = (t: number) => (bins.map[t] & 0x80) !== 0;
const isOcean = (t: number) => (bins.map[t] & 0x20) !== 0;
const magnitude = (t: number) => bins.map[t] & 31;

function countryAt(lat: number, lon: number) {
  return REAL_WORLD_COUNTRIES[raster[tileAt(lat, lon)] - 1];
}

/** Area of a tile in km2 on a sphere. */
function tileAreaKm2(y: number): number {
  const R = 6371;
  const lat0 = ((90 - y * DEG) * Math.PI) / 180;
  const lat1 = ((90 - (y + 1) * DEG) * Math.PI) / 180;
  return R * R * ((DEG * Math.PI) / 180) * (Math.sin(lat0) - Math.sin(lat1));
}

/** 4-connected water tiles reachable from a water tile. */
function waterComponent(
  start: number,
  box: [number, number, number, number] = [0, H - 1, 0, W - 1],
): Uint8Array {
  const [y0, y1, x0, x1] = box;
  const seen = new Uint8Array(W * H);
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const t = stack.pop()!;
    const y = Math.floor(t / W);
    const x = t - y * W;
    for (const [ny, nx] of [
      [y - 1, x],
      [y + 1, x],
      [y, x - 1],
      [y, x + 1],
    ]) {
      if (ny < y0 || ny > y1 || nx < x0 || nx > x1) continue;
      const n = ny * W + nx;
      if (seen[n] === 0 && !isLand(n)) {
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  return seen;
}

function classMix(tiles: Iterable<number>): number[] {
  const n = [0, 0, 0];
  let total = 0;
  for (const m of tiles) {
    n[m < 10 ? 0 : m < 20 ? 1 : 2]++;
    total++;
  }
  return n.map((c) => (100 * c) / total);
}

describe("Realistic World map files", () => {
  test("load through the engine terrain loader at all three scales", async () => {
    for (const [key, data] of Object.entries(bins) as [
      keyof typeof bins,
      Uint8Array,
    ][]) {
      const map = await genTerrainFromBin(manifest[key], data);
      let land = 0;
      for (let t = 0; t < data.length; t++) {
        if (map.isLand(t) && !map.isImpassable(t)) land++;
      }
      expect(land, key).toBe(manifest[key].num_land_tiles);
    }
    expect(manifest.map.width).toBe(5000);
    expect(manifest.map.height).toBe(2500);
  });

  test("is registered but hidden from pickers and playlists", () => {
    expect(GameMapType.RealisticWorld).toBe("Realistic World");
    expect(hiddenMaps.has(GameMapType.RealisticWorld)).toBe(true);
    expect(hiddenMaps.has(GameMapType.World)).toBe(false);
  });
});

describe("Realistic World country raster", () => {
  test("decodes fast, memoized and deterministically", () => {
    expect(decodeMs).toBeLessThan(300);
    expect(decodeRealWorldCountryRaster()).toBe(raster);
    expect(raster.length).toBe(W * H);
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
    const tiles = new Array<number>(REAL_WORLD_COUNTRIES.length + 1).fill(0);
    for (let t = 0; t < raster.length; t++) tiles[raster[t]]++;
    REAL_WORLD_COUNTRIES.forEach((c, i) => {
      expect(c.index).toBe(i + 1);
      expect(c.tiles).toBe(tiles[c.index]);
      expect(c.tiles).toBeGreaterThan(0);
      expect(raster[c.anchor[1] * W + c.anchor[0]]).toBe(c.index);
      expect(c.spawn).toEqual(c.anchor);
    });
    const landTiles = tiles.slice(1).reduce((a, b) => a + b, 0);
    expect(landTiles).toBe(manifest.map.num_land_tiles);
    expect(new Set(REAL_WORLD_COUNTRIES.map((c) => c.iso3)).size).toBe(
      REAL_WORLD_COUNTRIES.length,
    );
  });

  test("keeps the names and codes of the World roster", () => {
    const byIso = new Map(REAL_WORLD_COUNTRIES.map((c) => [c.iso3, c]));
    const missing: string[] = [];
    for (const old of WORLD_COUNTRIES) {
      const c = byIso.get(old.iso3);
      if (c === undefined) {
        missing.push(old.iso3);
        continue;
      }
      expect(c.name, old.iso3).toBe(old.name);
      expect(c.manifestName, old.iso3).toBe(old.manifestName);
    }
    // Dependencies too small to own a tile at 8 km.
    expect(missing.sort()).toEqual(["GGY", "IMN", "JEY", "KAS", "SPM"]);
  });
});

describe("Realistic World geography", () => {
  const cities: [string, number, number, string][] = [
    ["Berlin", 52.52, 13.4, "DEU"],
    ["Paris", 48.857, 2.352, "FRA"],
    ["London", 51.507, -0.128, "GBR"],
    ["Rome", 41.903, 12.496, "ITA"],
    ["Madrid", 40.417, -3.704, "ESP"],
    ["Tokyo", 35.69, 139.692, "JPN"],
    ["Cairo", 30.044, 31.236, "EGY"],
    ["Washington DC", 38.907, -77.037, "USA"],
    ["Brasilia", -15.794, -47.883, "BRA"],
    ["Canberra", -35.281, 149.13, "AUS"],
    ["Beijing", 39.904, 116.407, "CHN"],
    ["Moscow", 55.756, 37.617, "RUS"],
    ["New Delhi", 28.614, 77.209, "IND"],
  ];

  test.each(cities)("%s is land in the right country", (_n, lat, lon, iso) => {
    expect(isLand(tileAt(lat, lon))).toBe(true);
    expect(countryAt(lat, lon).iso3).toBe(iso);
  });

  const seas: [string, number, number][] = [
    ["Mediterranean", 35, 18],
    ["North Sea", 56, 3],
    ["Gulf of Mexico", 25, -90],
    ["Sea of Japan", 40, 135],
    ["Persian Gulf", 27, 51],
    ["Black Sea", 43, 34],
  ];

  test.each(seas)("%s is ocean water", (_n, lat, lon) => {
    const t = tileAt(lat, lon);
    expect(isLand(t)).toBe(false);
    expect(isOcean(t)).toBe(true);
    expect(raster[t]).toBe(0);
  });

  test.each([
    ["Caspian Sea", 42, 50.5],
    ["Lake Michigan", 44, -87],
    ["Lake Superior", 48, -88],
    ["Lake Victoria", -1, 33],
    ["Lake Baikal", 53, 108],
    ["Lake Ladoga", 61, 31],
  ])("%s is a lake, not land and not ocean", (_n, lat, lon) => {
    const t = tileAt(lat, lon);
    expect(isLand(t)).toBe(false);
    expect(isOcean(t)).toBe(false);
    expect(raster[t]).toBe(0);
  });

  test("the lake shores still belong to countries", () => {
    expect(countryAt(46.5, -87.5).iso3).toBe("USA");
    expect(countryAt(0.35, 32.58).iso3).toBe("UGA");
  });

  test("every non-ocean water body is a lake of at least 200 tiles", () => {
    const seen = new Uint8Array(W * H);
    const sizes: number[] = [];
    for (let t = 0; t < seen.length; t++) {
      if (isLand(t) || isOcean(t) || seen[t] === 1) continue;
      const comp = waterComponent(t);
      let n = 0;
      for (let i = 0; i < comp.length; i++) {
        if (comp[i] === 1) {
          seen[i] = 1;
          n++;
        }
      }
      sizes.push(n);
    }
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(200);
    expect(sizes.length).toBe(30);
  });

  test("all seas and straits are 4-connected to the one world ocean", () => {
    const main = waterComponent(tileAt(30, -40));
    let ocean = 0;
    let reached = 0;
    for (let t = 0; t < main.length; t++) {
      if (isOcean(t)) ocean++;
      if (main[t] === 1) reached++;
    }
    expect(reached).toBe(ocean);
    for (const [name, lat, lon] of [
      ...seas,
      ["Baltic", 58, 19],
      ["Red Sea", 20, 38],
      ["Hudson Bay", 60, -85],
      ["Adriatic", 43, 15],
      ["Aegean", 38, 25],
      ["Sea of Azov", 46, 36],
    ] as [string, number, number][]) {
      expect(main[tileAt(lat, lon)], name).toBe(1);
    }
  });

  // [name, water point A, water point B, [lat0, lat1, lon0, lon1] window]
  // The window excludes detours, so the strait itself must be open.
  const straits: [string, number, number, number, number, number[]][] = [
    ["Dover", 50.3, 0.3, 51.8, 2.5, [49.8, 52.3, -1, 3.5]],
    ["Messina", 38.6, 15.0, 37.6, 15.9, [37.3, 39.0, 14.6, 16.4]],
    ["Bonifacio", 41.1, 7.6, 41.1, 10.6, [40.8, 41.9, 7.0, 10.8]],
    ["Bosphorus", 41.4, 29.6, 40.7, 28.6, [40.5, 41.8, 28.0, 30.0]],
    ["Dardanelles", 40.5, 27.3, 39.8, 25.5, [39.5, 40.9, 25.0, 28.0]],
    ["Oresund", 56.7, 12.2, 55.1, 13.1, [54.8, 57.0, 12.0, 13.8]],
    ["Great Belt", 56.0, 10.9, 54.9, 10.9, [54.7, 56.3, 10.7, 11.1]],
    ["Gibraltar", 36.0, -7.0, 36.0, -3.0, [35.5, 36.3, -7.5, -2.5]],
    ["Kerch", 45.7, 36.3, 44.5, 34.5, [44.2, 46.0, 34.0, 37.0]],
    ["Hormuz", 25.5, 57.5, 27.0, 52.0, [24.5, 28.0, 51.0, 58.5]],
    ["Bab el-Mandeb", 14.0, 43.0, 12.0, 44.5, [11.0, 15.0, 42.0, 46.0]],
    ["Malacca", 5.0, 98.0, 1.2, 104.2, [0.8, 6.0, 97.0, 105.0]],
    ["Bering", 66.5, -168.5, 64.5, -168.5, [63.0, 67.0, -174, -166]],
    ["Taiwan", 25.5, 120.3, 22.0, 119.5, [21.5, 26.0, 118.0, 122.0]],
    ["Korea", 34.0, 127.0, 33.5, 129.5, [33.0, 35.5, 126.0, 131.0]],
    ["Tsushima", 34.7, 129.0, 34.7, 130.0, [34.0, 35.6, 128.5, 130.3]],
    ["Lombok", -8.0, 115.5, -9.5, 115.5, [-9.8, -7.5, 114.5, 117.0]],
    ["Sunda", -5.5, 105.9, -6.5, 105.3, [-7.2, -5.0, 104.5, 107.0]],
    ["Fehmarn", 54.6, 11.0, 54.4, 11.3, [54.2, 54.9, 10.5, 11.8]],
    ["Suez Canal", 31.7, 32.3, 29.7, 32.6, [29.5, 31.8, 32.0, 32.9]],
    ["Panama Canal", 9.7, -79.9, 8.5, -79.5, [8.3, 9.9, -80.2, -79.2]],
  ];

  test.each(straits)(
    "%s strait is open water",
    (_n, latA, lonA, latB, lonB, win) => {
      const [lat0, lat1, lon0, lon1] = win;
      const topLeft = tileAt(lat1, lon0);
      const bottomRight = tileAt(lat0, lon1);
      const a = tileAt(latA, lonA);
      const b = tileAt(latB, lonB);
      expect(isLand(a)).toBe(false);
      expect(isLand(b)).toBe(false);
      const comp = waterComponent(a, [
        Math.floor(topLeft / W),
        Math.floor(bottomRight / W),
        topLeft % W,
        bottomRight % W,
      ]);
      expect(comp[b]).toBe(1);
    },
  );

  test.each([
    ["Port Said", 31.27, 32.31],
    ["Ismailia", 30.59, 32.27],
    ["Suez", 29.95, 32.55],
    ["Colon", 9.36, -79.9],
    ["Balboa", 8.95, -79.57],
  ])("the canal at %s is ocean water with no country", (_n, lat, lon) => {
    const t = tileAt(lat, lon);
    expect(isLand(t)).toBe(false);
    expect(isOcean(t)).toBe(true);
    expect(raster[t]).toBe(0);
    expect(waterComponent(t)[tileAt(30, -40)]).toBe(1);
  });

  test.each([
    ["Alexandria", 31.2, 29.92, "EGY"],
    ["Sinai", 29.5, 33.9, "EGY"],
    ["Cairo", 30.044, 31.236, "EGY"],
    ["David", 8.43, -82.43, "PAN"],
    ["Santiago", 8.1, -80.98, "PAN"],
    ["Darien", 8.0, -77.8, "PAN"],
  ])("%s stays land of its country beside the canals", (_n, lat, lon, iso) => {
    expect(isLand(tileAt(lat, lon))).toBe(true);
    expect(countryAt(lat, lon).iso3).toBe(iso);
  });

  test("Germany is at least 4.5x its World map size and close to its real area", () => {
    const old = WORLD_COUNTRIES.find((c) => c.iso3 === "DEU")!;
    const germany = REAL_WORLD_COUNTRIES.find((c) => c.iso3 === "DEU")!;
    expect(germany.tiles).toBeGreaterThanOrEqual(4.5 * old.tiles);
    let area = 0;
    for (let t = 0; t < raster.length; t++) {
      if (raster[t] === germany.index) area += tileAreaKm2(Math.floor(t / W));
    }
    expect(area).toBeGreaterThan(357_000 * 0.9);
    expect(area).toBeLessThan(357_000 * 1.1);
  });

  test("small states exist where the grid can resolve them", () => {
    const tiles = (iso: string) =>
      REAL_WORLD_COUNTRIES.find((c) => c.iso3 === iso)?.tiles ?? 0;
    expect(tiles("LUX")).toBeGreaterThan(40);
    expect(tiles("BEL")).toBeGreaterThan(500);
    expect(tiles("MCO")).toBeGreaterThanOrEqual(1);
  });

  test("terrain class mix per continent stays close to the World map", () => {
    const worldTerrain = fs.readFileSync(
      path.join(ROOT, "resources/maps/world/map.bin"),
    );
    const oldRaster = decodeWorldCountryRaster();
    const oldBy = new Map<string, number[]>();
    for (let t = 0; t < oldRaster.length; t++) {
      if (oldRaster[t] === 0) continue;
      const c = WORLD_COUNTRIES[oldRaster[t] - 1].continent;
      let list = oldBy.get(c);
      if (list === undefined) oldBy.set(c, (list = []));
      list.push(worldTerrain[t] & 31);
    }
    const newBy = new Map<string, number[]>();
    for (let t = 0; t < raster.length; t++) {
      if (raster[t] === 0) continue;
      const c = REAL_WORLD_COUNTRIES[raster[t] - 1].continent;
      let list = newBy.get(c);
      if (list === undefined) newBy.set(c, (list = []));
      list.push(magnitude(t));
    }
    for (const [continent, mags] of newBy) {
      if (continent === "Seven seas (open ocean)") continue;
      const a = classMix(oldBy.get(continent)!);
      const b = classMix(mags);
      for (let k = 0; k < 3; k++) {
        expect(
          Math.abs(a[k] - b[k]),
          `${continent} class ${k}: old ${a[k].toFixed(1)} new ${b[k].toFixed(1)}`,
        ).toBeLessThan(15);
      }
    }
  });
});

describe("Realistic World game setup", () => {
  test("a game on the map starts", async () => {
    const start = performance.now();
    const game = await setup("../../../resources/maps/realisticworld");
    const ms = performance.now() - start;
    console.log(`Realistic World setup: ${ms.toFixed(0)} ms`);
    expect(game.width()).toBe(W);
    expect(game.height()).toBe(H);
    expect(game.numLandTiles()).toBe(manifest.map.num_land_tiles);
  }, 120_000);
});
