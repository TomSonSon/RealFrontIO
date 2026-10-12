import type { TileRef } from "@openfront/engine-api/game/GameMap";
import { PlayerType, UnitType } from "@openfront/engine-api/game/GameTypes";
import type { Game, Player } from "../game/Game";

/**
 * Realistic World mode data.
 *
 * When the `isRealisticWorld` game modifier is active, nation players start
 * with starting troops / gold scaled to their real-world military power, and
 * with initial diplomatic relations that mirror the real world (who allies
 * with whom, who is hostile). Everything here is deterministic static data —
 * no randomness, timing or host APIs — so the simulation stays bit-identical
 * across clients.
 *
 * Sources and methodology: see research/real-world-realism/ in the repo root
 * (02-military-capacity.md for strength, 01-power-dynamics-and-alliances.md
 * for relations). These are starting-point values to be tuned in playtests;
 * they are deliberately dampened so a superpower is strong but not a
 * foregone victor.
 */

export interface RealisticNationSeed {
  /** Starting troops for this nation in Realistic World mode. */
  troops: number;
  /** Starting gold for this nation in Realistic World mode. */
  gold: number;
}

/**
 * Per-nation starting strength. Naming matches the nation `name`s declared in
 * map-generator/assets/maps/world/info.json (and mirrored in each map's
 * manifest). Sub-national regions on the World map (California, Siberia, ...)
 * are NOT listed here; they resolve to their parent nation's STRENGTH via
 * SUB_REGION_PARENT below (see realisticSeedFor).
 */
const REALISTIC_SEEDS: Record<string, RealisticNationSeed> = {
  // Superpowers
  "United States": { troops: 100_000, gold: 500_000 },
  China: { troops: 85_000, gold: 420_000 },
  Russia: { troops: 75_000, gold: 380_000 },
  // Major powers
  India: { troops: 62_000, gold: 280_000 },
  "United Kingdom": { troops: 46_000, gold: 260_000 },
  France: { troops: 46_000, gold: 240_000 },
  Japan: { troops: 46_000, gold: 280_000 },
  Germany: { troops: 40_000, gold: 320_000 },
  Türkiye: { troops: 42_000, gold: 200_000 },
  // Strong regionals
  Pakistan: { troops: 40_000, gold: 170_000 },
  Italy: { troops: 38_000, gold: 210_000 },
  Egypt: { troops: 36_000, gold: 150_000 },
  Ukraine: { troops: 38_000, gold: 260_000 },
  Brazil: { troops: 34_000, gold: 180_000 },
  Australia: { troops: 34_000, gold: 200_000 },
  Iran: { troops: 32_000, gold: 140_000 },
  Poland: { troops: 34_000, gold: 220_000 },
  "Saudi Arabia": { troops: 30_000, gold: 240_000 },
  Taiwan: { troops: 30_000, gold: 170_000 },
  Spain: { troops: 30_000, gold: 170_000 },
  Canada: { troops: 30_000, gold: 200_000 },
  Indonesia: { troops: 30_000, gold: 160_000 },
  // Middle powers
  Algeria: { troops: 26_000, gold: 130_000 },
  Mexico: { troops: 26_000, gold: 130_000 },
  Colombia: { troops: 26_000, gold: 120_000 },
  Thailand: { troops: 26_000, gold: 120_000 },
  Israel: { troops: 28_000, gold: 160_000 },
  Sweden: { troops: 24_000, gold: 140_000 },
  Norway: { troops: 22_000, gold: 120_000 },
  Finland: { troops: 22_000, gold: 120_000 },
  Argentina: { troops: 22_000, gold: 100_000 },
  "South Africa": { troops: 22_000, gold: 100_000 },
  Morocco: { troops: 22_000, gold: 90_000 },
  Romania: { troops: 20_000, gold: 90_000 },
  Belarus: { troops: 20_000, gold: 80_000 },
  Ethiopia: { troops: 20_000, gold: 70_000 },
  Venezuela: { troops: 20_000, gold: 80_000 },
  Peru: { troops: 20_000, gold: 80_000 },
  Philippines: { troops: 20_000, gold: 90_000 },
  "New Zealand": { troops: 18_000, gold: 80_000 },
  Kazakhstan: { troops: 18_000, gold: 70_000 },
  Sudan: { troops: 18_000, gold: 60_000 },
  Oman: { troops: 18_000, gold: 70_000 },
  Cuba: { troops: 15_000, gold: 55_000 },
  "DR Congo": { troops: 15_000, gold: 50_000 },
  Kenya: { troops: 15_000, gold: 55_000 },
  Mongolia: { troops: 14_000, gold: 45_000 },
  Bolivia: { troops: 14_000, gold: 45_000 },
  Uruguay: { troops: 13_000, gold: 45_000 },
  Libya: { troops: 13_000, gold: 45_000 },
  "Sri Lanka": { troops: 13_000, gold: 50_000 },
  Zambia: { troops: 13_000, gold: 40_000 },
  Senegal: { troops: 13_000, gold: 40_000 },
  Chad: { troops: 12_000, gold: 35_000 },
  Ireland: { troops: 12_000, gold: 45_000 },
  Namibia: { troops: 12_000, gold: 35_000 },
  Niger: { troops: 12_000, gold: 30_000 },
  Madagascar: { troops: 12_000, gold: 30_000 },
  Benin: { troops: 12_000, gold: 30_000 },
  Bhutan: { troops: 10_000, gold: 25_000 },
  Greenland: { troops: 8_000, gold: 20_000 },
  Iceland: { troops: 8_000, gold: 20_000 },
};

