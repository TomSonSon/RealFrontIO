import { snapshotType } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
export {
  allNodeIds,
  BASE_TECH_COST,
  canPurchase,
  canPurchaseTech,
  CAP_TOTAL_RANKS,
  computeMultipliers,
  IDENTITY_MULTIPLIERS,
  isUnlocked,
  nodeById,
  TECH_NODE_COUNT,
  TECH_NODES,
} from "@openfront/engine-api/resources/TechNodes";
export type {
  TechBranch,
  TechEffects,
  TechMultipliers,
  TechNodeDef,
} from "@openfront/engine-api/resources/TechNodes";

/**
 * Tech tree (Realistic World mode, v1).
 *
 * A per-game, deterministic tech/skill tree with two branches (MILITARY and
 * ECONOMY) x three escalating tiers. Nations and players spend gold during a
 * match to unlock tiers that apply small numeric multipliers to existing
 * engine systems. Everything here is pure data + pure functions: no wall clock,
 * no RNG, so the simulation stays bit-identical across clients and the whole
 * tree is unit-testable. Classic mode is untouched - every multiplier returns
 * identity unless `isRealisticWorld()` is on (see EngineConfig.techMultipliersFor).
 *
 * This is the reference for research/real-world-realism/11-leveling-and-tech-tree.md,
 * sliced to the v1 cut (skeleton + Military + Economy, items 1-3 of section 6.5).
 * Numbers are playtest starting points, deliberately power-dampened: no
 * single system exceeds ~1.5x, and the hard rank cap prevents snowballing.
 */

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
