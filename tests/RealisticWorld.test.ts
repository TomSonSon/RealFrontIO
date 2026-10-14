import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  Nation,
  PlayerInfo,
  PlayerType,
  Relation,
  TerrainType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { GameConfig } from "@openfront/engine-api/Schemas";
import type { AttackLogicInput } from "@openfront/engine/configuration/EngineConfig";
import { Game, Player } from "@openfront/engine/game/Game";
import {
  placeNationCapital,
  REALISTIC_RELATIONS,
  REALISTIC_SEEDS,
  realisticRelationScore,
  realisticSeedFor,
  seedStartingRelations,
} from "@openfront/engine/realism/RealisticWorld";
import fs from "fs";
import path from "path";
import { setup } from "./util/Setup";
import { TestConfig, UseRealAttackLogic } from "./util/TestConfig";

/**
 * Tests for the optional "Realistic World" mode: nation starting strength
 * (troops / gold scaled to real-world military power) and nation-to-nation
 * starting relations (who is allied, who is hostile). All gated behind the
 * `publicGameModifiers.isRealisticWorld` flag; without it, everything keeps
 * the default behavior.
 */

function baseConfig(): GameConfig {
  return {
    gameMap: GameMapType.Asia,
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
  };
}

function realisticConfig(): GameConfig {
  return {
    ...baseConfig(),
    gameMap: GameMapType.World,
    publicGameModifiers: { isRealisticWorld: true },
  };
}

describe("Realistic World - engine flag", () => {
  test("isRealisticWorld() reads publicGameModifiers.isRealisticWorld", () => {
    expect(new TestConfig(realisticConfig(), false).isRealisticWorld()).toBe(
      true,
    );
    expect(new TestConfig(baseConfig(), false).isRealisticWorld()).toBe(false);
  });

  test("is World-map only: the flag is ignored on other maps", () => {
    for (const gameMap of [
      GameMapType.Asia,
      GameMapType.GiantWorldMap,
      GameMapType.WorldInverted,
    ]) {
      const cfg = new TestConfig({ ...realisticConfig(), gameMap }, false);
      expect(cfg.isRealisticWorld()).toBe(false);
    }
  });
});

describe("Realistic World - seed data matches the World map manifest", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../resources/maps/world/manifest.json"),
      "utf8",
    ),
  ) as { nations: { name: string }[] };
  const names = manifest.nations.map((n) => n.name);

  test("every World nation has a seed", () => {
    expect(names.filter((n) => realisticSeedFor(n) === undefined)).toEqual([]);
  });

  test("every seed key names a World nation", () => {
    const unknown = Object.keys(REALISTIC_SEEDS).filter(
      (k) => !names.includes(k),
    );
    expect(unknown).toEqual([]);
  });

  test("every relation key (row and column) names a World nation", () => {
    const unknown = new Set<string>();
    for (const [row, cols] of Object.entries(REALISTIC_RELATIONS)) {
      if (!names.includes(row)) unknown.add(row);
      for (const col of Object.keys(cols)) {
        if (!names.includes(col)) unknown.add(col);
      }
    }
    expect([...unknown]).toEqual([]);
  });

  test("Latvia is seeded comparably to its neighbours", () => {
    const latvia = realisticSeedFor("Latvia")!;
    expect(latvia.troops).toBeGreaterThan(0);
    expect(latvia.troops).toBeLessThanOrEqual(
      realisticSeedFor("Belarus")!.troops,
    );
  });
});

describe("Realistic World - relation score direction", () => {
  test("a score listed on one side applies in both directions", () => {
    expect(realisticRelationScore("Madagascar", "France")).toBe(50);
    expect(realisticRelationScore("France", "Madagascar")).toBe(50);
  });

  test("an explicit row for the reverse direction wins", () => {
    expect(realisticRelationScore("United States", "Brazil")).toBe(50);
    expect(realisticRelationScore("Brazil", "United States")).toBe(60);
  });

  test("sub-regions resolve to their parent in either direction", () => {
    expect(realisticRelationScore("Russia", "Alaska")).toBe(-80);
    expect(realisticRelationScore("Alaska", "Russia")).toBe(-80);
  });

  test("unlisted pairs have no score", () => {
    expect(realisticRelationScore("Chad", "Bhutan")).toBeUndefined();
  });
});

