/**
 * Static tech-tree node data and pure purchase rules, shared by the engine and
 * the client UI (Realistic World). No engine internals.
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
 * problem (section 6.1).
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

/** Hard ceiling on total owned ranks per player - the anti-snowball clamp. */
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

/** Pure affordability + prerequisite + rank-cap check, used by engine and UI. */
export function canPurchaseTech(
  id: string,
  ownedNodeIds: readonly string[],
  gold: bigint | number,
): boolean {
  const node = NODE_BY_ID.get(id);
  if (node === undefined) return false;
  if (!canPurchase(new Set(ownedNodeIds), id)) return false;
  return gold >= node.cost;
}
