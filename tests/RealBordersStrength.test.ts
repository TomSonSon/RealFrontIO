import {
  Cell,
  Difficulty,
  GameMapSize,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import type {
  PlayerLike,
  UnitLike,
} from "@openfront/engine-api/game/ReadViews";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import {
  REAL_BORDERS_SEEDED_CITY_SHARE,
  realBordersCountry,
} from "@openfront/engine-lib/configuration/RealBordersStrength";
import { pow } from "@openfront/engine-lib/DetMath";
import { renderNumber, renderTroops } from "@openfront/engine-lib/Format";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { claimCountry } from "@openfront/engine/execution/RealBordersClaim";
import { Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { expectSnapshotRoundTrip } from "./util/Snapshot";
import { makePlayerView } from "./util/viewStubs";

const REAL_BORDERS = {
  gameMap: GameMapType.RealisticWorld,
  gameMapSize: GameMapSize.Normal,
  publicGameModifiers: { isRealisticWorld: true },
};

const SAMPLE = [
  "United States",
  "China",
  "Russia",
  "India",
  "Germany",
  "France",
  "Poland",
  "Sweden",
  "Spain",
  "Italy",
  "Greece",
  "Luxembourg",
  "Brazil",
  "Egypt",
  "Ukraine",
];

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

// Ending the spawn phase starts the countries (capitals, nation AI, regen).
async function realBordersGame(
  spawnPhaseEnds = false,
  difficulty = Difficulty.Medium,
): Promise<{ game: Game; runner: GameRunner }> {
  const game = await setup(
    "../../../resources/maps/realisticworld",
    { ...REAL_BORDERS, difficulty },
    [new PlayerInfo("me", PlayerType.Human, "me_client", "me")],
    undefined,
    undefined,
    spawnPhaseEnds,
    countryNations(),
  );
  const runner = new GameRunner(
    game,
    new Executor(game, "real_borders_strength", "me_client"),
    () => {},
  );
  runner.init();
  runner.addTurn({ turnNumber: 0, intents: [] });
  runner.executeNextTick();
  return { game, runner };
}

function runTicks(runner: GameRunner, game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    runner.addTurn({ turnNumber: game.ticks(), intents: [] });
    runner.executeNextTick();
  }
}

function hashOf(game: Game): number {
  return (game as unknown as { hash(): number }).hash();
}

function countryOf(name: string) {
  const c = roster().find((r) => r.name === name);
  if (c === undefined) throw new Error(`no roster country ${name}`);
  return c;
}

function startOf(name: string): number {
  return Math.max(20_000, 10 * countryOf(name).population);
}

const city = {
  type: () => UnitType.City,
  isUnderConstruction: () => false,
  level: () => 1,
} as unknown as UnitLike;

/** A PlayerLike with the given country key, land, city count and troops. */
function stub(opts: {
  type: PlayerType;
  key: string;
  tiles: number;
  cities?: number;
  troops?: number;
}): PlayerLike {
  const cities = Array.from({ length: opts.cities ?? 0 }, () => city);
  return {
    id: () => "p",
    smallID: () => 1,
    isPlayer: () => true,
    type: () => opts.type,
    isLobbyCreator: () => false,
    numTilesOwned: () => opts.tiles,
    troops: () => opts.troops ?? 0,
    gold: () => 0n,
    units: (t: UnitType) => (t === UnitType.City ? cities : []),
    realismKey: () => opts.key,
  };
}

/** Classic cap: the difficulty multiplier on the land term plus 250K per city. */
function classicCap(tiles: number, cities: number, multiplier: number): number {
  return multiplier * (2 * (pow(tiles, 0.6) * 1000 + 50000) + cities * 250_000);
}

describe("real borders start", () => {
  test("realBordersCountry starts at 10 x population with a floor", () => {
    for (const name of SAMPLE) {
      expect(realBordersCountry(name)?.start).toBe(startOf(name));
    }
    expect(realBordersCountry("Not A Country")).toBeUndefined();
  });

  test("the 15 countries start with their population in troops", async () => {
    const { game } = await realBordersGame();
    for (const name of SAMPLE) {
      const player = game.allPlayers().find((p) => p.name() === name);
      if (player === undefined) throw new Error(`no player ${name}`);
      const start = startOf(name);
      expect(Math.abs(player.troops() - start) / start).toBeLessThan(0.01);
    }
  }, 120_000);

  test("the start displays as the roster population", () => {
    for (const name of SAMPLE) {
      expect(renderTroops(startOf(name))).toBe(
        renderNumber(countryOf(name).population),
      );
    }
  });
});

describe("real borders cap", () => {
  test("tick-0 cap is 1.5 x start for every roster country at every difficulty", async () => {
    for (const difficulty of [
      Difficulty.Easy,
      Difficulty.Medium,
      Difficulty.Hard,
      Difficulty.Impossible,
    ]) {
      const { game } = await realBordersGame(false, difficulty);
      const config = game.config();
      for (const c of roster()) {
        const target = 1.5 * startOf(c.name);
        const cities = realBordersCountry(c.name)?.seededCities ?? 0;
        for (const type of [PlayerType.Human, PlayerType.Nation]) {
          const cap = config.maxTroops(
            stub({ type, key: c.name, tiles: c.tiles, cities }),
          );
          expect(Math.abs(cap - target) / target).toBeLessThan(0.01);
        }
      }
    }
  }, 300_000);

  test("a seeded city adds its equal share of half the start", async () => {
    const { game } = await realBordersGame();
    const config = game.config();
    for (const name of ["Luxembourg", "China"]) {
      const seeded = realBordersCountry(name)?.seededCities ?? 0;
      expect(seeded).toBeGreaterThan(0);
      const tiles = countryOf(name).tiles;
      const without = config.maxTroops(
        stub({ type: PlayerType.Nation, key: name, tiles, cities: seeded - 1 }),
      );
      const withCity = config.maxTroops(
        stub({ type: PlayerType.Nation, key: name, tiles, cities: seeded }),
      );
      const added = withCity - without;
      const expected =
        (REAL_BORDERS_SEEDED_CITY_SHARE * startOf(name)) / seeded;
      expect(Math.abs(added - expected) / expected).toBeLessThan(1e-9);
    }
  });

  test("the cap grows with land", async () => {
    const { game } = await realBordersGame();
    const config = game.config();
    const tiles = countryOf("France").tiles;
    const small = config.maxTroops(
      stub({ type: PlayerType.Nation, key: "France", tiles }),
    );
    const large = config.maxTroops(
      stub({ type: PlayerType.Nation, key: "France", tiles: tiles * 2 }),
    );
    expect(large).toBeGreaterThan(small);
  });

  test("a claimed human keeps the country's cap, and the client view matches the engine", async () => {
    const { game } = await realBordersGame();
    const config = game.config();
    const us = game.allPlayers().find((p) => p.name() === "United States");
    if (us === undefined) throw new Error("no United States");
    const me = game.allPlayers().find((p) => p.name() === "me") as Player;
    claimCountry(game, me, us);
    expect(me.realismKey()).toBe("United States");
    const cities = me
      .units(UnitType.City)
      .filter((u) => !u.isUnderConstruction()).length;
    expect(config.maxTroops(me)).toBe(
      config.maxTroops(
        stub({
          type: PlayerType.Human,
          key: "United States",
          tiles: me.numTilesOwned(),
          cities,
        }),
      ),
    );

    const view = makePlayerView({
      data: {
        id: "player-view",
        name: "me",
        playerType: PlayerType.Human,
        realismKey: "United States",
        tilesOwned: countryOf("United States").tiles,
      },
    });
    expect(view.realismKey()).toBe("United States");
    expect(config.maxTroops(view)).toBe(
      config.maxTroops(
        stub({
          type: PlayerType.Human,
          key: "United States",
          tiles: countryOf("United States").tiles,
        }),
      ),
    );
  });
});

function nationsOf(game: Game): Player[] {
  return game.allPlayers().filter((p) => p.type() === PlayerType.Nation);
}

describe("real borders regen", () => {
  test("regen is never negative below the cap, and living nations stay within 1 percent of it", async () => {
    const { game, runner } = await realBordersGame(true);
    const config = game.config();
    for (const at of [1, 50, 200, 600]) {
      runTicks(runner, game, at - game.ticks());
      for (const p of nationsOf(game)) {
        if (p.troops() <= config.maxTroops(p)) {
          expect(config.troopIncreaseRate(p)).toBeGreaterThanOrEqual(0);
        }
        if (p.numTilesOwned() > 0) {
          expect(p.troops()).toBeLessThanOrEqual(config.maxTroops(p) * 1.01);
        }
      }
    }
  }, 120_000);

  test("nations that never lose troops over 600 ticks grow towards their cap", async () => {
    // Nation attacks resolve within a tick and cost troops, so a tick is only
    // checked for nations that never lost troops in the whole run.
    const { game, runner } = await realBordersGame(true);
    const start = new Map(nationsOf(game).map((p) => [p.name(), p.troops()]));
    const lost = new Set<string>();
    for (let t = 0; t < 600; t++) {
      const before = new Map(
        nationsOf(game).map((p) => [p.name(), p.troops()]),
      );
      runTicks(runner, game, 1);
      for (const p of nationsOf(game)) {
        if (p.troops() < before.get(p.name())!) lost.add(p.name());
      }
    }
    const peaceful = nationsOf(game).filter(
      (p) => !lost.has(p.name()) && p.numTilesOwned() > 0,
    );
    expect(peaceful.length).toBeGreaterThan(0);
    for (const p of peaceful) {
      expect(p.troops()).toBeGreaterThan(start.get(p.name())!);
      expect(p.troops()).toBeLessThanOrEqual(game.config().maxTroops(p) * 1.01);
    }
  }, 120_000);
});

describe("real borders numbers", () => {
  test("14.3e9 troops survive a snapshot round trip", async () => {
    const { game } = await realBordersGame();
    const us = game.allPlayers().find((p) => p.name() === "United States");
    if (us === undefined) throw new Error("no United States");
    us.setTroops(14.3e9);
    await expectSnapshotRoundTrip(
      game,
      "../../../resources/maps/realisticworld",
      5,
    );
  }, 300_000);

  test("14.3e9 troops are drained exactly in the packed stats", async () => {
    const { game } = await realBordersGame();
    const us = game.allPlayers().find((p) => p.name() === "United States");
    if (us === undefined) throw new Error("no United States");
    game.drainPackedPlayerUpdates();
    us.setTroops(14.3e9);
    game.executeNextTick();
    const packed = game.drainPackedPlayerUpdates();
    let troops: number | undefined;
    for (let i = 0; packed !== null && i + 4 < packed.length; i += 5) {
      if (packed[i] === us.smallID()) troops = packed[i + 3];
    }
    expect(troops).toBe(14.3e9);
  });
});

describe("classic and legacy modes keep their formulas", () => {
  test("caps, starts and regen match the classic values", async () => {
    const classic = await setup(
      "world",
      { gameMap: GameMapType.World, difficulty: Difficulty.Medium },
      [new PlayerInfo("me", PlayerType.Human, "me_client", "me")],
    );
    const legacy = await setup(
      "world",
      {
        gameMap: GameMapType.World,
        gameMapSize: GameMapSize.Compact,
        difficulty: Difficulty.Medium,
        publicGameModifiers: { isRealisticWorld: true },
      },
      [new PlayerInfo("me", PlayerType.Human, "me_client", "me")],
    );
    for (const game of [classic, legacy]) {
      const config = game.config();
      expect(config.isRealBorders()).toBe(false);
      for (const cities of [0, 2]) {
        const nation = stub({
          type: PlayerType.Nation,
          key: "France",
          tiles: 300,
          cities,
        });
        expect(config.maxTroops(nation)).toBe(classicCap(300, cities, 0.75));
        const human = stub({
          type: PlayerType.Human,
          key: "France",
          tiles: 300,
          cities,
        });
        expect(config.maxTroops(human)).toBe(classicCap(300, cities, 1));
      }
      const troops = 1000;
      const max = classicCap(300, 0, 0.75);
      const toAdd = (10 + pow(troops, 0.73) / 4) * (1 - troops / max) * 0.95;
      const nation = stub({
        type: PlayerType.Nation,
        key: "France",
        tiles: 300,
        troops,
      });
      expect(config.troopIncreaseRate(nation)).toBe(
        Math.min(troops + toAdd, max) - troops,
      );
    }
  });
});

describe("real borders determinism", () => {
  test("the same real borders game hashes identically every 50 ticks", async () => {
    const a = await realBordersGame(true);
    const b = await realBordersGame(true);
    const hashesA: number[] = [];
    const hashesB: number[] = [];
    for (let t = 0; t < 300; t += 50) {
      runTicks(a.runner, a.game, 50);
      runTicks(b.runner, b.game, 50);
      hashesA.push(hashOf(a.game));
      hashesB.push(hashOf(b.game));
    }
    expect(hashesA).toEqual(hashesB);
  }, 60_000);
});