describe("Realistic World - nation starting strength", () => {
  const nation = (name: string, id: string) =>
    new PlayerInfo(name, PlayerType.Nation, null, id);

  // Real borders starts a roster country at 10 troops per inhabitant.
  const startFor = (name: string) =>
    Math.max(20_000, 10 * roster().find((c) => c.name === name)!.population);

  test("realistic mode starts nations at their seeded troops and scales gold by real military power", () => {
    const cfg = new TestConfig(realisticConfig(), false);
    const seeded = (name: string) => realisticSeedFor(name)!.troops;

    expect(cfg.startManpower(nation("United States", "us"))).toBe(
      seeded("United States"),
    );
    expect(cfg.startingGold(nation("United States", "us"))).toBe(500_000n);

    expect(cfg.startManpower(nation("China", "cn"))).toBe(seeded("China"));
    expect(cfg.startManpower(nation("Russia", "ru"))).toBe(seeded("Russia"));
    expect(cfg.startManpower(nation("Canada", "ca"))).toBe(seeded("Canada"));

    // A weak nation is present but not irrelevant.
    expect(cfg.startManpower(nation("Chad", "td"))).toBe(seeded("Chad"));
    expect(cfg.startingGold(nation("Chad", "td"))).toBe(35_000n);
  });

  test("real borders starts a roster country at 10 troops per inhabitant", () => {
    const cfg = new TestConfig(
      {
        ...realisticConfig(),
        gameMap: GameMapType.RealisticWorld,
        publicGameModifiers: { isRealisticWorld: true },
      },
      false,
    );
    expect(cfg.isRealBorders()).toBe(true);
    expect(cfg.startManpower(nation("United States", "us"))).toBe(
      startFor("United States"),
    );
    expect(cfg.startManpower(nation("Chad", "td"))).toBe(startFor("Chad"));
  });

  test("sub-national regions keep their seeded troops (no roster country)", () => {
    const cfg = new TestConfig(realisticConfig(), false);
    expect(cfg.startManpower(nation("California", "ca_ex"))).toBe(
      realisticSeedFor("California")!.troops,
    );
    expect(cfg.startManpower(nation("Siberia", "sib"))).toBe(
      realisticSeedFor("Siberia")!.troops,
    );
    expect(cfg.startManpower(nation("Quebec", "qc"))).toBe(
      realisticSeedFor("Quebec")!.troops,
    );
  });

  test("without the flag, nation strength uses the normal difficulty-based values", () => {
    const cfg = new TestConfig(baseConfig(), false);
    // Medium nations = 18_750 like the standard sim.
    expect(cfg.startManpower(nation("United States", "us"))).toBe(18_750);
    expect(cfg.startingGold(nation("United States", "us"))).toBe(0n);
  });

  test("non-nation players are unaffected by realistic mode", () => {
    const cfg = new TestConfig(realisticConfig(), false);
    const human = new PlayerInfo("player", PlayerType.Human, null, "p");
    expect(cfg.startManpower(human)).toBe(25_000);
  });
});

