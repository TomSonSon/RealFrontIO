import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "@openfront/engine-api/game/GameTypes";
import type { PlayerLike } from "@openfront/engine-api/game/ReadViews";
import { GameConfig } from "@openfront/engine-api/Schemas";
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
