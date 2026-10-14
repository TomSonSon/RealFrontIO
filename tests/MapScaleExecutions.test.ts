import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerInfo,
  PlayerType,
  Tick,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { EngineConfig } from "@openfront/engine/configuration/EngineConfig";
import { focusBudgetWeight } from "@openfront/engine/execution/AttackExecution";
import { MirvExecution } from "@openfront/engine/execution/MIRVExecution";
import { NukeExecution } from "@openfront/engine/execution/NukeExecution";
import { SAMTargetingSystem } from "@openfront/engine/execution/SAMLauncherExecution";
import { TrainExecution } from "@openfront/engine/execution/TrainExecution";
import { Game, Player, Unit } from "@openfront/engine/game/Game";
import { RailNetwork } from "@openfront/engine/game/RailNetwork";
import { TrainStation } from "@openfront/engine/game/TrainStation";
import { getParabolaControlPoints } from "@openfront/engine/pathfinding/PathFinder.Parabola";
import { describe, expect, test, vi } from "vitest";
import { setup } from "./util/Setup";
import { constructionExecution } from "./util/utils";

// MIRV.init only reads the owner id (for its random seed).
const FAKE_PLAYER = { id: () => 1 } as unknown as Player;

const REAL: Partial<GameConfig> = {
  gameMap: GameMapType.RealisticWorld,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  publicGameModifiers: { isRealisticWorld: true },
};

const CLASSIC: Partial<GameConfig> = { gameMap: GameMapType.World };

function engineConfig(overrides: Partial<GameConfig>): EngineConfig {
  return new EngineConfig(
    {
      gameMap: GameMapType.World,
      gameMapSize: GameMapSize.Normal,
      gameMode: GameMode.FFA,
      gameType: GameType.Singleplayer,
      difficulty: Difficulty.Medium,
      nations: "default",
      donateGold: false,
      donateTroops: false,
      bots: 0,
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      randomSpawn: false,
      ...overrides,
    },
    false,
  );
}

async function bigPlains(overrides: Partial<GameConfig>): Promise<Game> {
  return setup("big_plains", overrides, [], undefined, EngineConfig);
}

// Spawn immunity blocks nukes near spawns; the blast test needs them unblocked.
class NoImmunityConfig extends EngineConfig {
  spawnImmunityDuration(): Tick {
    return 0;
  }
}

describe("map scale: config values", () => {
  // [name, getter, classic value, real borders value]
  const rows: [string, (c: EngineConfig) => number, number, number][] = [
    ["focusRadius", (c) => c.focusRadius(), 40, 100],
    ["trainSpeed", (c) => c.trainSpeed(), 2, 5],
    ["mirvRange", (c) => c.mirvRange(), 1500, 3750],
    ["mirvMinimumSpread", (c) => c.mirvMinimumSpread(), 55, 137.5],
    ["mirvSeparationHeight", (c) => c.mirvSeparationHeight(), 500, 1250],
    [
      "mirvSeparationHeightOffset",
      (c) => c.mirvSeparationHeightOffset(),
      50,
      125,
    ],
    ["parabolaMinHeight", (c) => c.parabolaMinHeight(), 50, 125],
    ["structureMinDist", (c) => c.structureMinDist(), 15, 37.5],
    ["warshipTargettingRange", (c) => c.warshipTargettingRange(), 130, 325],
    ["samDistanceScale", (c) => c.samDistanceScale(), 1, 2.5],
    ["mapAreaScale", (c) => c.mapAreaScale(), 1, 6.25],
  ];
  const classic = engineConfig({});
  const real = engineConfig(REAL);

  for (const [name, get, classicValue, realValue] of rows) {
    test(`${name} is ${classicValue} classic and ${realValue} real borders`, () => {
      expect(get(classic)).toBe(classicValue);
      expect(get(real)).toBe(realValue);
    });
  }
});