describe("Realistic World - nation starting relations", () => {
  const worldNations = (): Nation[] => [
    new Nation(
      undefined,
      new PlayerInfo("United States", PlayerType.Nation, null, "us_id"),
    ),
    new Nation(
      undefined,
      new PlayerInfo("Russia", PlayerType.Nation, null, "ru_id"),
    ),
    new Nation(
      undefined,
      new PlayerInfo("Canada", PlayerType.Nation, null, "ca_id"),
    ),
    new Nation(
      undefined,
      new PlayerInfo("Pakistan", PlayerType.Nation, null, "pk_id"),
    ),
    new Nation(
      undefined,
      new PlayerInfo("India", PlayerType.Nation, null, "in_id"),
    ),
  ];

  // Real borders (World, Normal, FFA) seeds from RealBordersStartExecution, which
  // setup() does not run, so these tests seed the nations directly.
  async function realisticWorld(): Promise<Game> {
    const game = await setup(
      "big_plains",
      {
        gameMap: GameMapType.World,
        publicGameModifiers: { isRealisticWorld: true },
      },
      [],
      undefined,
      TestConfig,
      true,
      worldNations(),
    );
    seedStartingRelations(
      game.allPlayers().filter((p) => p.type() === PlayerType.Nation),
    );
    return game;
  }

  test("seeds allied nations friendly and adversaries hostile", async () => {
    const game = await realisticWorld();
    const us = game.player("us_id") as Player;
    const ru = game.player("ru_id") as Player;
    const ca = game.player("ca_id") as Player;
    const pk = game.player("pk_id") as Player;
    const ind = game.player("in_id") as Player;

    // US & Canada allies -> friendly both ways.
    expect(us.relation(ca)).toBe(Relation.Friendly);
    expect(ca.relation(us)).toBe(Relation.Friendly);
    // US & Russia adversaries -> hostile both ways.
    expect(us.relation(ru)).toBe(Relation.Hostile);
    expect(ru.relation(us)).toBe(Relation.Hostile);
    // India & Pakistan adversaries -> hostile both ways.
    expect(ind.relation(pk)).toBe(Relation.Hostile);
    expect(pk.relation(ind)).toBe(Relation.Hostile);
    // Unlisted pairs default to neutral.
    expect(ca.relation(pk)).toBe(Relation.Neutral);
  });

  test("a one-sided listing seeds both nations in the live game", async () => {
    const game = await setup(
      "big_plains",
      {
        gameMap: GameMapType.World,
        publicGameModifiers: { isRealisticWorld: true },
      },
      [],
      undefined,
      TestConfig,
      true,
      [
        new Nation(
          undefined,
          new PlayerInfo("Madagascar", PlayerType.Nation, null, "mg_id"),
        ),
        new Nation(
          undefined,
          new PlayerInfo("France", PlayerType.Nation, null, "fr_id"),
        ),
      ],
    );
    seedStartingRelations(
      game.allPlayers().filter((p) => p.type() === PlayerType.Nation),
    );
    const mg = game.player("mg_id") as Player;
    const fr = game.player("fr_id") as Player;
    expect(mg.relation(fr)).toBe(Relation.Friendly);
    expect(fr.relation(mg)).toBe(Relation.Friendly);
  });

  test("seeds realistic starting strength in the live game", async () => {
    const game = await realisticWorld();
    const us = game.player("us_id") as Player;
    const ru = game.player("ru_id") as Player;
    expect(us.troops()).toBe(realisticSeedFor("United States")!.troops);
    expect(us.gold()).toBe(500_000n);
    expect(ru.troops()).toBe(realisticSeedFor("Russia")!.troops);
  });
});

describe("Realistic World - defaults unchanged when flag is off", () => {
  test("relations stay neutral without the flag", async () => {
    const game = await setup(
      "big_plains",
      {},
      [],
      undefined,
      TestConfig,
      true,
      [
        new Nation(
          undefined,
          new PlayerInfo("United States", PlayerType.Nation, null, "us_id"),
        ),
        new Nation(
          undefined,
          new PlayerInfo("Russia", PlayerType.Nation, null, "ru_id"),
        ),
        new Nation(
          undefined,
          new PlayerInfo("Canada", PlayerType.Nation, null, "ca_id"),
        ),
      ],
    );
    const us = game.player("us_id") as Player;
    const ru = game.player("ru_id") as Player;
    const ca = game.player("ca_id") as Player;
    expect(us.relation(ru)).toBe(Relation.Neutral);
    expect(us.relation(ca)).toBe(Relation.Neutral);
    // Difficulty-Medium nation troop value is the standard 18_750.
    expect(us.troops()).toBe(18_750);
  });
});

