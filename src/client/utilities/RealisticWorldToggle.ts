import { GameMapType } from "@openfront/engine-api/game/GameTypes";

// Realism only takes effect on the World map, so the toggle only applies there.
export function realisticWorldApplies(
  map: GameMapType,
  enabled: boolean,
): boolean {
  return enabled && map === GameMapType.World;
}