/**
 * Sub-national regions that share a parent nation's DIPLOMATIC relations
 * (and, via strongestParentAlias below, a fractional strength). Keyed by the
 * World-map nation `name`, mapped to the sovereign they belong to.
 */
const SUB_REGION_PARENT: Record<string, string> = {
  Alaska: "United States",
  California: "United States",
  Texas: "United States",
  Nunavut: "Canada",
  Yukon: "Canada",
  Quebec: "Canada",
  Siberia: "Russia",
};

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
  return REALISTIC_SEEDS[name];
}

/**
 * Starting relations for a nation, keyed by the OTHER nation's name, mapped to
 * a raw relation score in [-100, 100]. The Relation enum buckets: >= 50
 * Friendly, -49..49 Neutral (0 default), < -50 Hostile; -50..-1 Distrustful.
 *
 * Convention used here:
 *   +80 = allied / close friend     (Friendly)
 *   +60 = strong partner            (Friendly)
 *   +30..40 = cooperation/hedge     (Neutral-ish, mild)
 *   -40 = tense rivalry             (Distrustful)
 *   -60..-80 = hostile / adversary  (Hostile)
 *
 * Unlisted pairs default to neutral (0). Sub-regions resolve to their parent's
 * relations via realisticRelationsFor.
 */
const REALISTIC_RELATIONS: Record<string, Record<string, number>> = {
  "United States": {
    "United Kingdom": 80,
    France: 80,
    Germany: 80,
    Japan: 80,
    Canada: 80,
    Australia: 80,
    Norway: 80,
    Sweden: 80,
    Finland: 80,
    Poland: 80,
    Spain: 80,
    Italy: 80,
    "New Zealand": 80,
    Ukraine: 80,
    Latvia: 80,
    Ireland: 70,
    Colombia: 60,
    Mexico: 60,
    Türkiye: 60,
    India: 60,
    "Saudi Arabia": 60,
    Philippines: 80,
    Taiwan: 70,
    Israel: 80,
    Brazil: 50,
    Peru: 50,
    Argentina: 40,
    "South Africa": 40,
    China: -60,
    Russia: -80,
    Iran: -80,
    Venezuela: -80,
    Cuba: -60,
    Sudan: -40,
  },
  China: {
    Russia: 80,
    Pakistan: 80,
    Iran: 60,
    Kazakhstan: 60,
    Belarus: 40,
    Venezuela: 60,
    Cuba: 60,
    Brazil: 40,
    Algeria: 40,
    Zambia: 40,
    "United States": -60,
    Japan: -60,
    Taiwan: -80,
    India: -40,
    Philippines: -40,
    Australia: -40,
    "New Zealand": -40,
    Canada: -40,
    Mongolia: 40,
    Thailand: 40,
    Indonesia: 30,
    "Sri Lanka": 40,
  },
  Russia: {
    China: 80,
    Belarus: 100,
    Iran: 80,
    India: 60,
    Kazakhstan: 60,
    Venezuela: 60,
    Cuba: 60,
    Algeria: 50,
    Türkiye: 30,
    "Sri Lanka": 30,
    "United States": -80,
    Ukraine: -100,
    Poland: -100,
    Latvia: -100,
    Germany: -80,
    France: -80,
    "United Kingdom": -80,
    Finland: -80,
    Norway: -80,
    Sweden: -80,
    Canada: -60,
    Japan: -40,
    Estonia: -100,
  },
  India: {
    "United States": 60,
    Russia: 60,
    Japan: 60,
    Australia: 60,
    "United Kingdom": 60,
    France: 60,
    Bhutan: 50,
    "Sri Lanka": 40,
    Pakistan: -70,
    China: -40,
  },
  "United Kingdom": {
    "United States": 80,
    Canada: 70,
    Australia: 80,
    "New Zealand": 80,
    France: 80,
    Germany: 80,
    Japan: 70,
    India: 60,
    Poland: 70,
    Ukraine: 80,
    Norway: 60,
    Sweden: 60,
    Spain: 60,
    Italy: 60,
    "Saudi Arabia": 60,
    Turkey: 60,
    Russia: -80,
    China: -40,
  },
  France: {
    "United States": 80,
    "United Kingdom": 80,
    Germany: 80,
    Spain: 70,
    Italy: 70,
    Poland: 60,
    Canada: 60,
    Japan: 60,
    India: 60,
    Australia: 60,
    Ukraine: 80,
    Morocco: 60,
    "Saudi Arabia": 50,
    Russia: -80,
    Algeria: -40,
    China: -40,
  },
  Germany: {
    "United States": 80,
    France: 80,
    "United Kingdom": 80,
    Poland: 70,
    Ukraine: 80,
    Canada: 60,
    Japan: 60,
    Italy: 70,
    Norway: 60,
    Sweden: 60,
    Latvia: 60,
    Spain: 60,
    Russia: -80,
    China: -40,
  },
  Japan: {
    "United States": 80,
    Australia: 80,
    "United Kingdom": 70,
    Canada: 60,
    India: 60,
    France: 60,
    Philippines: 60,
    Taiwan: 60,
    "New Zealand": 50,
    China: -60,
    Russia: -40,
  },
  Türkiye: {
    "United States": 60,
    Germany: 60,
    France: 60,
    "United Kingdom": 60,
    Pakistan: 60,
    "Saudi Arabia": 60,
    Azerbaijan: 0,
    Greece: -60,
    Russia: 30,
    Iran: 40,
    Egypt: 40,
  },
  Pakistan: {
    China: 80,
    "Saudi Arabia": 70,
    Türkiye: 60,
    "United States": 40,
    Iran: 40,
    India: -70,
  },
  Italy: {
    "United States": 80,
    France: 70,
    Germany: 70,
    "United Kingdom": 60,
    Spain: 70,
    Greece: 60,
    Russia: -60,
  },
  Egypt: {
    "United States": 70,
    "Saudi Arabia": 60,
    France: 50,
    Russia: 30,
    Türkiye: 40,
    Sudan: 30,
    Algeria: 30,
    Ethiopia: -40,
  },
  Ukraine: {
    "United States": 80,
    "United Kingdom": 80,
    France: 80,
    Germany: 80,
    Poland: 80,
    Canada: 80,
    Latvia: 80,
    Finland: 80,
    Sweden: 80,
    Russia: -100,
    Belarus: -80,
  },
  Brazil: {
    "United States": 60,
    Argentina: 50,
    Mexico: 40,
    Colombia: 40,
    France: 40,
    Russia: 40,
    China: 40,
    Uruguay: 50,
  },
  Australia: {
    "United States": 80,
    "United Kingdom": 80,
    Japan: 80,
    "New Zealand": 80,
    Canada: 70,
    India: 60,
    France: 60,
    China: -40,
  },
  Iran: {
    Russia: 80,
    China: 60,
    Venezuela: 60,
    Cuba: 60,
    Pakistan: 40,
    Türkiye: 40,
    "United States": -80,
    "Saudi Arabia": -30,
  },
  Poland: {
    "United States": 80,
    "United Kingdom": 70,
    Germany: 70,
    France: 60,
    Ukraine: 80,
    Latvia: 80,
    Sweden: 60,
    Finland: 60,
    Canada: 60,
    Russia: -100,
    Belarus: -80,
  },
  "Saudi Arabia": {
    "United States": 70,
    "United Kingdom": 60,
    Pakistan: 70,
    Egypt: 60,
    Türkiye: 60,
    Morocco: 50,
    Oman: 60,
    Iran: -30,
  },
  Taiwan: {
    "United States": 70,
    Japan: 60,
    Australia: 40,
    Philippines: 40,
    China: -80,
  },
  Spain: {
    "United States": 80,
    France: 70,
    "United Kingdom": 60,
    Italy: 70,
    Morocco: 60,
    Argentina: 50,
    Mexico: 50,
    Colombia: 50,
    Australia: 50,
    Algeria: -40,
  },
  Canada: {
    "United States": 80,
    "United Kingdom": 70,
    Australia: 70,
    France: 60,
    "New Zealand": 60,
    Japan: 60,
    Norway: 60,
    Mexico: 50,
    Russia: -60,
    China: -40,
  },
  Indonesia: { "United States": 40, Japan: 40, Australia: 40, China: 30 },
  Mexico: {
    "United States": 60,
    Canada: 50,
    Colombia: 50,
    Spain: 50,
    Brazil: 40,
  },
  Colombia: {
    "United States": 70,
    Canada: 50,
    Mexico: 50,
    Brazil: 40,
    Spain: 50,
    Peru: 50,
    Venezuela: -30,
  },
  Belarus: {
    Russia: 100,
    China: 40,
    Venezuela: 40,
    "United States": -60,
    Ukraine: -80,
    Poland: -80,
    Latvia: -80,
    Germany: -60,
    France: -60,
    "United Kingdom": -60,
  },
  Latvia: {
    "United States": 80,
    Poland: 80,
    Sweden: 70,
    Finland: 70,
    Ukraine: 80,
    "United Kingdom": 60,
    Germany: 60,
    Russia: -100,
    Belarus: -80,
  },
  Norway: {
    "United States": 80,
    "United Kingdom": 60,
    Sweden: 80,
    Finland: 70,
    Canada: 60,
    Germany: 60,
    Russia: -80,
  },
  Sweden: {
    "United States": 80,
    Norway: 80,
    Finland: 80,
    "United Kingdom": 60,
    Poland: 60,
    Canada: 60,
    Germany: 60,
    Russia: -80,
  },
  Finland: {
    "United States": 70,
    Sweden: 80,
    Norway: 70,
    Poland: 60,
    Latvia: 70,
    Ukraine: 70,
    Russia: -80,
  },
  Philippines: {
    "United States": 80,
    Japan: 60,
    Australia: 50,
    Taiwan: 40,
    China: -40,
  },
  Thailand: { "United States": 50, Japan: 40, China: 40 },
  "New Zealand": {
    Australia: 80,
    "United States": 70,
    "United Kingdom": 70,
    Canada: 60,
    Japan: 50,
  },
  Venezuela: {
    Russia: 60,
    China: 60,
    Cuba: 60,
    Iran: 60,
    "United States": -80,
    Colombia: -30,
  },
  Cuba: {
    Russia: 60,
    China: 60,
    Venezuela: 60,
    Iran: 50,
    "United States": -70,
  },
  Peru: { "United States": 50, Colombia: 50, Brazil: 40, Bolivia: 30 },
  Bolivia: { Peru: 30, Brazil: 40, Argentina: 30 },
  Uruguay: { Brazil: 50, Argentina: 50, "United States": 40 },
  Argentina: {
    Brazil: 50,
    "United States": 40,
    Spain: 50,
    Mexico: 40,
    France: 40,
    "United Kingdom": -40,
    Uruguay: 50,
  },
  Algeria: {
    Russia: 50,
    China: 40,
    Morocco: -40,
    France: -40,
    Spain: -40,
    Libya: 30,
    Egypt: 30,
  },
  Morocco: {
    "United States": 60,
    France: 60,
    Spain: 60,
    "Saudi Arabia": 50,
    Egypt: 40,
    Algeria: -40,
  },
  Ethiopia: { Egypt: -40, Kenya: 30 },
  Libya: { Algeria: 30, Egypt: 30, Italy: 30, Russia: 40, Türkiye: 30 },
  Sudan: {
    Egypt: 30,
    "Saudi Arabia": 40,
    Russia: 40,
    Ethiopia: 20,
    "United States": -40,
  },
  Kenya: { "United States": 60, "United Kingdom": 50, Ethiopia: 30 },
  Senegal: { France: 60, "United States": 50, Morocco: 30 },
  Niger: { France: -40, "United States": -40, Russia: 40, Algeria: 30 },
  Chad: { France: -30, Russia: 30, Sudan: 20 },
  "DR Congo": { France: 30, Russia: 20, China: 30 },
  "South Africa": {
    "United States": 30,
    "United Kingdom": 30,
    India: 30,
    Russia: 20,
    China: 30,
  },
  Madagascar: { France: 50, "South Africa": 20 },
  Namibia: { "South Africa": 30, China: 30, Germany: 20 },
  Zambia: { China: 40, "South Africa": 20, India: 20 },
  Benin: { France: 50, "United States": 40, China: 30 },
  Oman: {
    "United States": 60,
    "United Kingdom": 60,
    "Saudi Arabia": 60,
    Iran: 40,
  },
  Kazakhstan: {
    Russia: 60,
    China: 60,
    India: 40,
    "United States": 30,
    Türkiye: 30,
  },
  Mongolia: { China: 40, Russia: 40, "United States": 30, Japan: 30 },
  "Sri Lanka": { India: 40, China: 40, Japan: 30 },
  Bhutan: { India: 50, China: 30 },
  Ireland: {
    "United States": 70,
    "United Kingdom": 60,
    Canada: 60,
    Australia: 60,
    France: 50,
    Germany: 50,
  },
};

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
 * in game state like any other unit — no extra snapshot state needed.
 */
export function placeNationCapital(
  game: Game,
  player: Player,
  preferredTile?: TileRef,
): void {
  if (player.type() !== PlayerType.Nation) return;
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
    player.buildUnit(UnitType.City, tile, {});
  }
}
