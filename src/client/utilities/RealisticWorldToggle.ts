import { GameMapSize, GameMapType } from "@openfront/engine-api/game/GameTypes";
import { computeMultipliers } from "@openfront/engine-api/resources/TechNodes";
import type { GameView, PlayerView } from "../view";

// Realism only takes effect on the Normal-size World map, so the toggle only
// applies there.
export function realisticWorldApplies(
  map: GameMapType,
  enabled: boolean,
  size: GameMapSize | undefined,
): boolean {
  return enabled && map === GameMapType.World && size !== GameMapSize.Compact;
}

// The client Config lacks the engine-only troopRegen tech multiplier, so apply
// it here. Mirrors the engine: only positive regen is scaled, and never past
// the troop cap.
export function techAdjustedTroopIncrease(
  game: GameView,
  player: PlayerView,
): number {
  const config = game.config();
  const rate = config.troopIncreaseRate(player);
  const gc = config.gameConfig();
  if (
    rate <= 0 ||
    !realisticWorldApplies(
      gc.gameMap,
      gc.publicGameModifiers?.isRealisticWorld === true,
      gc.gameMapSize,
    )
  ) {
    return rate;
  }
  const { troopRegen } = computeMultipliers(new Set(player.techRanks()));
  const room = Math.max(0, config.maxTroops(player) - player.troops());
  return Math.min(rate * troopRegen, room);
}
