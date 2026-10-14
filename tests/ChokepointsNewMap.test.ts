import {
  GameMapSize,
  GameMapType,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import {
  CHOKEPOINTS,
  chokepointsFor,
  GeoBox,
  geoBoxToPixels,
  getChokepoint,
  PixelBox,
  REALISTIC_MAP_HEIGHT,
  REALISTIC_MAP_WIDTH,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from "@openfront/engine-api/resources/Chokepoints";
import { TradeShipExecution } from "@openfront/engine/execution/TradeShipExecution";
import type { Game } from "@openfront/engine/game/Game";
import {
  chokepointController,
  hasChokepointMap,
} from "@openfront/engine/realism/ChokepointToll";
import { beforeAll, describe, expect, it } from "vitest";
import { playerInfo, setup } from "./util/Setup";

/**
 * Straits on the Realistic World map (5000 x 2500). The 12.5M-tile map is
 * expensive to load, so each game is built once per describe block and the
 * tests here only read terrain or run a few tile-level checks.
 */

const REAL_MAP = "../../../resources/maps/realisticworld";
const REAL_CONFIG = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};
const TEST_TIMEOUT = 60_000;

/** Ocean tile nearest to a lon/lat point (searching outward in rings). */
function oceanNear(game: Game, lon: number, lat: number): number {
  const map = game.map();
  const p = geoBoxToPixels(
    { west: lon, east: lon, south: lat, north: lat },
    game.width(),
    game.height(),
  );
  for (let r = 0; r < 60; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = p.x0 + dx;
        const y = p.y0 + dy;
        if (!map.isValidCoord(x, y)) continue;
        const t = map.ref(x, y);
        if (map.isOcean(t)) return t;
      }
    }
  }
  throw new Error(`no ocean near ${lon},${lat}`);
}

/**
 * 4-connected shortest water path over ocean tiles (a proxy for a ship route;
 * the engine's WaterPathFinder is too heavy to run here). Tiles inside `avoid`
 * are treated as blocked. Returns null when `to` is unreachable.
 */
function waterRoute(
  game: Game,
  from: number,
  to: number,
  avoid?: PixelBox,
): number[] | null {
  const map = game.map();
  const w = game.width();
  const total = w * game.height();
  const prev = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  queue[tail++] = from;
  prev[from] = from;
  const blocked = (t: number) => {
    if (avoid === undefined) return false;
    const x = map.x(t);
    const y = map.y(t);
    return x >= avoid.x0 && x <= avoid.x1 && y >= avoid.y0 && y <= avoid.y1;
  };
  while (head < tail) {
    const t = queue[head++];
    if (t === to) break;
    const x = t % w;
    const y = (t / w) | 0;
    const next: number[] = [];
    if (x > 0) next.push(t - 1);
    if (x < w - 1) next.push(t + 1);
    if (y > 0) next.push(t - w);
    if (y < game.height() - 1) next.push(t + w);
    for (const n of next) {
      if (prev[n] !== -1 || !map.isOcean(n) || blocked(n)) continue;
      prev[n] = t;
      queue[tail++] = n;
    }
  }
  if (prev[to] === -1) return null;
  const path: number[] = [];
  for (let t = to; t !== from; t = prev[t]) path.push(t);
  path.push(from);
  return path;
}

function inBox(game: Game, t: number, box: PixelBox): boolean {
  const x = game.map().x(t);
  const y = game.map().y(t);
  return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
}

/** Ocean/land counts inside a pixel box. */
function boxStats(game: Game, box: PixelBox) {
  const map = game.map();
  let ocean = 0;
  let coast = 0;
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (!map.isValidCoord(x, y)) continue;
      const t = map.ref(x, y);
      if (!map.isOcean(t)) continue;
      ocean++;
      const nbuf = new Array<number>(8);
      const n = game.neighbors8(t, nbuf);
      for (let i = 0; i < n; i++) {
        if (map.isLand(nbuf[i])) {
          coast++;
          break;
        }
      }
    }
  }
  return { ocean, coast };
}

/** The straits' geographic boxes and the probe points on either side. */
type Probe = { a: [number, number]; b: [number, number] };
const PROBES: Record<string, Probe> = {
  hormuz: { a: [51.0, 26.8], b: [58.0, 24.5] },
  bab_el_mandeb: { a: [41.5, 15.0], b: [45.0, 12.0] },
  gibraltar: { a: [-7.0, 36.0], b: [-3.0, 36.5] },
  turkish_straits: { a: [34.0, 43.0], b: [25.5, 40.5] },
  danish_straits: { a: [19.0, 56.0], b: [6.5, 56.5] },
};

