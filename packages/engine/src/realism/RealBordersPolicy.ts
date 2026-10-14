import { TileRef } from "@openfront/engine-api/game/GameMap";
import { Relation, TerraNullius } from "@openfront/engine-api/game/GameTypes";
import {
  countryIndexRemap,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import { decodeRealWorldCountryRaster } from "@openfront/engine-api/resources/RealWorldCountries";
import { realBordersCountry } from "@openfront/engine-lib/configuration/RealBordersStrength";
import { Game, Player } from "../game/Game";
import { isRealismCountry } from "./RealisticWorld";

/** Real borders: nation attack interval multipliers. Slow countries get the extra factor. */
export const REAL_BORDERS_ATTACK_INTERVAL_SCALE = 3;
export const REAL_BORDERS_SLOW_INTERVAL_SCALE = 2;
/** Real borders: share of its troops an AI sends in one offensive land attack. */
export const REAL_BORDERS_ATTACK_TROOP_SHARE = 0.15;
/** Real borders: ticks an AI holds back offensives after the country it attacked died. */
export const REAL_BORDERS_CONQUEST_COOLDOWN_TICKS = 3000;
/** Real borders: an AI above this share of all land only retaliates. */
export const REAL_BORDERS_WEARY_LAND_SHARE = 0.04;

/** Real borders: AI nations stop building cities once their troop cap reaches this multiple of their start. */
export const REAL_BORDERS_AI_CAP_START_MULT = 2.2;

/** Real borders: true when more cities would push the nation's troop cap past its limit. */
export function isCityCapReached(game: Game, player: Player): boolean {
  if (!game.config().isRealBorders()) return false;
  const country = realBordersCountry(player.realismKey());
  return (
    country !== undefined &&
    game.config().maxTroops(player) >=
      REAL_BORDERS_AI_CAP_START_MULT * country.start
  );
}

/** True when `target` is attacking `attacker` right now. */
export function isRetaliation(attacker: Player, target: Player): boolean {
  return attacker.incomingAttacks().some((a) => a.attacker() === target);
}

/** Real borders: war weariness, an AI that holds too much land stops starting wars. */
export function isWarWeary(game: Game, attacker: Player): boolean {
  return (
    attacker.numTilesOwned() >
    REAL_BORDERS_WEARY_LAND_SHARE * game.totalLandTiles()
  );
}

/**
 * Real borders: whether an AI nation may attack `target` right now.
 *
 * Nothing is attacked during the peace window, which is the nation spawn
 * immunity (3 minutes after the spawn phase). After it, a player may be
 * attacked when it is attacking the attacker right now (retaliation), or when
 * it is Hostile toward the attacker, shares a land border with it, and the
 * attacker is not war weary. Allies and friendly players are never attacked.
 * Other modes are unchanged.
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
  if (isRetaliation(attacker, target)) return true;
  if (isWarWeary(game, attacker)) return false;
  return (
    attacker.relation(target) === Relation.Hostile &&
    attacker.sharesBorderWith(target)
  );
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
  const raster = decodeRealWorldCountryRaster();
  const remap = countryIndexRemap();
  for (const t of tiles) {
    if (remap[raster[t]] !== index) return false;
  }
  return true;
}