describe("focused attack radius", () => {
  test("budget weight is cheap within the scaled focus radius", () => {
    const real = engineConfig(REAL).focusRadius();
    expect(focusBudgetWeight(100, real)).toBe(0.5);
    expect(focusBudgetWeight(150, real)).toBe(0.75);
    expect(focusBudgetWeight(200, real)).toBe(1);
    // Classic keeps the old 40-tile radius.
    expect(focusBudgetWeight(40, 40)).toBe(0.5);
    expect(focusBudgetWeight(80, 40)).toBe(1);
  });
});

describe("parabola minimum height", () => {
  test("short arcs use the configured minimum height", async () => {
    const from = (game: Game) => game.ref(100, 100);
    const to = (game: Game) => game.ref(104, 100);

    const classicGame = await bigPlains(CLASSIC);
    const classicPoints = getParabolaControlPoints(
      classicGame.map(),
      from(classicGame),
      to(classicGame),
      { ignoreMapBounds: true, minHeight: 50 },
    );
    expect(classicPoints[1].y).toBe(100 - 50);

    const realGame = await bigPlains(REAL);
    const realPoints = getParabolaControlPoints(
      realGame.map(),
      from(realGame),
      to(realGame),
      { ignoreMapBounds: true, minHeight: 125 },
    );
    expect(realPoints[1].y).toBe(100 - 125);
  });
});

describe("MIRV scaling", () => {
  test("range and minimum spread follow mapScale", async () => {
    const realGame = await bigPlains(REAL);
    const real = new MirvExecution(FAKE_PLAYER, 0 as TileRef);
    real.init(realGame, 0);
    expect(real).toMatchObject({ range: 3750, minimumSpread: 137.5 });

    const classicGame = await bigPlains(CLASSIC);
    const classic = new MirvExecution(FAKE_PLAYER, 0 as TileRef);
    classic.init(classicGame, 0);
    expect(classic).toMatchObject({ range: 1500, minimumSpread: 55 });
  });

  test("scatter targets keep the scaled minimum spread", async () => {
    type Overlap = {
      isOverlapping(x: number, y: number, taken: TileRef[]): boolean;
    };

    const realGame = await bigPlains(REAL);
    const real = new MirvExecution(FAKE_PLAYER, 0 as TileRef);
    real.init(realGame, 0);
    // Manhattan distance 100: inside 137.5 (real borders), outside 55 (classic).
    const taken = [realGame.ref(60, 100)];
    expect((real as unknown as Overlap).isOverlapping(160, 100, taken)).toBe(
      true,
    );

    const classicGame = await bigPlains(CLASSIC);
    const classic = new MirvExecution(FAKE_PLAYER, 0 as TileRef);
    classic.init(classicGame, 0);
    expect(
      (classic as unknown as Overlap).isOverlapping(160, 100, [
        classicGame.ref(60, 100),
      ]),
    ).toBe(false);
  });
});

describe("train speed", () => {
  test("trains move at the configured speed", async () => {
    // findStationsPath returning null makes init return before any rail work.
    const rail = { findStationsPath: () => null } as unknown as RailNetwork;
    const build = (game: Game) => {
      const train = new TrainExecution(
        rail,
        null as unknown as Player,
        {} as TrainStation,
        {} as TrainStation,
        1,
      );
      train.init(game, 0);
      return (train as unknown as { speed: number }).speed;
    };

    expect(build(await bigPlains(REAL))).toBe(5);
    expect(build(await bigPlains(CLASSIC))).toBe(2);
  });
});

