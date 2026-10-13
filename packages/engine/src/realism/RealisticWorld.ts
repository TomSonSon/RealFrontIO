import type { TileRef } from "@openfront/engine-api/game/GameMap";
import { PlayerType, UnitType } from "@openfront/engine-api/game/GameTypes";
import { blocRelationDefault } from "@openfront/engine-api/resources/RealismBlocs";
import { seedForCountry } from "@openfront/engine-api/resources/RealismCountries";
import type { RealisticNationSeed } from "@openfront/engine-api/resources/RealismData";
import {
  REALISTIC_RELATIONS,
  REALISTIC_SEEDS,
  SUB_REGION_PARENT,
} from "@openfront/engine-api/resources/RealismData";
import type { Game, Player } from "../game/Game";

export { REALISTIC_RELATIONS, REALISTIC_SEEDS, SUB_REGION_PARENT };
export type { RealisticNationSeed };

/**
 * Realistic World mode data.
 *
 * When the `isRealisticWorld` game modifier is active, nation players start
 * with starting troops / gold scaled to their real-world military power, and
 * with initial diplomatic relations that mirror the real world (who allies
 * with whom, who is hostile). Everything here is deterministic static data -
 * no randomness, timing or host APIs - so the simulation stays bit-identical
 * across clients.
 *
 * Sources and methodology: see research/real-world-realism/ in the repo root
 * (02-military-capacity.md for strength, 01-power-dynamics-and-alliances.md
 * for relations). These are starting-point values to be tuned in playtests;
 * they are deliberately dampened so a superpower is strong but not a
 * foregone victor.
 */

/** Fraction of parent strength a sub-region starts with. */
function subRegionFraction(name: string): number {
  switch (name) {
    case "Siberia":
      return 0.4;
    case "California":
    case "Texas":
      return 0.45;
    case "Quebec":
      return 0.5;
    case "Alaska":
      return 0.3;
    case "Nunavut":
    case "Yukon":
      return 0.25;
    default:
      return 0.33;
  }
}

/**
 * Starting strength for a nation by its map `name`. Resolves sub-regions to
 * their parent's seed scaled by a fraction. Returns undefined when the nation
 * has no realistic seed (shouldn't happen for World-map nations).
 */
export function realisticSeedFor(
  name: string,
): RealisticNationSeed | undefined {
  const parent = SUB_REGION_PARENT[name];
  if (parent !== undefined) {
    const base = REALISTIC_SEEDS[parent];
    if (base === undefined) return undefined;
    const f = subRegionFraction(name);
    return {
      troops: Math.round(base.troops * f),
      gold: Math.round(base.gold * f),
    };
  }
  return seedForCountry(name);
}

/**
 * Resolve a nation's starting relations by its map `name` (sub-regions resolve
 * to their parent). Returns a map of other-nation-name -> raw relation score.
 */
export function realisticRelationsFor(
  name: string,
): Record<string, number> | undefined {
  const parent = SUB_REGION_PARENT[name];
  return (
    (parent !== undefined ? REALISTIC_RELATIONS[parent] : undefined) ??
    REALISTIC_RELATIONS[name]
  );
}

/**
 * Starting relation score of `from` toward `to` (both map names), or
 * undefined when unlisted. Either name may be a sub-region, which resolves to
 * its parent. A row listed on `from` wins over the reverse row on `to`, so a
 * listed score applies in both directions unless the other side overrides it.
 */
export function realisticRelationScore(
  from: string,
  to: string,
): number | undefined {
  const directed = (a: string, b: string): number | undefined => {
    const row = realisticRelationsFor(a);
    return row?.[b] ?? row?.[SUB_REGION_PARENT[b]];
  };
  return directed(from, to) ?? directed(to, from);
}

/**
 * A player whose starting relations come from the realism table: a nation, or
 * a human that claimed a country (real borders), which keeps that country's key.
 */
export function isRealismCountry(player: Player): boolean {
  return player.type() === PlayerType.Nation || player.hasRealismKey();
}

/**
 * Starting relation of `from` toward `to`: the explicit row when one exists,
 * otherwise the bloc default when `withBlocs` is set.
 */
export function realisticStartingScore(
  from: string,
  to: string,
  withBlocs: boolean,
): number | undefined {
  return (
    realisticRelationScore(from, to) ??
    (withBlocs ? blocRelationDefault(from, to) : undefined)
  );
}

/**
 * Sets the starting relation of every ordered pair from the realism table.
 * `updateRelation` adds, so call this once per game for each set of players.
 */
export function seedStartingRelations(
  players: readonly Player[],
  withBlocs = false,
): void {
  for (const a of players) {
    for (const b of players) {
      if (b === a) continue;
      const score = realisticStartingScore(
        a.realismKey(),
        b.realismKey(),
        withBlocs,
      );
      if (score === undefined || score === 0) continue;
      a.updateRelation(b, score);
    }
  }
}

/**
 * Whether `tile` is a valid spot for a nation's starting capital city: owned by
 * the nation and buildable land (not impassable).
 */
function isBuildableCapitalTile(
  game: Game,
  player: Player,
  tile: TileRef,
): boolean {
  return (
    game.owner(tile) === player && game.isLand(tile) && !game.isImpassable(tile)
  );
}

/**
 * Realistic World mode: place a nation's starting "capital" city. Prefers
 * `preferredTile` (the map-defined nation spawn / capital location) when the
 * nation owns it, falling back to any other owned land tile. Ships before the
 * nation has spawned (owns nothing) or if cities are disabled. The city is
 * placed as a built structure via the standard build path, so it is persisted
 * in game state like any other unit - no extra snapshot state needed.
 */
export function placeNationCapital(
  game: Game,
  player: Player,
  preferredTile?: TileRef,
): void {
  if (!isRealismCountry(player)) return;
  if (game.config().isUnitDisabled(UnitType.City)) return;

  let tile: TileRef | undefined;
  if (
    preferredTile !== undefined &&
    isBuildableCapitalTile(game, player, preferredTile)
  ) {
    tile = preferredTile;
  }
  if (tile === undefined) {
    for (const t of player.tiles()) {
      if (isBuildableCapitalTile(game, player, t)) {
        tile = t;
        break;
      }
    }
  }
  if (tile !== undefined) {
    // The capital is free: credit the exact price buildUnit is about to charge.
    player.addGold(game.unitInfo(UnitType.City).cost(game, player));
    player.buildUnit(UnitType.City, tile, {});
  }
}