describe("Realistic World chokepoint boxes", () => {
  it("chokepointsFor returns the same 17 straits for the 5000 x 2500 map", () => {
    const zones = chokepointsFor(REALISTIC_MAP_WIDTH, REALISTIC_MAP_HEIGHT);
    expect(zones).not.toBeNull();
    expect(zones!.map((c) => c.id)).toEqual(CHOKEPOINTS.map((c) => c.id));
    expect(zones!.map((c) => c.name)).toEqual(CHOKEPOINTS.map((c) => c.name));
    expect(zones!.map((c) => c.tier)).toEqual(CHOKEPOINTS.map((c) => c.tier));
    // Ids, tiers and tolls stay identical; only the boxes move with the map.
    for (let i = 0; i < CHOKEPOINTS.length; i++) {
      expect(zones![i].suggestedTollPerShip).toBe(
        CHOKEPOINTS[i].suggestedTollPerShip,
      );
    }
  });

  it("keeps the Normal World boxes unchanged for 2000 x 1000", () => {
    expect(chokepointsFor(WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT)).toBe(CHOKEPOINTS);
    expect(chokepointsFor(1000, 500)).toBeNull();
    expect(chokepointsFor(500, 250)).toBeNull();
  });

  it("projects lat/lon boxes with the equirectangular formula", () => {
    const geo: GeoBox = { west: -180, south: -90, east: 180, north: 90 };
    expect(geoBoxToPixels(geo, 5000, 2500)).toEqual({
      x0: 0,
      y0: 0,
      x1: 4999,
      y1: 2499,
    });
    expect(
      geoBoxToPixels({ west: 0, south: 0, east: 0, north: 0 }, 5000, 2500),
    ).toEqual({ x0: 2500, y0: 1250, x1: 2500, y1: 1250 });
    const hormuz = getChokepoint("hormuz")!;
    const pixels = geoBoxToPixels(hormuz.geoBox, 5000, 2500);
    expect(pixels.x0).toBeLessThan(pixels.x1);
    expect(pixels.y0).toBeLessThan(pixels.y1);
  });

  describe("on the map", () => {
    let game: Game;
    beforeAll(async () => {
      game = await setup(REAL_MAP, REAL_CONFIG);
    }, TEST_TIMEOUT);

    it("is recognised as a chokepoint map", () => {
      expect(game.width()).toBe(REALISTIC_MAP_WIDTH);
      expect(game.height()).toBe(REALISTIC_MAP_HEIGHT);
      expect(hasChokepointMap(game)).toBe(true);
    });

    it.each(CHOKEPOINTS.map((c) => [c.id, c] as const))(
      "%s has ocean and a coast inside its box",
      (_id, cp) => {
        const zones = chokepointsFor(
          REALISTIC_MAP_WIDTH,
          REALISTIC_MAP_HEIGHT,
        )!;
        const box = zones.find((z) => z.id === cp.id)!.bbox;
        const { ocean, coast } = boxStats(game, box);
        expect(ocean).toBeGreaterThan(0);
        expect(coast).toBeGreaterThan(0);
      },
    );

    it.each(Object.entries(PROBES))(
      "a water route between the two sides of %s crosses its box",
      (id, probe) => {
        const zones = chokepointsFor(
          REALISTIC_MAP_WIDTH,
          REALISTIC_MAP_HEIGHT,
        )!;
        const box = zones.find((z) => z.id === id)!.bbox;
        const from = oceanNear(game, ...probe.a);
        const to = oceanNear(game, ...probe.b);
        const route = waterRoute(game, from, to);
        expect(route).not.toBeNull();
        expect(route!.some((t) => inBox(game, t, box))).toBe(true);
        // Suez links the Red Sea and the Mediterranean, so a detour around
        // Africa exists, but it is far longer than the strait.
        const around = waterRoute(game, from, to, box);
        if (around !== null)
          expect(around.length).toBeGreaterThan(3 * route!.length);
      },
      TEST_TIMEOUT,
    );

    it.each([
      ["suez", [32.3, 31.8], [33.0, 28.5]],
      ["panama", [-79.9, 10.3], [-79.5, 8.2]],
    ] as [string, [number, number], [number, number]][])(
      "ships pass the %s canal instead of going around the continent",
      (id, a, b) => {
        const box = chokepointsFor(
          REALISTIC_MAP_WIDTH,
          REALISTIC_MAP_HEIGHT,
        )!.find((z) => z.id === id)!.bbox;
        const from = oceanNear(game, ...a);
        const to = oceanNear(game, ...b);
        const canal = waterRoute(game, from, to);
        expect(canal).not.toBeNull();
        expect(canal!.some((t) => inBox(game, t, box))).toBe(true);
        // Without the box the only route goes around Africa or South America.
        const around = waterRoute(game, from, to, box);
        expect(around).not.toBeNull();
        expect(around!.length).toBeGreaterThan(20 * canal!.length);
      },
      TEST_TIMEOUT,
    );

    it.each(CHOKEPOINTS.map((c) => [c.id, c] as const))(
      "%s is controlled by a player owning its coast",
      (_id, cp) => {
        const zones = chokepointsFor(
          REALISTIC_MAP_WIDTH,
          REALISTIC_MAP_HEIGHT,
        )!;
        const box = zones.find((z) => z.id === cp.id)!.bbox;
        const zone = { ...cp, bbox: box };
        const map = game.map();
        const player = game.addPlayer(
          playerInfo(`owner-${cp.id}`, PlayerType.Human),
        );
        expect(chokepointController(game, zone)).toBeNull();
        let given = false;
        for (let y = box.y0; y <= box.y1 && !given; y++) {
          for (let x = box.x0; x <= box.x1 && !given; x++) {
            if (!map.isValidCoord(x, y)) continue;
            const t = map.ref(x, y);
            if (!map.isOcean(t)) continue;
            const nbuf = new Array<number>(8);
            const n = game.neighbors8(t, nbuf);
            for (let i = 0; i < n && !given; i++) {
              if (map.isLand(nbuf[i])) {
                player.conquer(nbuf[i]);
                given = true;
              }
            }
          }
        }
        expect(chokepointController(game, zone)).toBe(player);
      },
    );

    it("tolls a ship crossing Hormuz on the new map", () => {
      const owner = game.addPlayer(playerInfo("shipper", PlayerType.Human));
      const controller = game.addPlayer(
        playerInfo("controller", PlayerType.Human),
      );
      const zones = chokepointsFor(REALISTIC_MAP_WIDTH, REALISTIC_MAP_HEIGHT)!;
      const cp = zones.find((z) => z.id === "hormuz")!;
      const map = game.map();
      // Give the controller every coastal land tile of the box.
      for (let y = cp.bbox.y0; y <= cp.bbox.y1; y++) {
        for (let x = cp.bbox.x0; x <= cp.bbox.x1; x++) {
          if (!map.isValidCoord(x, y)) continue;
          const t = map.ref(x, y);
          if (!map.isOcean(t)) continue;
          const nbuf = new Array<number>(8);
          const n = game.neighbors8(t, nbuf);
          for (let i = 0; i < n; i++) {
            if (map.isLand(nbuf[i]) && map.ownerID(nbuf[i]) === 0) {
              controller.conquer(nbuf[i]);
            }
          }
        }
      }
      expect(chokepointController(game, cp)).toBe(controller);

      const exec = new TradeShipExecution(owner, {} as any, {} as any);
      exec.init(game, 0);
      (exec as any).tradeShip = { owner: () => owner };
      const water = oceanNear(game, 56.3, 26.6);
      (exec as any).applyChokepointTolls(water);
      (exec as any).applyChokepointTolls(water);
      expect((exec as any).chokepointsTolledThisVoyage).toEqual([
        { id: "hormuz", controller },
      ]);
    });
  });
});

describe("hasChokepointMap", () => {
  it("is false for a compact World map", async () => {
    const compact = await setup("big_plains", {
      gameMap: GameMapType.World,
      gameMapSize: GameMapSize.Compact,
      publicGameModifiers: { isRealisticWorld: true },
    });
    expect(compact.width()).not.toBe(WORLD_MAP_WIDTH);
    expect(hasChokepointMap(compact)).toBe(false);
  });

  it("is true for the Normal World map", async () => {
    const world = await setup("world", { gameMap: GameMapType.World });
    expect(world.width()).toBe(WORLD_MAP_WIDTH);
    expect(world.height()).toBe(WORLD_MAP_HEIGHT);
    expect(hasChokepointMap(world)).toBe(true);
  });
});
