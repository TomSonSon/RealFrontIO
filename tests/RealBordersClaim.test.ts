import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import {
  countryIndexRemap,
  roster,
  rosterNameOf,
} from "@openfront/engine-api/resources/RealismCountries";
import { REALISM_STRUCTURES } from "@openfront/engine-api/resources/RealismStructures";
import { decodeRealWorldCountryRaster } from "@openfront/engine-api/resources/RealWorldCountries";
import { StampedIntent } from "@openfront/engine-api/Schemas";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { NationExecution } from "@openfront/engine/execution/NationExecution";
import { PlayerExecution } from "@openfront/engine/execution/PlayerExecution";
import { RealBordersStartExecution } from "@openfront/engine/execution/RealBordersStartExecution";
import { Execution, Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import {
  isRealismCountry,
  realisticStartingScore,
} from "@openfront/engine/realism/RealisticWorld";
import { snapshotGameData } from "@openfront/engine/snapshot/GameSnapshot";
import { encodeSnapshotValue } from "@openfront/engine/snapshot/SnapshotCodec";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { expectSnapshotRoundTrip, restoreTestGame } from "./util/Snapshot";

const REAL_BORDERS = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};

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

async function realBordersGame(
  humans: PlayerInfo[] = [
    new PlayerInfo("me", PlayerType.Human, "me_client", "me"),
  ],
): Promise<{ game: Game; runner: GameRunner }> {
  const game = await setup(
    "../../../resources/maps/realisticworld",
    REAL_BORDERS,
    humans,
    undefined,
    undefined,
    false,
    countryNations(),
  );
  const runner = new GameRunner(
    game,
    new Executor(game, "real_borders_claim", "me_client"),
    () => {},
  );
  runner.init();
  // Tick 0 assigns every country its land (RealBordersInitExecution).
  runner.addTurn({ turnNumber: 0, intents: [] });
  runner.executeNextTick();
  return { game, runner };
}

// One tick, with the given spawn-style intents issued for that tick.
function step(
  runner: GameRunner,
  game: Game,
  intents: { type: "spawn"; tile: number; clientID: string }[] = [],
): void {
  runner.addTurn({
    turnNumber: game.ticks(),
    intents: intents as unknown as StampedIntent[],
  });
  runner.executeNextTick();
}

function spawn(clientID: string, tile: number) {
  return { type: "spawn" as const, tile, clientID };
}

function playerNamed(game: Game, name: string): Player {
  const player = game.allPlayers().find((p) => p.name() === name);
  if (player === undefined) throw new Error(`no player for ${name}`);
  return player;
}

function anchorTile(game: Game, name: string): number {
  const c = roster().find((r) => r.name === name);
  if (c === undefined) throw new Error(`no roster country ${name}`);
  return game.ref(c.anchor[0], c.anchor[1]);
}

// Raw starting relation value of `from` toward `to`.
function rawRelation(from: Player, to: Player): number {
  const relations = (from as unknown as { relations: Map<Player, number> })
    .relations;
  return relations.get(to) ?? 0;
}

function executionsOf(game: Game): Execution[] {
  return (game as unknown as { executions(): Execution[] }).executions();
}

// The real-world structures are placed in batches after the start.
function finishStart(runner: GameRunner, game: Game): void {
  while (
    executionsOf(game).some((e) => e instanceof RealBordersStartExecution)
  ) {
    step(runner, game);
  }
}

function hasCapital(game: Game, player: Player, country: string): boolean {
  const capital = REALISM_STRUCTURES.find(
    (s) => s.capital === true && rosterNameOf(s.country) === country,
  )!;
  const tile = game.ref(capital.x, capital.y);
  return player.units(UnitType.City).some((c) => c.tile() === tile);
}

function hashOf(game: Game): number {
  return (game as unknown as { hash(): number }).hash();
}

