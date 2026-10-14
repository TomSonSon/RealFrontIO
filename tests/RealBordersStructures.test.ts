import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { GameUpdateViewData } from "@openfront/engine-api/game/GameUpdates";
import {
  roster,
  rosterNameOf,
} from "@openfront/engine-api/resources/RealismCountries";
import {
  REALISM_STRUCTURES,
  RealismStructure,
} from "@openfront/engine-api/resources/RealismStructures";
import { CityExecution } from "@openfront/engine/execution/CityExecution";
import { DefensePostExecution } from "@openfront/engine/execution/DefensePostExecution";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { FactoryExecution } from "@openfront/engine/execution/FactoryExecution";
import { MissileSiloExecution } from "@openfront/engine/execution/MissileSiloExecution";
import { PortExecution } from "@openfront/engine/execution/PortExecution";
import { RealBordersStartExecution } from "@openfront/engine/execution/RealBordersStartExecution";
import { SAMLauncherExecution } from "@openfront/engine/execution/SAMLauncherExecution";
import { Execution, Game, Player, Unit } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { expectSnapshotRoundTrip } from "./util/Snapshot";

const MAP_NAME = "../../../resources/maps/realisticworld";

const REAL_BORDERS = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};

const COUNTRIES = [
  "Germany",
  "France",
  "United States",
  "China",
  "Luxembourg",
  "Poland",
  "Egypt",
  "Russia",
  "India",
  "Japan",
  "United Kingdom",
  "Israel",
  "Pakistan",
  "North Korea",
  "Iran",
  "Ukraine",
  "Brazil",
  "Australia",
  "Canada",
  "Italy",
];

const KIND_TYPES = {
  city: UnitType.City,
  port: UnitType.Port,
  factory: UnitType.Factory,
  silo: UnitType.MissileSilo,
  sam: UnitType.SAMLauncher,
  post: UnitType.DefensePost,
} as const;

// Mirrors the real-borders branch of createNationsForGame.
function countryNations(): Nation[] {
  return roster().map(
    (c) =>
      new Nation(
        new Cell(c.anchor[0], c.anchor[1]),
        new PlayerInfo(
          c.name,
          PlayerType.Nation,
          null,
          c.name,
          false,
          null,
          [],
          null,
          c.flag || null,
        ),
      ),
  );
}

async function realBordersGame(): Promise<{
  game: Game;
  runner: GameRunner;
  updates: GameUpdateViewData[];
}> {
  const game = await setup(
    MAP_NAME,
    REAL_BORDERS,
    [new PlayerInfo("me", PlayerType.Human, "me_client", "me")],
    undefined,
    undefined,
    false,
    countryNations(),
  );
  const updates: GameUpdateViewData[] = [];
  const runner = new GameRunner(
    game,
    new Executor(game, "real_borders", "me_client"),
    (gu) => {
      if (!("errMsg" in gu)) updates.push(gu);
    },
  );
  runner.init();
  return { game, runner, updates };
}

function tick(runner: GameRunner, game: Game, ticks = 1): void {
  for (let i = 0; i < ticks; i++) {
    runner.addTurn({ turnNumber: game.ticks(), intents: [] });
    runner.executeNextTick();
  }
}

function executionsOf(game: Game): Execution[] {
  return (game as unknown as { executions(): Execution[] }).executions();
}

function startExecution(game: Game): RealBordersStartExecution | undefined {
  return executionsOf(game).find(
    (e): e is RealBordersStartExecution =>
      e instanceof RealBordersStartExecution,
  );
}

function hashOf(game: Game): number {
  return (game as unknown as { hash(): number }).hash();
}

// Structures by roster country name, from the generated data.
function structuresByCountry(): Map<string, RealismStructure[]> {
  const out = new Map<string, RealismStructure[]>();
  for (const s of REALISM_STRUCTURES) {
    const name = rosterNameOf(s.country);
    if (name === undefined) continue;
    const list = out.get(name) ?? [];
    list.push(s);
    out.set(name, list);
  }
  return out;
}

