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
import { neutralLandTiles } from "@openfront/engine/execution/RealBordersInitExecution";
import { RealBordersStartExecution } from "@openfront/engine/execution/RealBordersStartExecution";
import { WinCheckExecution } from "@openfront/engine/execution/WinCheckExecution";
import { Execution, Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import { canAiAttack } from "@openfront/engine/realism/RealBordersPolicy";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { expectSnapshotRoundTrip } from "./util/Snapshot";

const MAP_NAME = "../../../resources/maps/realisticworld";

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

// Land tiles that the raster assigns to a country, and how many raster tiles are skipped.
function expectedAssignment(game: Game) {
  const raster = decodeRealWorldCountryRaster();
  const remap = countryIndexRemap();
  const map = game.map();
  const perCountry = new Map<number, number>();
  let assigned = 0;
  let skipped = 0;
  for (let t = 0; t < raster.length; t++) {
    const index = remap[raster[t]];
    if (index === 0) continue;
    if (!map.isLand(t) || map.isImpassable(t)) {
      skipped++;
      continue;
    }
    perCountry.set(index, (perCountry.get(index) ?? 0) + 1);
    assigned++;
  }
  return { perCountry, assigned, skipped };
}

// Players by roster index (1-based, as countryIndexRemap() gives them).
function countryPlayers(game: Game): Player[] {
  const byName = new Map(
    game
      .allPlayers()
      .filter((p) => p.type() === PlayerType.Nation)
      .map((p) => [p.name(), p]),
  );
  const out: Player[] = [];
  for (const c of roster()) {
    const player = byName.get(c.name);
    if (player === undefined) throw new Error(`no player for ${c.name}`);
    out[c.index] = player;
  }
  return out;
}

function executionsOf(game: Game): Execution[] {
  return (game as unknown as { executions(): Execution[] }).executions();
}

function hashOf(game: Game): number {
  return (game as unknown as { hash(): number }).hash();
}

describe("real borders: tick 0 territory", () => {
  test("every country owns exactly its raster land", async () => {
    const { game, runner, updates } = await realBordersGame();
    const { perCountry, assigned, skipped } = expectedAssignment(game);
    const owners = countryPlayers(game);

    const start = performance.now();
    tick(runner, game);
    const ms = performance.now() - start;
    console.log(
      `real borders tick 0: ${ms.toFixed(0)} ms, assigned ${assigned}, skipped ${skipped} raster tiles (water or impassable)`,
    );

    for (const c of roster()) {
      expect(owners[c.index].numTilesOwned()).toBe(
        perCountry.get(c.index) ?? 0,
      );
    }
    const raster = decodeRealWorldCountryRaster();
    const remap = countryIndexRemap();
    let mismatched = 0;
    for (let t = 0; t < raster.length; t++) {
      const index = remap[raster[t]];
      if (index === 0 || !game.isLand(t) || game.isImpassable(t)) continue;
      if (game.owner(t) !== owners[index]) mismatched++;
    }
    expect(mismatched).toBe(0);

    const tileUpdates = (updates[0].packedTileUpdates?.length ?? 0) / 2;
    expect(tileUpdates).toBeGreaterThanOrEqual(assigned);

    const human = game.allPlayers().find((p) => p.name() === "me");
    expect(human?.numTilesOwned()).toBe(0);
  });

  test("Antarctic land stays neutral after tick 0 and has no player", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game);
    const raster = decodeRealWorldCountryRaster();
    const remap = countryIndexRemap();
    let neutral = 0;
    let owned = 0;
    for (let t = 0; t < raster.length; t++) {
      if (raster[t] === 0 || remap[raster[t]] !== 0 || !game.isLand(t))
        continue;
      neutral++;
      if (game.hasOwner(t)) owned++;
    }
    expect(neutral).toBeGreaterThan(0);
    expect(neutral).toBe(neutralLandTiles(game));
    expect(owned).toBe(0);
    expect(game.allPlayers().some((p) => p.name() === "Antarctica")).toBe(
      false,
    );
  });

  test("terra nullius attacks on neutral land are allowed once spawn immunity ends", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 3);
    const nation = game.nations()[0];
    const attacker = game.player(nation.playerInfo.id);
    expect(canAiAttack(game, attacker, game.terraNullius())).toBe(
      !game.isNationSpawnImmunityActive(),
    );
  });

  test("every country's spawn tile is owned by that country after tick 0", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game);
    const owners = countryPlayers(game);
    for (const c of roster()) {
      const player = owners[c.index];
      const spawn = player.spawnTile();
      expect(spawn, c.name).toBeDefined();
      expect(game.owner(spawn!), c.name).toBe(player);
    }
  });

  test("no nation or player execution runs during the spawn phase", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 6);
    expect(game.inSpawnPhase()).toBe(true);
    expect(
      executionsOf(game).some(
        (e) => e instanceof NationExecution || e instanceof PlayerExecution,
      ),
    ).toBe(false);
    expect(
      game.allPlayers().every((p) => p.outgoingAttacks().length === 0),
    ).toBe(true);
  });
});