describe("Realistic World - starting capital city", () => {
  async function nationOnLand(
    name = "United States",
    overrides: Partial<GameConfig> = {},
  ) {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
      ...overrides,
    });
    const player = game.addPlayer(
      new PlayerInfo(name, PlayerType.Nation, null, "us_id"),
    ) as Player;
    let tile: number | undefined;
    game.map().forEachTile((t) => {
      if (
        tile === undefined &&
        game.map().isLand(t) &&
        !game.map().isImpassable(t)
      ) {
        tile = t;
      }
    });
    player.conquer(tile!);
    return { game, player, tile: tile! };
  }

  test("places a capital city on the preferred tile when owned", async () => {
    const { game, player, tile } = await nationOnLand();
    placeNationCapital(game, player, tile);
    const cities = player.units(UnitType.City);
    expect(cities).toHaveLength(1);
    expect(cities[0].tile()).toBe(tile);
  });

  test("falls back to any owned land tile when no preferred tile is given", async () => {
    const { game, player } = await nationOnLand();
    placeNationCapital(game, player);
    expect(player.units(UnitType.City)).toHaveLength(1);
  });

  test("is a no-op when cities are disabled", async () => {
    const { game, player, tile } = await nationOnLand("United States", {
      disabledUnits: [UnitType.City],
    });
    placeNationCapital(game, player, tile);
    expect(player.units(UnitType.City)).toHaveLength(0);
  });

  test("is a no-op for non-nation players", async () => {
    const { game, tile } = await nationOnLand();
    const human = game.addPlayer(
      new PlayerInfo("player", PlayerType.Human, null, "p_id"),
    ) as Player;
    human.conquer(tile);
    placeNationCapital(game, human, tile);
    expect(human.units(UnitType.City)).toHaveLength(0);
  });
});

describe("Realistic World - terrain makes mountains a real barrier", () => {
  function attackInput(terrain: TerrainType): AttackLogicInput {
    return {
      terrain,
      attackTroops: 50_000,
      attacker: { type: PlayerType.Nation, numTiles: 10_000 },
      defender: {
        type: PlayerType.Nation,
        numTiles: 10_000,
        troops: 50_000,
        isTraitor: false,
        isDisconnectedTeammate: false,
      },
      defenderHasDefensePost: false,
      falloutRatio: null,
      borderSize: 10,
    };
  }

  test("mountains are slower and bloodier to take in Realistic World mode", () => {
    const realistic = new UseRealAttackLogic(realisticConfig(), false);
    const normal = new UseRealAttackLogic(baseConfig(), false);

    const r = realistic.attackLogic(attackInput(TerrainType.Mountain));
    const n = normal.attackLogic(attackInput(TerrainType.Mountain));

    expect(r.tickFraction).toBeGreaterThan(n.tickFraction);
    expect(r.attackerTroopLoss).toBeGreaterThan(n.attackerTroopLoss);
  });

  test("Realistic World mode makes mountain chokepoints far costlier than plains", () => {
    const realistic = new UseRealAttackLogic(realisticConfig(), false);
    const normal = new UseRealAttackLogic(baseConfig(), false);

    const realisticRatio =
      realistic.attackLogic(attackInput(TerrainType.Mountain)).tickFraction /
      realistic.attackLogic(attackInput(TerrainType.Plains)).tickFraction;
    const normalRatio =
      normal.attackLogic(attackInput(TerrainType.Mountain)).tickFraction /
      normal.attackLogic(attackInput(TerrainType.Plains)).tickFraction;

    // Realistic mode widens the mountain-vs-plains gap (strong chokepoints);
    // the default tuning keeps it modest.
    expect(realisticRatio).toBeGreaterThan(2);
    expect(normalRatio).toBeLessThan(2);
  });
});