function countsOf(structures: readonly RealismStructure[]) {
  const out: Partial<Record<RealismStructure["kind"], number>> = {};
  for (const s of structures) out[s.kind] = (out[s.kind] ?? 0) + 1;
  return out;
}

// Expected units per kind: the data, plus the anchor city for a country with no capital.
function expectedCountsOf(
  name: string,
  byCountry: Map<string, RealismStructure[]>,
) {
  const list = byCountry.get(name) ?? [];
  const out = countsOf(list);
  if (!list.some((s) => s.capital === true)) out.city = (out.city ?? 0) + 1;
  return out;
}

// A nation AI may already have a structure under construction by the end of the start.
function finished(player: Player, type: UnitType): Unit[] {
  return player.units(type).filter((u) => !u.isUnderConstruction());
}

function livingCountry(game: Game, name: string): Player {
  const player = game
    .allPlayers()
    .find((p) => p.isAlive() && p.realismKey() === name);
  if (player === undefined) throw new Error(`no living country ${name}`);
  return player;
}

/**
 * Runs the spawn phase and the start, batches included. Returns the start
 * execution (its counters survive it) and the wall time of each start tick.
 */
function playStart(
  game: Game,
  runner: GameRunner,
): { exec: RealBordersStartExecution; tickMs: number[] } {
  tick(runner, game, 2);
  game.endSpawnPhase();
  const exec = startExecution(game);
  if (exec === undefined) throw new Error("start execution missing");
  const tickMs: number[] = [];
  while (startExecution(game) !== undefined) {
    const t0 = performance.now();
    tick(runner, game);
    tickMs.push(performance.now() - t0);
  }
  return { exec, tickMs };
}

function placedCount(exec: RealBordersStartExecution): number {
  return (exec as unknown as { placed: number }).placed;
}

function skippedCount(exec: RealBordersStartExecution): number {
  return (exec as unknown as { skipped: number }).skipped;
}