// Land tiles the raster assigns to a country, by roster index.
function countryTileCounts(game: Game): Map<number, number> {
  const raster = decodeRealWorldCountryRaster();
  const remap = countryIndexRemap();
  const counts = new Map<number, number>();
  for (let t = 0; t < raster.length; t++) {
    const index = remap[raster[t]];
    if (index === 0 || !game.isLand(t) || game.isImpassable(t)) continue;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  return counts;
}

describe("real borders: claiming a country", () => {
  test("a spawn on a country tile hands the human that country", async () => {
    const { game, runner } = await realBordersGame();
    const france = playerNamed(game, "France");
    const me = playerNamed(game, "me");
    const tiles = Array.from(france.tiles());
    const troops = france.troops();
    const gold = france.gold();
    const spawnTile = france.spawnTile();

    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game);

    expect(game.inSpawnPhase()).toBe(false);
    expect(me.numTilesOwned()).toBe(tiles.length);
    expect(tiles.every((t) => game.owner(t) === me)).toBe(true);
    expect(france.numTilesOwned()).toBe(0);
    expect(france.isAlive()).toBe(false);
    expect(me.troops()).toBe(troops);
    expect(me.gold()).toBe(gold);
    expect(me.spawnTile()).toBe(spawnTile);
    expect(me.hasSpawned()).toBe(true);
    expect(me.realismKey()).toBe("France");
  });
  test("the human gets the claimed country's capital at the start", async () => {
    const { game, runner } = await realBordersGame();
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game);
    step(runner, game);
    finishStart(runner, game);
    const me = playerNamed(game, "me");
    expect(hasCapital(game, me, "France")).toBe(true);
  });

  test("the claimed country gets no execution after the start", async () => {
    const { game, runner } = await realBordersGame();
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game, []);
    step(runner, game, []);

    const france = playerNamed(game, "France");
    const executions = executionsOf(game);
    expect(
      executions.some(
        (e) =>
          (e instanceof NationExecution &&
            (e as unknown as { nation: Nation }).nation.playerInfo.name ===
              "France") ||
          (e instanceof PlayerExecution &&
            (e as unknown as { player: Player }).player === france),
      ),
    ).toBe(false);
  });

  test("a second spawn is a no-op, also within the same tick", async () => {
    const { game, runner } = await realBordersGame();
    const me = playerNamed(game, "me");
    const germany = playerNamed(game, "Germany");
    const germanyTiles = germany.numTilesOwned();

    step(runner, game, [
      spawn("me_client", anchorTile(game, "France")),
      spawn("me_client", anchorTile(game, "Germany")),
    ]);
    step(runner, game, [spawn("me_client", anchorTile(game, "Germany"))]);
    step(runner, game);

    expect(me.realismKey()).toBe("France");
    expect(me.numTilesOwned()).toBe(
      countryTileCounts(game).get(
        roster().find((r) => r.name === "France")!.index,
      ),
    );
    expect(germany.numTilesOwned()).toBe(germanyTiles);
    expect(germany.isAlive()).toBe(true);
  });

  test("ocean, unowned land and another human's land are no-ops", async () => {
    const { game, runner } = await realBordersGame([
      new PlayerInfo("me", PlayerType.Human, "me_client", "me"),
      new PlayerInfo("other", PlayerType.Human, "other_client", "other"),
    ]);
    const map = game.map();
    const me = playerNamed(game, "me");
    const other = playerNamed(game, "other");

    let ocean = -1;
    for (let t = 0; t < game.width() * game.height(); t++) {
      if (!game.isLand(t)) {
        ocean = t;
        break;
      }
    }
    // Every land tile is owned at tick 0, so free one country's anchor tile.
    const unowned = anchorTile(game, "France");
    (game.owner(unowned) as Player).relinquish(unowned);
    expect(map.isLand(ocean)).toBe(false);
    expect(game.hasOwner(unowned)).toBe(false);
    const otherTile = anchorTile(game, "Germany");
    other.conquer(otherTile);

    step(runner, game, [spawn("me_client", ocean)]);
    step(runner, game, [spawn("me_client", unowned)]);
    step(runner, game, [spawn("me_client", otherTile)]);
    step(runner, game);

    expect(me.hasSpawned()).toBe(false);
    expect(me.numTilesOwned()).toBe(0);
    expect(game.owner(otherTile)).toBe(other);
    expect(game.inSpawnPhase()).toBe(true);
  });

  test("a human who never picks is claimed deterministically, from a country of 1250 tiles or more", async () => {
    async function run(): Promise<{ key: string; spawned: boolean }> {
      const { game, runner } = await realBordersGame();
      step(runner, game);
      step(runner, game);
      game.endSpawnPhase();
      step(runner, game);
      step(runner, game);
      const me = playerNamed(game, "me");
      return { key: me.realismKey(), spawned: me.hasSpawned() };
    }

    const first = await run();
    const second = await run();
    expect(first.spawned).toBe(true);
    expect(second).toEqual(first);

    const country = roster().find((c) => c.name === first.key);
    expect(country).toBeDefined();
    expect(country!.passive).toBe(false);
    const { game } = await realBordersGame();
    expect(countryTileCounts(game).get(country!.index)).toBeGreaterThanOrEqual(
      1250,
    );
  }, 600_000);
});

