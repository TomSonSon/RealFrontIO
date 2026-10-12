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
} from "@openfront/engine-api/game/GameTypes";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";
import { TestConfig } from "./util/TestConfig";

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
    publicGameModifiers: { isRealisticWorld: true },
  };
}

describe("Realistic World — engine flag", () => {
  test("isRealisticWorld() reads publicGameModifiers.isRealisticWorld", () => {
    expect(new TestConfig(realisticConfig(), false).isRealisticWorld()).toBe(
      true,
    );
    expect(new TestConfig(baseConfig(), false).isRealisticWorld()).toBe(false);
  });
});

describe("Realistic World — nation starting strength", () => {
  const nation = (name: string, id: string) =>
    new PlayerInfo(name, PlayerType.Nation, null, id);

  test("realistic mode scales nation starting troops and gold by real military power", () => {
    const cfg = new TestConfig(realisticConfig(), false);

    expect(cfg.startManpower(nation("United States", "us"))).toBe(100_000);
    expect(cfg.startingGold(nation("United States", "us"))).toBe(500_000n);

    expect(cfg.startManpower(nation("China", "cn"))).toBe(85_000);
    expect(cfg.startManpower(nation("Russia", "ru"))).toBe(75_000);
    expect(cfg.startManpower(nation("Canada", "ca"))).toBe(30_000);

    // A weak nation is present but not irrelevant.
    expect(cfg.startManpower(nation("Chad", "td"))).toBe(12_000);
    expect(cfg.startingGold(nation("Chad", "td"))).toBe(35_000n);
  });

  test("sub-national regions start with a fraction of their parent's strength", () => {
    const cfg = new TestConfig(realisticConfig(), false);
    expect(cfg.startManpower(nation("California", "ca_ex"))).toBe(45_000);
    expect(cfg.startManpower(nation("Siberia", "sib"))).toBe(30_000);
    expect(cfg.startManpower(nation("Quebec", "qc"))).toBe(15_000);
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

describe("Realistic World — nation starting relations", () => {
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

  async function realisticWorld(): Promise<Game> {
    return setup(
      "big_plains",
      { publicGameModifiers: { isRealisticWorld: true } },
      [],
      undefined,
      TestConfig,
      true,
      worldNations(),
    );
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

  test("seeds realistic starting strength in the live game", async () => {
    const game = await realisticWorld();
    const us = game.player("us_id") as Player;
    const ru = game.player("ru_id") as Player;
    expect(us.troops()).toBe(100_000);
    expect(us.gold()).toBe(500_000n);
    expect(ru.troops()).toBe(75_000);
  });
});

describe("Realistic World — defaults unchanged when flag is off", () => {
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