describe("real borders: starting structures", () => {
  test("every listed country owns exactly its real-world structures", async () => {
    const { game, runner } = await realBordersGame();
    const { exec, tickMs } = playStart(game, runner);
    const byCountry = structuresByCountry();
    for (const name of COUNTRIES) {
      const player = livingCountry(game, name);
      const expected = expectedCountsOf(name, byCountry);
      for (const [kind, type] of Object.entries(KIND_TYPES)) {
        expect(finished(player, type).length, `${name} ${kind}`).toBe(
          expected[kind as RealismStructure["kind"]] ?? 0,
        );
      }
    }
    expect(placedCount(exec) + skippedCount(exec)).toBe(
      REALISM_STRUCTURES.length,
    );
    // The rail work of a batch used to take half a minute on one tick.
    expect(Math.max(...tickMs)).toBeLessThan(10_000);
    const after: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      tick(runner, game);
      after.push(performance.now() - t0);
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(
      `starting structures: placed ${placedCount(exec)}, skipped ${skippedCount(exec)}\n` +
        `start-phase ticks (ms): ${tickMs.map((m) => m.toFixed(0)).join(", ")}\n` +
        `next 50 ticks: avg ${avg(after).toFixed(0)} ms, max ${Math.max(...after).toFixed(0)} ms`,
    );
  }, 600_000);

  test("capitals stand on the capital tile, ports touch the ocean, silos belong to nuclear states", async () => {
    const { game, runner } = await realBordersGame();
    playStart(game, runner);
    const byCountry = structuresByCountry();

    for (const s of REALISM_STRUCTURES) {
      const name = rosterNameOf(s.country);
      if (name === undefined) {
        expect(game.hasOwner(game.ref(s.x, s.y)), s.name).toBe(false);
        continue;
      }
      if (s.capital !== true) continue;
      const player = livingCountry(game, name);
      const tile = game.ref(s.x, s.y);
      expect(
        player.units(UnitType.City).some((u) => u.tile() === tile),
        `${name} capital ${s.name}`,
      ).toBe(true);
    }

    for (const player of game.allPlayers()) {
      if (!player.isAlive() || player.type() === PlayerType.Bot) continue;
      for (const port of player.units(UnitType.Port)) {
        expect(game.isShore(port.tile())).toBe(true);
      }
      if (player.units(UnitType.MissileSilo).length > 0) {
        const hasSilo = (byCountry.get(player.realismKey()) ?? []).some(
          (s) => s.kind === "silo",
        );
        expect(hasSilo, player.realismKey()).toBe(true);
      }
    }
  }, 600_000);

  test("placement is free and leaves later build prices unchanged", async () => {
    const { game, runner } = await realBordersGame();
    playStart(game, runner);

    const byCountry = structuresByCountry();
    for (const name of COUNTRIES) {
      const player = livingCountry(game, name);
      expect(finished(player, UnitType.City).length, `${name} cities`).toBe(
        expectedCountsOf(name, byCountry).city ?? 0,
      );
      for (const type of Object.values(KIND_TYPES)) {
        // Not a purchase: only a nation's own build in progress counts as constructed.
        const building = player
          .units(type)
          .filter((u) => u.isUnderConstruction()).length;
        expect(player.unitsConstructed(type), `${name} ${type}`).toBe(building);
      }
    }
  }, 600_000);

  test("a starting unit costs no gold and leaves the build price unchanged", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game);
    const player = livingCountry(game, "Germany");
    const cityCost = game.unitInfo(UnitType.City).cost(game, player);
    const gold = player.gold();
    const tile = Array.from(player.tiles()).find((t) => game.isLand(t))!;

    player.buildStartingUnit(UnitType.City, tile);

    expect(player.gold()).toBe(gold);
    expect(player.unitsConstructed(UnitType.City)).toBe(0);
    expect(game.unitInfo(UnitType.City).cost(game, player)).toBe(cityCost);
  });

  test("each seeded structure runs its type-specific execution", async () => {
    const { game, runner } = await realBordersGame();
    playStart(game, runner);
    const executing = (
      ctor: abstract new (...args: never[]) => Execution,
      prop: string,
    ) =>
      new Set(
        executionsOf(game)
          .filter((e) => e instanceof ctor)
          .map((e) => (e as unknown as Record<string, Unit>)[prop].id()),
      );
    const checks: [UnitType, Set<number>][] = [
      [UnitType.City, executing(CityExecution, "city")],
      [UnitType.Port, executing(PortExecution, "port")],
      [UnitType.Factory, executing(FactoryExecution, "factory")],
      [UnitType.MissileSilo, executing(MissileSiloExecution, "silo")],
      [UnitType.SAMLauncher, executing(SAMLauncherExecution, "sam")],
      [UnitType.DefensePost, executing(DefensePostExecution, "post")],
    ];
    for (const [type, ids] of checks) {
      for (const unit of game.units(type)) {
        if (unit.isUnderConstruction()) continue;
        expect(ids.has(unit.id()), `${type} ${unit.id()}`).toBe(true);
      }
    }
    expect(game.units(UnitType.Port).length).toBeGreaterThan(0);
  }, 600_000);

  test("round-trips in the middle of the batches", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 3);
    const exec = startExecution(game);
    expect(exec).toBeDefined();
    expect(placedCount(exec!)).toBeGreaterThan(0);
    await expectSnapshotRoundTrip(game, MAP_NAME, 5);
  }, 600_000);

  test("two identical runs have equal hashes every 25 ticks", async () => {
    async function hashes(): Promise<number[]> {
      const { game, runner } = await realBordersGame();
      const out: number[] = [];
      for (let t = 1; t <= 200; t++) {
        if (t === 10) game.endSpawnPhase();
        tick(runner, game);
        if (t % 25 === 0) out.push(hashOf(game));
      }
      return out;
    }
    expect(await hashes()).toEqual(await hashes());
  }, 900_000);
});