describe("real borders: relations of a claimed country", () => {
  test("the human carries the claimed country's seeded relations, and the others' toward it", async () => {
    const { game, runner } = await realBordersGame();
    const me = playerNamed(game, "me");
    const france = playerNamed(game, "France");
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game, []);
    step(runner, game);

    const others = game
      .allPlayers()
      .filter((p) => p.type() === PlayerType.Nation && p.isAlive());
    expect(others.length).toBeGreaterThan(0);
    let nonZero = 0;
    for (const other of others) {
      const toHuman = realisticStartingScore(other.name(), "France", true) ?? 0;
      const fromHuman =
        realisticStartingScore("France", other.name(), true) ?? 0;
      expect(rawRelation(me, other), other.name()).toBe(fromHuman);
      expect(rawRelation(other, me), other.name()).toBe(toHuman);
      if (fromHuman !== 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
    expect(france.isAlive()).toBe(false);
  });
});

describe("real borders: a human named like its claimed country", () => {
  test("keeps the country's relations and capital", async () => {
    const { game, runner } = await realBordersGame([
      new PlayerInfo("France", PlayerType.Human, "me_client", "me"),
    ]);
    const me = game.allPlayers().find((p) => p.clientID() === "me_client")!;
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game, []);
    step(runner, game);
    finishStart(runner, game);

    expect(me.realismKey()).toBe("France");
    expect(isRealismCountry(me)).toBe(true);
    expect(hasCapital(game, me, "France")).toBe(true);

    let nonZero = 0;
    for (const other of game
      .allPlayers()
      .filter((p) => p.type() === PlayerType.Nation && p.isAlive())) {
      const fromHuman =
        realisticStartingScore("France", other.name(), true) ?? 0;
      expect(rawRelation(me, other), other.name()).toBe(fromHuman);
      if (fromHuman !== 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(0);
  });
});

describe("real borders: a claimed enclave keeps its land", () => {
  test("is not annexed when surrounded, though the human's name differs", async () => {
    const { game, runner } = await realBordersGame();
    const me = playerNamed(game, "me");
    const lesotho = roster().find((r) => r.name === "Lesotho")!;
    const tiles = countryTileCounts(game).get(lesotho.index)!;

    step(runner, game, [spawn("me_client", anchorTile(game, "Lesotho"))]);
    for (let i = 0; i < 5; i++) step(runner, game);

    expect(me.realismKey()).toBe("Lesotho");
    expect(me.numTilesOwned()).toBe(tiles);
  });
});

describe("real borders: claim snapshots", () => {
  test("a claimed game round-trips with the key", async () => {
    const { game, runner } = await realBordersGame();
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game, []);
    step(runner, game);
    const restored = await expectSnapshotRoundTrip(
      game,
      "../../../resources/maps/realisticworld",
      15,
    );
    const me = restored.allPlayers().find((p) => p.name() === "me");
    expect(me?.realismKey()).toBe("France");
  }, 300_000);

  test("a v1 player record migrates to a null key, so an unclaimed human keys by id", async () => {
    const { game } = await realBordersGame();
    const root = snapshotGameData(game);
    const index = root.players.findIndex(
      (p) => (p.d as { info: { name: string } }).info.name === "me",
    );
    const v1 = root.players[index].d as Record<string, unknown>;
    delete v1.realismKey;
    root.players[index] = { v: 1, d: v1 };

    const restored = await restoreTestGame(
      encodeSnapshotValue(root),
      "../../../resources/maps/realisticworld",
    );
    const me = restored.allPlayers().find((p) => p.name() === "me");
    expect(me?.realismKey()).toBe(`human:${me?.id()}`);
  }, 300_000);
});

describe("real borders: claim determinism", () => {
  async function hashes(): Promise<number[]> {
    const { game, runner } = await realBordersGame();
    const out: number[] = [];
    for (let t = 1; t <= 300; t++) {
      step(
        runner,
        game,
        t === 1 ? [spawn("me_client", anchorTile(game, "France"))] : [],
      );
      if (t % 25 === 0) out.push(hashOf(game));
    }
    return out;
  }

  test("two identical claimed runs have equal hashes every 25 ticks", async () => {
    expect(await hashes()).toEqual(await hashes());
  }, 600_000);
});