describe("SAM target scoring", () => {
  test("distance ordering holds at 250-500 tiles in real borders", async () => {
    const game = await setup("world", REAL, [], undefined, EngineConfig);
    const samTile = game.ref(1000, 500);
    const sam = { tile: () => samTile } as unknown as Unit;
    const system = new SAMTargetingSystem(game, sam);

    const scoreAt = (distance: number): number => {
      const targetTile = game.ref(1000 + distance, 500);
      const trajectory = Array.from({ length: 10 }, () => ({
        tile: targetTile,
      }));
      const unit = {
        trajectory: () => trajectory,
        trajectoryIndex: () => 0,
        targetTile: () => targetTile,
        type: () => UnitType.AtomBomb,
      } as unknown as Unit;
      return (
        system as unknown as {
          computeTargetScore(t: { unit: Unit; tile: TileRef }): number;
        }
      ).computeTargetScore({ unit, tile: targetTile });
    };

    const near = scoreAt(250);
    const mid = scoreAt(400);
    const far = scoreAt(500);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    // 250 real-borders tiles score exactly like 100 classic tiles
    // (distance bonus 100,000 plus urgency 9,000 for 10 ticks left).
    expect(near).toBe(109_000);
  });
});

describe("structure spawn search radius", () => {
  async function searchRadiusFor(overrides: Partial<GameConfig>) {
    const game = await bigPlains(overrides);
    game.addPlayer(
      new PlayerInfo("owner_id", PlayerType.Human, null, "owner_id"),
    );
    const owner = game.player("owner_id");
    const tile = game.ref(100, 100);
    owner.conquer(tile);
    const spy = vi.spyOn(game, "nearbyUnits");
    (
      owner as unknown as {
        validStructureSpawnTiles(t: TileRef): TileRef[];
      }
    ).validStructureSpawnTiles(tile);
    // validStructureSpawnTiles searches at twice the structure min distance.
    return {
      radius: spy.mock.calls[0][1],
      minDist: game.config().structureMinDist(),
    };
  }

  test("search range is twice structureMinDist", async () => {
    const real = await searchRadiusFor(REAL);
    expect(real.minDist).toBe(37.5);
    expect(real.radius).toBe(75);

    const classic = await searchRadiusFor(CLASSIC);
    expect(classic.minDist).toBe(15);
    expect(classic.radius).toBe(30);
  });
});

describe("nuke blast area", () => {
  // Counts the tiles an atom bomb relinquishes on a fully owned victim area.
  async function blastTiles(overrides: Partial<GameConfig>): Promise<number> {
    const game = await setup(
      "big_plains",
      { ...overrides, infiniteGold: true, instantBuild: true },
      [],
      undefined,
      NoImmunityConfig,
    );
    game.addPlayer(
      new PlayerInfo("attacker_id", PlayerType.Human, null, "attacker_id"),
    );
    game.addPlayer(
      new PlayerInfo("victim_id", PlayerType.Human, null, "victim_id"),
    );
    const attacker = game.player("attacker_id");
    const victim = game.player("victim_id");

    // Real-borders spawns don't claim territory here, so the attacker gets a
    // small block directly: a live player that can host the silo.
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) attacker.conquer(game.ref(x, y));
    }
    constructionExecution(game, attacker, 1, 1, UnitType.MissileSilo);

    const center = game.ref(100, 100);
    for (let y = 20; y <= 180; y++) {
      for (let x = 20; x <= 180; x++) {
        const t = game.ref(x, y);
        if (game.isLand(t) && !game.hasOwner(t)) victim.conquer(t);
      }
    }

    const before = victim.numTilesOwned();
    const nuke = new NukeExecution(UnitType.AtomBomb, attacker, center, null);
    game.addExecution(nuke);
    for (let i = 0; i < 400 && nuke.isActive(); i++) {
      game.executeNextTick();
    }
    expect(nuke.isActive()).toBe(false);
    return before - victim.numTilesOwned();
  }

  test("destroys about 6.25x more tiles in real borders", async () => {
    const classic = await blastTiles(CLASSIC);
    const real = await blastTiles(REAL);
    expect(classic).toBeGreaterThan(0);
    const ratio = real / classic;
    expect(ratio).toBeGreaterThan(6.25 * 0.85);
    expect(ratio).toBeLessThan(6.25 * 1.15);
  });
});
