import { TileRef } from "@openfront/engine-api/game/GameMap";
import { Relation, TerraNullius } from "@openfront/engine-api/game/GameTypes";
import {
  countryIndexRemap,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import { decodeWorldCountryRaster } from "@openfront/engine-api/resources/WorldCountries";
import { Game, Player } from "../game/Game";
import { isRealismCountry } from "./RealisticWorld";

/** Real borders: nation attack interval multipliers. Slow countries get the extra factor. */
export const REAL_BORDERS_ATTACK_INTERVAL_SCALE = 3;
export const REAL_BORDERS_SLOW_INTERVAL_SCALE = 2;

/**
 * Real borders: whether an AI nation may attack `target` right now.
 *
 * Nothing is attacked during the peace window, which is the nation spawn
 * immunity (3 minutes after the spawn phase). After it, a player may be
 * attacked only when it is Hostile toward the attacker or is attacking the
 * attacker right now (retaliation). Allies and friendly players are never
 * attacked. Other modes are unchanged.
 */
export function canAiAttack(
  game: Game,
  attacker: Player,
  target: Player | TerraNullius,
): boolean {
  if (!game.config().isRealBorders()) return true;
  if (game.isNationSpawnImmunityActive()) return false;
  if (!target.isPlayer()) return true;
  if (attacker.isFriendly(target)) return false;
  if (attacker.relation(target) === Relation.Hostile) return true;
  return attacker.incomingAttacks().some((a) => a.attacker() === target);
}

let rosterIndexByName: Map<string, number> | undefined;

/** The roster index of the country `player` plays, or undefined for other players. */
export function homeRosterIndex(player: Player): number | undefined {
  if (!isRealismCountry(player)) return undefined;
  rosterIndexByName ??= new Map(roster().map((c) => [c.name, c.index]));
  return rosterIndexByName.get(player.realismKey());
}

/**
 * True when every tile is raster land that the country was given at tick 0,
 * so the cluster is an original piece of the country and not conquered land.
 */
export function isHomeCluster(
  player: Player,
  tiles: readonly TileRef[],
): boolean {
  const index = homeRosterIndex(player);
  if (index === undefined) return false;
  const raster = decodeWorldCountryRaster();
  const remap = countryIndexRemap();
  for (const t of tiles) {
    if (remap[raster[t]] !== index) return false;
  }
  return true;
}
