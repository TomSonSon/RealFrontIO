import { GameMapType } from "@openfront/engine-api/game/GameTypes";
import {
  chokepointsFor,
  geoBoxToPixels,
  REALISTIC_MAP_HEIGHT,
  REALISTIC_MAP_WIDTH,
} from "@openfront/engine-api/resources/Chokepoints";
import type { Game } from "@openfront/engine/game/Game";
import { PathFinding } from "@openfront/engine/pathfinding/PathFinder";
import { beforeAll, describe, expect, it } from "vitest";
import { setup } from "./util/Setup";

const REAL_CONFIG = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};

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
        if (map.isValidCoord(x, y) && map.isOcean(map.ref(x, y))) {
          return map.ref(x, y);
        }
      }
    }
  }
  throw new Error(`no ocean near ${lon},${lat}`);
}

describe("canal pathing on the Realistic World map", () => {
  let game: Game;
  beforeAll(async () => {
    game = await setup("../../../resources/maps/realisticworld", {
      ...REAL_CONFIG,
      disableNavMesh: false,
    });
  }, 120_000);

  it.each([
    ["suez", [32.3, 31.8], [33.0, 28.5]],
    ["panama", [-79.9, 10.3], [-79.5, 8.2]],
  ] as [string, [number, number], [number, number]][])(
    "the water pathfinder sails through the %s canal",
    (id, a, b) => {
      const box = chokepointsFor(
        REALISTIC_MAP_WIDTH,
        REALISTIC_MAP_HEIGHT,
      )!.find((z) => z.id === id)!.bbox;
      const from = oceanNear(game, ...a);
      const to = oceanNear(game, ...b);
      const path = PathFinding.Water(game).findPath(from, to);
      expect(path).not.toBeNull();
      expect(
        path!.some((t) => {
          const x = game.x(t);
          const y = game.y(t);
          return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
        }),
      ).toBe(true);
      // Around the continent is thousands of tiles; the canal route is short.
      expect(path!.length).toBeLessThan(400);
    },
    120_000,
  );
});
