import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import type { GameUpdateViewData } from "@openfront/engine-api/game/GameUpdates";
import type { PlayerLike } from "@openfront/engine-api/game/ReadViews";
import { CHOKEPOINTS } from "@openfront/engine-api/resources/Chokepoints";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { coalitionSanctionPercent } from "@openfront/engine/configuration/EngineConfig";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import { setup } from "./util/Setup";
import { TestConfig } from "./util/TestConfig";

/**
 * Economy & diplomacy (research/real-world-realism/10-economics-and-diplomacy,
 * section 8.1-8.2 "do now"): relation-scaled trade. Everyone still trades (as in
 * reality - rivals trade), but in Realistic World mode bloc allies trade deeper
 * (alignment bonus) while neutral/rival trade is tariffed. Classic mode keeps
 * the flat rates - the multiplier is 1 and nothing changes.
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

describe("coalition sanctions (Realistic World section 8.4)", () => {
  test("sanctions stack up to a floor - coordination hurts more", () => {
    expect(coalitionSanctionPercent(0)).toBe(100);
    expect(coalitionSanctionPercent(1)).toBe(75);
    expect(coalitionSanctionPercent(2)).toBe(50);
    expect(coalitionSanctionPercent(5)).toBe(50); // capped
  });

  async function sanctionScenario() {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const [a, b, c] = ["A", "B", "C"].map(
      (n) =>
        game.addPlayer(
          new PlayerInfo(n, PlayerType.Human, null, n.toLowerCase()),
        ) as Player,
    );
    return { game, a, b, c };
  }

  test("only non-temporary embargoes count toward sanctions", async () => {
    const { game, a, b, c } = await sanctionScenario();
    b.addEmbargo(a, true);
    expect(game.incomingEmbargoCount(a)).toBe(0);
    c.addEmbargo(a, false);
    expect(game.incomingEmbargoCount(a)).toBe(1);
    // A temporary embargo upgraded to a permanent one starts counting.
    b.addEmbargo(a, false);
    expect(game.incomingEmbargoCount(a)).toBe(2);
    b.stopEmbargo(a);
    c.stopEmbargo(a);
    expect(game.incomingEmbargoCount(a)).toBe(0);
  });

  test("a temporary embargo expiring does not change the count", async () => {
    const { game, a, b } = await sanctionScenario();
    b.addEmbargo(a, true);
    b.endTemporaryEmbargo(a);
    expect(game.incomingEmbargoCount(a)).toBe(0);
  });
});

describe("per-game reputation (Realistic World section 8.5)", () => {
  function grantLand(game: Game, players: Player[]): void {
    let i = 0;
    game.map().forEachTile((t) => {
      if (!game.map().isLand(t) || game.map().isImpassable(t)) return;
      players[i++ % players.length].conquer(t);
    });
  }

  test("betrayal tanks reputation THIS game (no persistence)", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
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

  test("reputation recovers over time so a betrayer is not locked out forever", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "a"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "b"),
    ) as Player;
    grantLand(game, [a, b]);
    game.endSpawnPhase();

    a.markTraitor();
    expect(a.reputation()).toBe(-40);
    expect(a.canSendAllianceRequest(b)).toBe(false);

    for (let i = 0; i < 600 * 11; i++) game.executeNextTick();
    expect(a.reputation()).toBe(-29);
    expect(a.canSendAllianceRequest(b)).toBe(true);

    for (let i = 0; i < 600 * 40; i++) game.executeNextTick();
    expect(a.reputation()).toBe(0);
  });

  test("a second betrayal resets the recovery clock and deepens the hole", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "a"),
    ) as Player;
    grantLand(game, [a]);
    game.endSpawnPhase();
    a.markTraitor();
    for (let i = 0; i < 600 * 11; i++) game.executeNextTick();
    a.markTraitor();
    expect(a.reputation()).toBe(-80);
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

describe("chokepoint controllers (Realistic World)", () => {
  test("empty outside Realistic World, one entry per strait inside it", async () => {
    const classic = await setup("big_plains", {});
    expect(classic.chokepointControllers()).toEqual([]);
    const realistic = await setup("world", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    expect(realistic.chokepointControllers()).toHaveLength(CHOKEPOINTS.length);
  });

  test("empty on a World map that is not the Normal size (Compact)", async () => {
    const compact = await setup("big_plains", {
      gameMap: GameMapType.World,
      gameMapSize: GameMapSize.Compact,
      publicGameModifiers: { isRealisticWorld: true },
    });
    expect(compact.config().isRealisticWorld()).toBe(false);
    expect(compact.width()).not.toBe(1000);
    expect(compact.chokepointControllers()).toEqual([]);
    const updates: GameUpdateViewData[] = [];
    const runner = new GameRunner(
      compact,
      new Executor(compact, "game_id", "client"),
      (gu) => updates.push(gu as GameUpdateViewData),
    );
    runner.init();
    runner.addTurn({ turnNumber: 0, intents: [] });
    runner.executeNextTick();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every((u) => u.chokepoints === undefined)).toBe(true);
  });
});
