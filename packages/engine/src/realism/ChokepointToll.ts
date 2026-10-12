import type { TileRef } from "@openfront/engine-api/game/GameMap";
import type { Gold } from "@openfront/engine-api/game/GameTypes";
import {
  Chokepoint,
  ChokepointTier,
  TIER_BASE_TOLL,
} from "@openfront/engine-api/resources/Chokepoints";
import type { Game, Player } from "../game/Game";

/**
 * ChokepointToll.ts — strategic chokepoint toll & interdiction helpers
 * (research/real-world-realism/12-chokepoints.md §8.8a).
 *
 * Everything here is PURE and deterministic over existing game state (static
 * terrain + tile ownership), so the mechanic is bit-identical on every client.
 * The behaviour is only *invoked* when `EngineConfig.isRealisticWorld()` is on
 * (see TradeShipExecution); these functions never touch config themselves, and
 * classic mode is byte-for-byte unchanged because the caller short-circuits.
 *
 * The companion data module `packages/engine-api/src/resources/Chokepoints.ts`
 * is READ ONLY and imported here.
 */

/**
 * Determine who controls a chokepoint, recomputed from current tile ownership
 * (never a stored claim, so capturing coasts flips control automatically).
 *
 * Rule (task §8.8a / 12-chokepoints.md §3): walk every tile in the strait's
 * water `bbox`, find the actual Ocean tiles ("water band"), and tally every
 * adjacent land tile (8-directional) by its owner. The controller is the
 * player owning the most such coastal land tiles; ties resolve to the smaller
 * `smallID` (players always have a distinct smallID). Terra-nullius-only
 * windows yield `null` (no controller ⇒ free transit).
 *
 * Deterministic: fixed bbox scan order + a count-then-smallID comparison that
 * is independent of Map iteration order.
 */
export function chokepointController(
  game: Game,
  cp: Chokepoint,
): Player | null {
  const map = game.map();
  const counts = new Map<number, number>(); // smallID -> # owned coastal land tiles
  const byID = new Map<number, Player>(); // smallID -> Player
  const counted = new Set<number>(); // land tiles already credited to this strait
  const nbuf = new Array<TileRef>(8);

  for (let y = cp.bbox.y0; y <= cp.bbox.y1; y++) {
    for (let x = cp.bbox.x0; x <= cp.bbox.x1; x++) {
      if (!map.isValidCoord(x, y)) continue;
      const water = map.ref(x, y);
      if (!map.isOcean(water)) continue;
      const n = game.neighbors8(water, nbuf);
      for (let i = 0; i < n; i++) {
        const land = nbuf[i];
        if (counted.has(land)) continue;
        counted.add(land);
        if (!map.isLand(land)) continue;
        const ownerID = map.ownerID(land);
        if (ownerID === 0) continue; // terra nullius
        counts.set(ownerID, (counts.get(ownerID) ?? 0) + 1);
        byID.set(ownerID, game.playerBySmallID(ownerID) as Player);
      }
    }
  }

  // Plurality, then tie-break by smaller smallID (deterministic).
  let bestID: number | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && (bestID === null || id < bestID))
    ) {
      bestID = id;
      bestCount = count;
    }
  }
  return bestID === null ? null : (byID.get(bestID) ?? null);
}

/**
 * Fixed per-transit toll (Model A, 12-chokepoints.md §4.2): base the toll on
 * the strait's tier (`TIER_BASE_TOLL`), scaled by `goldMultiplier()` so it
 * stays meaningful in high-gold games. One toll per strait per voyage (the
 * caller caps it), so this is just the unit amount.
 */
export function tollForTier(
  tier: ChokepointTier,
  goldMultiplier: number,
): Gold {
  return BigInt(Math.round(TIER_BASE_TOLL[tier] * goldMultiplier));
}

/**
 * The toll-free check for right-of-passage (12-chokepoints.md §4.1): the
 * controller's own ships, teammates, and allies transit toll-free.
 */
export function isTollExempt(shipOwner: Player, controller: Player): boolean {
  if (shipOwner.id() === controller.id()) return true;
  if (shipOwner.isOnSameTeam(controller)) return true;
  if (shipOwner.isAlliedWith(controller)) return true;
  return false;
}

/**
 * Interdiction multiplier (12-chokepoints.md §5): a controller that interdicts
 * a ship's transit reduces its voyage value by `suggestedInterdictionFraction`
 * (e.g. 0.5 for Hormuz ⇒ the ship keeps 0.5). Applied with Math.floor on the
 * final payout in the caller.
 */
export function interdictMultiplier(cp: Chokepoint): number {
  return 1 - cp.suggestedInterdictionFraction;
}
