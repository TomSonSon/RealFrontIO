import { snapshotType } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";

/**
 * Tech tree (Realistic World mode, v1).
 *
 * A per-game, deterministic tech/skill tree with two branches (MILITARY and
 * ECONOMY) x three escalating tiers. Nations and players spend gold during a
 * match to unlock tiers that apply small numeric multipliers to existing
 * engine systems. Everything here is pure data + pure functions: no wall clock,
 * no RNG, so the simulation stays bit-identical across clients and the whole
 * tree is unit-testable. Classic mode is untouched — every multiplier returns
 * identity unless `isRealisticWorld()` is on (see EngineConfig.techMultipliersFor).
 *
 * This is the reference for research/real-world-realism/11-leveling-and-tech-tree.md,
 * sliced to the v1 cut (skeleton + Military + Economy, items 1-3 of §6.5).
 * Numbers are playtest starting points, deliberately power-dampened: no
 * single system exceeds ~1.5x, and the hard rank cap prevents snowballing.
 */

export type TechBranch = "military" | "economy";

/**
 * The named engine effects a node can contribute. Each is an ADDEND added to a
 * final multiplier that starts at 1 (the "goldMultiplierFor" pattern):
 *   - troopRegen:   scales troop regeneration (troopIncreaseRate)
 *   - attackPower:  scales troop combat power (attack amount / per-tile losses)
 *   - goldIncome:   scales passive gold income (goldAdditionRate)
 *   - structureCost: scales unit/structure cost (negative addend = cheaper)
 *
 * Same-hook addends SUM within a branch (transparent + bounded); different
 * hooks never combine with each other, avoiding the compounding "squaring"
 * problem (§6.1).
 */
export interface TechEffects {
  troopRegen?: number;
  attackPower?: number;
  goldIncome?: number;
  structureCost?: number;
}

export interface TechNodeDef {
  id: string;
  branch: TechBranch;
  /** 1-based tier within the branch. */
  tier: number;
  name: string;
  /** Gold cost (rising with tier). */
  cost: number;
  effects: TechEffects;
}

/**
 * Escalating tier cost: BASE_TECH * 2^(tier-1) -> 25k / 50k / 100k.
 * A mid-power nation (~140-320k starting gold, RealisticWorld seeds) can afford
 * a couple of early tiers, forcing a "choose your doctrine" choice.
 */
export const BASE_TECH_COST = 25_000;

/** Hard ceiling on total owned ranks per player — the anti-snowball clamp. */
export const CAP_TOTAL_RANKS = 5;

export const TECH_NODES: readonly TechNodeDef[] = [
  // --- MILITARY / GROUND (troop staying power + combat power) ---
  {
    id: "military_1",
    branch: "military",
    tier: 1,
    name: "Conscript Drill",
    cost: 25_000,
    effects: { troopRegen: 0.25 },
  },
  {
    id: "military_2",
    branch: "military",
    tier: 2,
    name: "Modern Small Arms",
    cost: 50_000,
    effects: { attackPower: 0.2 },
  },
  {
    id: "military_3",
    branch: "military",
    tier: 3,
    name: "Armored Division",
    cost: 100_000,
    effects: { troopRegen: 0.15, attackPower: 0.2 },
  },
  // --- ECONOMY (budget engine that funds everything else) ---
  {
    id: "economy_1",
    branch: "economy",
    tier: 1,
    name: "Treasury Reforms",
    cost: 25_000,
    effects: { goldIncome: 0.2 },
  },
  {
    id: "economy_2",
    branch: "economy",
    tier: 2,
    name: "Trade Liberalization",
    cost: 50_000,
    effects: { goldIncome: 0.25 },
  },
  {
    id: "economy_3",
    branch: "economy",
    tier: 3,
    name: "Industrial Base",
    cost: 100_000,
    effects: { structureCost: -0.15 },
  },
];

const NODE_BY_ID = new Map<string, TechNodeDef>(
  TECH_NODES.map((n) => [n.id, n]),
);

/** Total number of nodes in the tree. */
export const TECH_NODE_COUNT = TECH_NODES.length;

export function nodeById(id: string): TechNodeDef | undefined {
  return NODE_BY_ID.get(id);
}

/** All node ids, in a fixed declaration order (deterministic iteration). */
export function allNodeIds(): readonly string[] {
  return TECH_NODES.map((n) => n.id);
}

/** Within-branch prereq: a tier-N node needs the tier-(N-1) node of the same branch. */
export function isUnlocked(
  ownedNodeIds: ReadonlySet<string>,
  id: string,
): boolean {
  const node = NODE_BY_ID.get(id);
  if (node === undefined) return false;
  if (node.tier === 1) return true;
  const prev = nodeById(`${node.branch}_${node.tier - 1}`);
  return prev !== undefined && ownedNodeIds.has(prev.id);
}

/** A node can be purchased when unlocked, not yet owned, and under the rank cap. */
export function canPurchase(
  ownedNodeIds: ReadonlySet<string>,
  id: string,
): boolean {
  const node = NODE_BY_ID.get(id);
  if (node === undefined) return false;
  if (ownedNodeIds.has(id)) return false;
  if (ownedNodeIds.size >= CAP_TOTAL_RANKS) return false;
  return isUnlocked(ownedNodeIds, id);
}

/**
 * The aggregate multipliers for an owned set of nodes. Sums the per-hook
 * addends onto a base of 1 (identity = no tech / classic mode). Returns a fresh
 * object each call; callers treat it as immutable.
 */
export interface TechMultipliers {
  troopRegen: number;
  attackPower: number;
  goldIncome: number;
  structureCost: number;
}

export const IDENTITY_MULTIPLIERS: TechMultipliers = {
  troopRegen: 1,
  attackPower: 1,
  goldIncome: 1,
  structureCost: 1,
};

export function computeMultipliers(
  ownedNodeIds: ReadonlySet<string>,
): TechMultipliers {
  if (ownedNodeIds.size === 0) return { ...IDENTITY_MULTIPLIERS };
  let troopRegen = 1;
  let attackPower = 1;
  let goldIncome = 1;
  let structureCost = 1;
  for (const id of ownedNodeIds) {
    const node = NODE_BY_ID.get(id);
    if (node === undefined) continue;
    if (node.effects.troopRegen !== undefined)
      troopRegen += node.effects.troopRegen;
    if (node.effects.attackPower !== undefined)
      attackPower += node.effects.attackPower;
    if (node.effects.goldIncome !== undefined)
      goldIncome += node.effects.goldIncome;
    if (node.effects.structureCost !== undefined)
      structureCost += node.effects.structureCost;
  }
  return { troopRegen, attackPower, goldIncome, structureCost };
}

/**
 * Snapshot for the whole game's tech trees, keyed by player smallID in a fixed
 * sorted order (deterministic, snapshot-safe). Owned node ids are stored per
 * player as an array. This lives in the GAME snapshot (not per-player) so the
 * per-player schemas and diffGraphs stay untouched.
 */
export const TechTreeSnapshot = snapshotType({
  name: "TechTree",
  version: 1,
  schema: z.object({
    entries: z.array(
      z.tuple([z.number().int().nonnegative(), z.array(z.string())]),
    ),
  }),
});
export type TechTreeState = z.infer<typeof TechTreeSnapshot.schema>;
