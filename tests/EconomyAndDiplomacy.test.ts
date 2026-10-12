import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import type { PlayerLike } from "@openfront/engine-api/game/ReadViews";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { coalitionSanctionFactor } from "@openfront/engine/configuration/EngineConfig";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";
import { TestConfig } from "./util/TestConfig";

/**
 * Economy & diplomacy (research/real-world-realism/10-economics-and-diplomacy,
 * §8.1-8.2 "do now"): relation-scaled trade. Everyone still trades (as in
 * reality — rivals trade), but in Realistic World mode bloc allies trade deeper
 * (alignment bonus) while neutral/rival trade is tariffed. Classic mode keeps
 * the flat rates — the multiplier is 1 and nothing changes.
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
  return { ...baseConfig(), publicGameModifiers: { isRealisticWorld: true } };
}

const stubPlayer = { isLobbyCreator: () => false } as unknown as PlayerLike;

describe("relation-scaled trade (Realistic World)", () => {
  test("tradeMultiplier is 1 in classic mode (behavior unchanged)", () => {
    const cfg = new TestConfig(baseConfig(), false);
    expect(cfg.tradeMultiplier("ally")).toBe(1);
    expect(cfg.tradeMultiplier("team")).toBe(1);
    expect(cfg.tradeMultiplier("self")).toBe(1);
    expect(cfg.tradeMultiplier("other")).toBe(1);
  });

  test("Realistic World boosts bloc allies and tariffs rivals", () => {
    const cfg = new TestConfig(realisticConfig(), false);
    expect(cfg.tradeMultiplier("ally")).toBe(1.2);
    expect(cfg.tradeMultiplier("other")).toBe(0.7);
    expect(cfg.tradeMultiplier("team")).toBe(1);
    expect(cfg.tradeMultiplier("self")).toBe(1);
  });

  test("rail trade deepens the ally-vs-rival gap in Realistic World", () => {
    const realistic = new TestConfig(realisticConfig(), false);
    const classic = new TestConfig(baseConfig(), false);

    const rAlly = realistic.trainGold("ally", 0, stubPlayer);
    const rOther = realistic.trainGold("other", 0, stubPlayer);
    const cAlly = classic.trainGold("ally", 0, stubPlayer);
    const cOther = classic.trainGold("other", 0, stubPlayer);

    // Allies trade deeper in realism; rival trade is tariffed below classic.
    expect(rAlly).toBeGreaterThan(cAlly);
    expect(rOther).toBeLessThan(cOther);

    // The ally-vs-rival spread widens versus classic flat trading.
    const rRatio = Number(rAlly) / Number(rOther);
    const cRatio = Number(cAlly) / Number(cOther);
    expect(rRatio).toBeGreaterThan(cRatio);
  });
});

describe("coalition sanctions (Realistic World §8.4)", () => {
  test("sanctions stack up to a floor — coordination hurts more", () => {
    expect(coalitionSanctionFactor(0)).toBe(1);
    expect(coalitionSanctionFactor(1)).toBe(0.75);
    expect(coalitionSanctionFactor(2)).toBe(0.5);
    expect(coalitionSanctionFactor(5)).toBe(0.5); // capped
    expect(coalitionSanctionFactor(2)).toBeLessThan(coalitionSanctionFactor(1));
  });
});

describe("per-game reputation (Realistic World §8.5)", () => {
  function grantLand(game: Game, players: Player[]): void {
    let i = 0;
    game.map().forEachTile((t) => {
      if (!game.map().isLand(t) || game.map().isImpassable(t)) return;
      players[i++ % players.length].conquer(t);
    });
  }

  test("betrayal tanks reputation THIS game (no persistence)", async () => {
    const game = await setup("big_plains", {
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "a"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "b"),
    ) as Player;
    grantLand(game, [a, b]);
    expect(a.isAlive()).toBe(true);

    expect(a.reputation()).toBe(0);
    a.markTraitor();
    expect(a.reputation()).toBeLessThan(0);

    // A betrayer can't form NEW alliances for the rest of this game.
    expect(a.canSendAllianceRequest(b)).toBe(false);
  });

  test("classic mode has no reputation gate (behavior unchanged)", async () => {
    const game = await setup("big_plains", {});
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "a"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "b"),
    ) as Player;
    grantLand(game, [a, b]);
    a.markTraitor();
    expect(a.canSendAllianceRequest(b)).toBe(true);
  });
});