describe("real borders: start of play", () => {
  test("capitals, player and nation executions, no terra nullius attack", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 3);
    // The structures, capitals included, are placed in batches.
    while (
      executionsOf(game).some((e) => e instanceof RealBordersStartExecution)
    ) {
      tick(runner, game);
    }

    const map = game.map();
    for (const nation of game.nations()) {
      const player = game.player(nation.playerInfo.id);
      if (!player.isAlive()) continue;
      const cities = player.units(UnitType.City);
      const capital = REALISM_STRUCTURES.find(
        (s) =>
          s.capital === true &&
          rosterNameOf(s.country) === nation.playerInfo.name,
      );
      if (capital !== undefined) {
        const tile = game.ref(capital.x, capital.y);
        expect(
          cities.some((c) => c.tile() === tile),
          nation.playerInfo.name,
        ).toBe(true);
        continue;
      }
      // No capital in the real-world data: the anchor city only.
      expect(cities.length, nation.playerInfo.name).toBe(1);
      const spawn = nation.spawnCell!;
      const city = cities[0].tile();
      const distance = Math.max(
        Math.abs(map.x(city) - spawn.x),
        Math.abs(map.y(city) - spawn.y),
      );
      expect(distance, nation.playerInfo.name).toBeLessThanOrEqual(10);
    }

    const executions = executionsOf(game);
    // A human that never picks is claimed at the start, so it runs a PlayerExecution too.
    const aliveNames = game
      .allPlayers()
      .filter(
        (p) =>
          (p.type() === PlayerType.Nation || p.type() === PlayerType.Human) &&
          p.isAlive(),
      )
      .map((p) => p.name())
      .sort();
    const playerExecNames = executions
      .filter((e) => e instanceof PlayerExecution)
      .map((e) => (e as unknown as { player: Player }).player.name())
      .sort();
    expect(playerExecNames).toEqual(aliveNames);

    const nationExecNames = executions
      .filter((e) => e instanceof NationExecution)
      .map((e) => (e as unknown as { nation: Nation }).nation.playerInfo.name)
      .sort();
    // A country a human claimed at the start has no tiles left and no AI.
    const expectedNationNames = roster()
      .filter((c) => !c.passive && aliveNames.includes(c.name))
      .map((c) => c.name)
      .sort();
    expect(nationExecNames).toEqual(expectedNationNames);

    expect(
      game
        .allPlayers()
        .every((p) =>
          p.outgoingAttacks().every((a) => a.target() !== game.terraNullius()),
        ),
    ).toBe(true);
  }, 120_000);
});

describe("real borders: snapshots", () => {
  test("round-trips before tick 0", async () => {
    const { game } = await realBordersGame();
    await expectSnapshotRoundTrip(game, MAP_NAME, 3);
  }, 300_000);

  test("round-trips mid spawn phase and resumes the start", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game);
    await expectSnapshotRoundTrip(game, MAP_NAME, 30, (g, i) => {
      if (i === 10) g.endSpawnPhase();
    });
  }, 300_000);

  test("round-trips after the start", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 3);
    await expectSnapshotRoundTrip(game, MAP_NAME, 15);
  }, 300_000);
});

