import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { GameUpdateViewData } from "@openfront/engine-api/game/GameUpdates";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { readVersioned } from "@openfront/engine-lib/snapshot/SnapshotType";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { RealBordersStartExecution } from "@openfront/engine/execution/RealBordersStartExecution";
import { Execution, Game, Player, Unit } from "@openfront/engine/game/Game";
import { GameImpl } from "@openfront/engine/game/GameImpl";
import {
  UnitImpl,
  UnitSnapshot,
  UnitState,
} from "@openfront/engine/game/UnitImpl";
import { GameRunner } from "@openfront/engine/GameRunner";
import { SnapshotWriter } from "@openfront/engine/snapshot/SnapshotContext";
import { beforeAll, describe, expect, test } from "vitest";
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

const PRICED_TYPES = [UnitType.City, UnitType.Port, UnitType.Factory];

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

function startExecution(game: Game): RealBordersStartExecution | undefined {
  return (game as unknown as { executions(): Execution[] })
    .executions()
    .find(
      (e): e is RealBordersStartExecution =>
        e instanceof RealBordersStartExecution,
    );
}

function livingCountry(game: Game, name: string): Player {
  const player = game
    .allPlayers()
    .find((p) => p.isAlive() && p.realismKey() === name);
  if (player === undefined) throw new Error(`no living country ${name}`);
  return player;
}

function priceOf(game: Game, player: Player, type: UnitType): bigint {
  return game.unitInfo(type).cost(game, player);
}

function seededUnits(game: Game): Unit[] {
  return game
    .allPlayers()
    .flatMap((p) => p.units())
    .filter((u) => u.isSeeded());
}

// Starts the real-borders game with the start batches run, pricing each
// country's structures just before any starting structure is placed.
async function startedGame(): Promise<{
  game: Game;
  baseline: Map<string, bigint[]>;
}> {
  const { game, runner } = await realBordersGame();
  tick(runner, game, 2);
  game.endSpawnPhase();
  const baseline = new Map<string, bigint[]>();
  for (const name of COUNTRIES) {
    const player = livingCountry(game, name);
    baseline.set(
      name,
      PRICED_TYPES.map((type) => priceOf(game, player, type)),
    );
  }
  if (startExecution(game) === undefined) {
    throw new Error("start execution missing");
  }
  while (startExecution(game) !== undefined) {
    tick(runner, game);
  }
  return { game, baseline };
}

describe("real borders structure prices", { timeout: 1_200_000 }, () => {
  let game: Game;
  let baseline: Map<string, bigint[]>;

  beforeAll(async () => {
    ({ game, baseline } = await startedGame());
  }, 1_200_000);

  test("starting structures leave the first organic price at the no-seed base", () => {
    expect(seededUnits(game).length).toBeGreaterThan(0);
    let checked = 0;
    for (const name of COUNTRIES) {
      const player = livingCountry(game, name);
      // Nations build during the start batches, and Port and Factory share one
      // price, so only a country with no organic build of these types is at
      // the no-seed base.
      if (PRICED_TYPES.some((type) => player.unitsConstructed(type) > 0)) {
        continue;
      }
      checked++;
      PRICED_TYPES.forEach((type, i) => {
        expect(priceOf(game, player, type), `${name} ${type}`).toBe(
          baseline.get(name)![i],
        );
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("losing an organic city restores the price of one organic city", () => {
    const player = livingCountry(game, "Germany");
    expect(player.units(UnitType.City).some((u) => u.isSeeded())).toBe(true);
    player.addGold(10_000_000_000n);
    const tiles = Array.from(player.tiles()).filter((t) => game.isLand(t));

    player.buildUnit(UnitType.City, tiles[0], {});
    const oneBuilt = priceOf(game, player, UnitType.City);
    const second = player.buildUnit(UnitType.City, tiles[1], {});
    expect(priceOf(game, player, UnitType.City)).toBeGreaterThan(oneBuilt);

    second.delete(false);
    expect(priceOf(game, player, UnitType.City)).toBe(oneBuilt);
  });

  test("a seeded structure conquered by another player does not raise its price", () => {
    const conqueror = livingCountry(game, "France");
    const victim = livingCountry(game, "Germany");
    conqueror.addGold(10_000_000_000n);
    const tiles = Array.from(conqueror.tiles()).filter((t) => game.isLand(t));

    conqueror.buildUnit(UnitType.City, tiles[0], {});
    const oneBuilt = priceOf(game, conqueror, UnitType.City);
    const second = conqueror.buildUnit(UnitType.City, tiles[1], {});
    second.delete(false);
    expect(priceOf(game, conqueror, UnitType.City)).toBe(oneBuilt);

    const seeded = victim.units(UnitType.City).find((u) => u.isSeeded());
    expect(seeded).toBeDefined();
    seeded!.setOwner(conqueror);

    expect(seeded!.isSeeded()).toBe(true);
    expect(priceOf(game, conqueror, UnitType.City)).toBe(oneBuilt);
  });

  test("snapshot round trip keeps the seeded flag", async () => {
    const restored = await expectSnapshotRoundTrip(game, MAP_NAME, 5);
    const seededIds = (g: Game) =>
      seededUnits(g)
        .map((u) => u.id())
        .sort((a, b) => a - b);
    expect(seededIds(restored).length).toBeGreaterThan(0);
    expect(seededIds(restored)).toEqual(seededIds(game));
  }, 1_200_000);

  test("a unit snapshot from before the seeded flag migrates to unseeded", () => {
    const unit = seededUnits(game)[0] as UnitImpl;
    const state: UnitState = unit.snapshot(
      new SnapshotWriter(game as GameImpl),
    );
    expect(state.seeded).toBe(true);
    expect(readVersioned(UnitSnapshot, { v: 2, d: state }).seeded).toBe(true);

    const v1: Partial<UnitState> = { ...state };
    delete v1.seeded;
    expect(readVersioned(UnitSnapshot, { v: 1, d: v1 }).seeded).toBe(false);
  });
});
