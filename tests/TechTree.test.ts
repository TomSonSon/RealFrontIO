import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  Nation,
  PlayerInfo,
  PlayerType,
  TerrainType,
} from "@openfront/engine-api/game/GameTypes";
import { PlayerLike } from "@openfront/engine-api/game/ReadViews";
import { GameConfig } from "@openfront/engine-api/Schemas";
import type { AttackLogicInput } from "@openfront/engine/configuration/EngineConfig";
import { Player } from "@openfront/engine/game/Game";
import {
  allNodeIds,
  canPurchase,
  CAP_TOTAL_RANKS,
  computeMultipliers,
  isUnlocked,
  nodeById,
  TECH_NODE_COUNT,
  TECH_NODES,
} from "@openfront/engine/realism/TechTree";
import { describe, expect, it } from "vitest";
import { setup } from "./util/Setup";
import { roundTrip } from "./util/Snapshot";
import { TestConfig, UseRealAttackLogic } from "./util/TestConfig";

/**
 * Realistic World tech tree (v1: MILITARY + ECONOMY branches). All effects are
 * gated behind isRealisticWorld() - classic mode is byte-for-byte unchanged
 * (identity multipliers). Pure math here is deterministic and unit-testable.
 */

function baseConfig(): GameConfig {
  return {
    gameMap: GameMapType.World,
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

/** Minimal PlayerLike stub satisfying the getters EngineConfig reads here. */
function stubPlayer(overrides: Partial<PlayerLike> = {}): PlayerLike {
  return {
    id: () => "pid",
    smallID: () => 1,
    isPlayer: () => true,
    type: () => PlayerType.Human,
    isLobbyCreator: () => false,
    numTilesOwned: () => 100,
    troops: () => 10_000,
    gold: () => 100_000n,
    units: () => [],
    realismKey: () => "me",
    ...overrides,
  };
}

describe("TechTree - definitions", () => {
  it("has two branches and three escalating tiers each", () => {
    expect(TECH_NODE_COUNT).toBe(6);
    const military = TECH_NODES.filter((n) => n.branch === "military");
    const economy = TECH_NODES.filter((n) => n.branch === "economy");
    expect(military).toHaveLength(3);
    expect(economy).toHaveLength(3);
    // Costs escalate with tier inside each branch.
    for (const branch of [military, economy]) {
      const tiers = branch.map((n) => n.tier);
      expect(tiers).toEqual([1, 2, 3]);
      for (let i = 1; i < branch.length; i++) {
        expect(branch[i].cost).toBeGreaterThan(branch[i - 1].cost);
      }
    }
    // Escalating geometric-ish curve: 25k / 50k / 100k.
    expect(nodeById("military_1")!.cost).toBe(25_000);
    expect(nodeById("military_2")!.cost).toBe(50_000);
    expect(nodeById("military_3")!.cost).toBe(100_000);
  });

  it("enforces in-branch tier prereqs", () => {
    expect(isUnlocked(new Set(), "economy_1")).toBe(true);
    expect(isUnlocked(new Set(), "economy_2")).toBe(false); // needs economy_1
    expect(isUnlocked(new Set(["economy_1"]), "economy_2")).toBe(true);
    expect(
      isUnlocked(new Set(["military_1", "military_2"]), "military_3"),
    ).toBe(true);
    // Unknown node never unlocks.
    expect(isUnlocked(new Set(), "nope")).toBe(false);
  });

  it("enforces a hard rank cap (anti-snowball)", () => {
    // Buying into a full roster is refused once at the cap.
    const owned = new Set([...allNodeIds()].slice(0, CAP_TOTAL_RANKS));
    expect(owned.size).toBe(CAP_TOTAL_RANKS);
    expect(canPurchase(owned, "economy_1")).toBe(false); // at cap
    // Under the cap, purchasing is allowed when unlocked + unowned.
    const small = new Set(["economy_1"]);
    expect(canPurchase(small, "economy_2")).toBe(true);
    // Already owned nodes cannot be rebought.
    expect(canPurchase(small, "economy_1")).toBe(false);
  });
});

describe("TechTree - computeMultipliers (deterministic effects)", () => {
  it("returns identity for no tech", () => {
    expect(computeMultipliers(new Set())).toEqual({
      troopRegen: 1,
      attackPower: 1,
      goldIncome: 1,
      structureCost: 1,
    });
  });

  it("sums same-hook addends within a branch onto a base of 1", () => {
    const m = computeMultipliers(
      new Set(["military_1", "military_2", "military_3"]),
    );
    expect(m.troopRegen).toBeCloseTo(1 + 0.25 + 0.15, 5); // 1.4
    expect(m.attackPower).toBeCloseTo(1 + 0.2 + 0.2, 5); // 1.4
    expect(m.goldIncome).toBe(1);
    expect(m.structureCost).toBe(1);
  });

  it("economy nodes boost gold income and cut structure cost", () => {
    const m = computeMultipliers(
      new Set(["economy_1", "economy_2", "economy_3"]),
    );
    expect(m.goldIncome).toBeCloseTo(1 + 0.2 + 0.25, 5); // 1.45
    expect(m.structureCost).toBeCloseTo(1 - 0.15, 5); // 0.85
    expect(m.troopRegen).toBe(1);
  });

  it("is power-dampened: no single system exceeds ~1.5x when fully maxed", () => {
    const m = computeMultipliers(new Set(allNodeIds()));
    for (const v of [m.troopRegen, m.attackPower, m.goldIncome]) {
      expect(v).toBeLessThanOrEqual(1.5);
      expect(v).toBeGreaterThanOrEqual(1);
    }
    expect(m.structureCost).toBeGreaterThan(0.5);
  });

  it("ignores unknown node ids (forward compatibility)", () => {
    const m = computeMultipliers(new Set(["bogus", "economy_1"]));
    expect(m.goldIncome).toBeCloseTo(1.2, 5);
  });
});

describe("TechTree - EngineConfig wiring", () => {
  it("goldAdditionRate scales with the economy branch in Realistic World only", () => {
    const realistic = new TestConfig(realisticConfig(), false);
    const classic = new TestConfig(baseConfig(), false);
    const player = stubPlayer();

    // No provider wired -> identity even in realistic mode.
    expect(realistic.goldAdditionRate(player)).toBe(100n);
    expect(classic.goldAdditionRate(player)).toBe(100n);

    realistic.setTechTreeProvider(() => ({
      troopRegen: 1,
      attackPower: 1,
      goldIncome: 1.45,
      structureCost: 1,
    }));
    expect(realistic.goldAdditionRate(player)).toBe(145n);

    // Classic mode stays identity even with a provider set (gate is realism).
    classic.setTechTreeProvider(() => ({
      troopRegen: 1,
      attackPower: 1,
      goldIncome: 5,
      structureCost: 1,
    }));
    expect(classic.goldAdditionRate(player)).toBe(100n);
  });

  it("troopIncreaseRate scales with the military branch in Realistic World only", () => {
    const realistic = new TestConfig(realisticConfig(), false);
    const classic = new TestConfig(baseConfig(), false);
    const player = stubPlayer({ troops: () => 5_000 });

    realistic.setTechTreeProvider(() => ({
      troopRegen: 1.4,
      attackPower: 1,
      goldIncome: 1,
      structureCost: 1,
    }));
    const boosted = realistic.troopIncreaseRate(player);
    const normal = classic.troopIncreaseRate(player);
    expect(boosted).toBeGreaterThan(normal);
  });

  it("attackLogic applies the Military combat power to the loss denominators", () => {
    const cfg = new UseRealAttackLogic(realisticConfig(), false);
    const input: AttackLogicInput = {
      terrain: TerrainType.Plains,
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
    const baseline = cfg.attackLogic(input);
    const teched = cfg.attackLogic({ ...input, attackerCombatPower: 1.4 });

    // A better-equipped attacker bleeds less per tile...
    expect(teched.attackerTroopLoss).toBeLessThan(baseline.attackerTroopLoss);
    expect(teched.attackerTroopLoss).toBeCloseTo(
      baseline.attackerTroopLoss / 1.4,
      3,
    );
    // ...and inflicts more.
    expect(teched.defenderTroopLoss).toBeGreaterThan(
      baseline.defenderTroopLoss,
    );
    expect(teched.defenderTroopLoss).toBeCloseTo(
      baseline.defenderTroopLoss * 1.4,
      3,
    );
    // Speed is untouched by the tech (pure punch, not pace).
    expect(teched.tickFraction).toBe(baseline.tickFraction);
  });
});

describe("TechTree - live game spend + snapshot", () => {
  async function realisticGame() {
    const nations = [
      new Nation(
        undefined,
        new PlayerInfo("United States", PlayerType.Nation, null, "us_id"),
      ),
      new Nation(
        undefined,
        new PlayerInfo("Mexico", PlayerType.Nation, null, "mx_id"),
      ),
    ];
    return setup(
      "big_plains",
      {
        gameMap: GameMapType.World,
        publicGameModifiers: { isRealisticWorld: true },
      },
      [],
      undefined,
      TestConfig,
      true,
      nations,
    );
  }

  it("spends gold to unlock nodes deterministically and records ownership", async () => {
    const game = await realisticGame();
    const us = game.player("us_id") as Player;
    const startGold = us.gold(); // US realistic seed = 500k

    expect(game.ownedTechNodeIds(us)).toEqual([]);
    expect(game.canPurchaseTech(us, "economy_1")).toBe(true);

    // Buying requires the gold and consumes it.
    expect(game.spendTech(us, "economy_1")).toBe(true);
    expect(game.ownedTechNodeIds(us)).toEqual(["economy_1"]);
    expect(us.gold()).toBe(startGold - 25_000n);

    // Wrong tier order is refused (prereq): can't skip to economy_3.
    expect(game.spendTech(us, "economy_3")).toBe(false);
    // But economy_2 is now unlocked.
    expect(game.spendTech(us, "economy_2")).toBe(true);
    // Rebought node is refused.
    expect(game.spendTech(us, "economy_1")).toBe(false);

    // Unknown node id is refused.
    expect(game.spendTech(us, "nope")).toBe(false);
  });

  it("is disabled entirely in classic mode", async () => {
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
      ],
    );
    const us = game.player("us_id") as Player;
    expect(game.spendTech(us, "economy_1")).toBe(false);
    expect(game.ownedTechNodeIds(us)).toEqual([]);
  });

  it("nations spend via the default policy: rich build economy, poor build military", async () => {
    const game = await realisticGame();
    const us = game.player("us_id") as Player; // 500k -> rich -> economy first
    const mx = game.player("mx_id") as Player; // 130k -> poor -> military first

    // The default policy only spends for territory-owning (alive) nations, as
    // nations do once they actually occupy land. Give each a tile to stand on.
    const land: number[] = [];
    game.map().forEachTile((t) => {
      if (
        land.length < 2 &&
        game.map().isLand(t) &&
        !game.map().isImpassable(t)
      ) {
        land.push(t);
      }
    });
    us.conquer(land[0]);
    mx.conquer(land[1]);

    // Advance past the first policy interval (tick 100).
    for (let i = 0; i < 105; i++) {
      game.executeNextTick();
    }

    expect(game.ownedTechNodeIds(us)).toContain("economy_1");
    expect(game.ownedTechNodeIds(mx)).toContain("military_1");
  });

  it("tech tree state survives a snapshot round-trip", async () => {
    const game = await realisticGame();
    const us = game.player("us_id") as Player;
    game.spendTech(us, "economy_1");
    game.spendTech(us, "economy_2");

    const { restored } = await roundTrip(game, "big_plains");
    const us2 = restored.player("us_id") as Player;
    expect(restored.ownedTechNodeIds(us2)).toEqual(["economy_1", "economy_2"]);
  });
});