describe("real borders: humans named like a roster country", () => {
  test("keep the country's tick 0 land and can still claim it", async () => {
    const { game, runner } = await realBordersGame();
    // Added after the nations, so a name map that keeps the last player would pick them.
    game.addPlayer(
      new PlayerInfo("France", PlayerType.Human, "france_client", "france"),
    );
    game.addPlayer(
      new PlayerInfo("Lesotho", PlayerType.Human, "lesotho_client", "lesotho"),
    );
    const { perCountry } = expectedAssignment(game);
    const franceIndex = roster().find((c) => c.name === "France")!.index;
    const lesothoIndex = roster().find((c) => c.name === "Lesotho")!.index;
    const humanOf = (clientID: string) =>
      game.allPlayers().find((p) => p.clientID() === clientID)!;
    const anchor = (name: string) => {
      const c = roster().find((r) => r.name === name)!;
      return game.ref(c.anchor[0], c.anchor[1]);
    };

    tick(runner, game);
    const owners = countryPlayers(game);
    expect(owners[franceIndex].numTilesOwned()).toBe(
      perCountry.get(franceIndex),
    );
    expect(owners[lesothoIndex].numTilesOwned()).toBe(
      perCountry.get(lesothoIndex),
    );
    expect(humanOf("france_client").numTilesOwned()).toBe(0);
    expect(humanOf("lesotho_client").numTilesOwned()).toBe(0);

    const spawns = [
      { type: "spawn", tile: anchor("France"), clientID: "france_client" },
      { type: "spawn", tile: anchor("Lesotho"), clientID: "lesotho_client" },
    ];
    runner.addTurn({
      turnNumber: game.ticks(),
      intents: spawns as unknown as StampedIntent[],
    });
    runner.executeNextTick();
    tick(runner, game);

    expect(humanOf("france_client").realismKey()).toBe("France");
    expect(humanOf("france_client").numTilesOwned()).toBe(
      perCountry.get(franceIndex),
    );
    expect(owners[franceIndex].isAlive()).toBe(false);
    expect(humanOf("lesotho_client").realismKey()).toBe("Lesotho");
    expect(humanOf("lesotho_client").numTilesOwned()).toBe(
      perCountry.get(lesothoIndex),
    );
  });
});

describe("real borders: determinism", () => {
  async function hashes(): Promise<number[]> {
    const { game, runner } = await realBordersGame();
    const out: number[] = [];
    for (let t = 1; t <= 300; t++) {
      if (t === 10) game.endSpawnPhase();
      tick(runner, game);
      if (t % 25 === 0) out.push(hashOf(game));
    }
    return out;
  }

  test("two identical runs have equal hashes every 25 ticks", async () => {
    expect(await hashes()).toEqual(await hashes());
  }, 600_000);
});

describe("real borders: win share", () => {
  test("80 percent of country land wins even when Antarctica is not owned", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game);
    const human = game.allPlayers().find((p) => p.name() === "me");
    if (human === undefined) throw new Error("no human");
    const raster = decodeRealWorldCountryRaster();
    const remap = countryIndexRemap();
    const countryLand = game.numLandTiles() - neutralLandTiles(game);
    const needed = Math.floor((countryLand * 80) / 100) + 1;
    // Under the all-land share this many tiles would not win.
    expect(needed * 100).toBeLessThanOrEqual(game.numLandTiles() * 80);

    let taken = 0;
    for (let t = 0; t < raster.length && taken < needed; t++) {
      if (remap[raster[t]] === 0 || !game.isLand(t) || game.isImpassable(t)) {
        continue;
      }
      human.conquer(t);
      taken++;
    }
    expect(human.numTilesOwned()).toBe(needed);

    const winCheck = new WinCheckExecution();
    winCheck.init(game, 0);
    winCheck.tick(10);
    expect(winCheck.isActive()).toBe(false);
  }, 300_000);
});
