/**
 * Chokepoints.ts
 *
 * STATIC DATA MODULE - no engine imports, no runtime dependencies. Safe to
 * import from anywhere (engine, server, client, tests, tooling).
 *
 * PURPOSE (research: research/real-world-realism/10-economics-and-diplomacy.md
 * s.8.8a "Chokepoint commercial/toll leverage", and
 * research/real-world-realism/05-terrain-and-geography.md s.6 "Sea/Strait
 * Chokepoints & Island Chains").
 *
 * A maritime chokepoint is a narrow strait/canal through which a
 * disproportionate share of trade must pass. Controlling one gives a nation
 * leverage over everyone who uses it: you can tax (toll) or deny (interdict)
 * commerce - the real-world mechanism behind Hormuz, Malacca, Suez, etc.
 *
 * This file is the *map-data pass* called for by s.8.8a: it tags the water
 * bands of the world's major straits on the OpenFront "World" map
 * (2000 x 1000 tiles). The mechanic itself is
 * designed in research/real-world-realism/12-chokepoints.md and is gated
 * behind `isRealisticWorld`.
 *
 * COORDINATES: raw tile coordinates on the 2000 x 1000 Normal World map
 * (origin top-left, x east, y south, both inclusive). The map is stylized, so
 * the boxes are NOT derived from a lat/lon projection: each one was placed by
 * decoding resources/maps/world/map.bin and covers the narrow water passage
 * with coast on both sides. `lat`/`lon` are reference values for docs only.
 */

/** Dimensions of the Normal-size World map the boxes below are valid for. */
export const WORLD_MAP_WIDTH = 2000;
export const WORLD_MAP_HEIGHT = 1000;

/** A pixel bounding box on the World map, inclusive of both corners. */
export type PixelBox = {
  /** left x (west) */
  x0: number;
  /** top y (north) */
  y0: number;
  /** right x (east) */
  x1: number;
  /** bottom y (south) */
  y1: number;
};

/**
 * A per-chokepoint importance tier. Drives the passive toll magnitude and the
 * value of interdiction (see 12-chokepoints.md for the exact numbers). Tiers
 * are just plain string constants so the file stays data-only.
 */
export const CHOKEPOINT_TIERS = {
  /** World-critical energy/trade funnel: Hormuz, Malacca, Bab-el-Mandeb/Suez */
  Global: "Global",
  /** Major regional gateway: Dover, Gibraltar, Turkish Straits, Panama, Taiwan, Luzon */
  Major: "Major",
  /** Significant but more localized: Tsushima, Lombok, Sunda, Danish, Bering, Mozambique, Drake */
  Minor: "Minor",
} as const;

export type ChokepointTier =
  (typeof CHOKEPOINT_TIERS)[keyof typeof CHOKEPOINT_TIERS];

export type Chokepoint = {
  /** Stable unique id (string, never changes once shipped - used in saves). */
  id: string;
  /** Human display name. */
  name: string;
  /** The two bodies of water this strait connects (for docs/UI). */
  connects: [string, string];
  /** Approx. reference lat/long (for docs; not used by the engine). */
  lat: number;
  lon: number;
  /**
   * GENEROUS pixel search region covering the strait's water band plus a
   * margin. A resolver should intersect this with actual Ocean tiles.
   */
  bbox: PixelBox;
  /** Importance tier (drives toll/interdiction magnitude). */
  tier: ChokepointTier;
  /**
   * SUGGESTED toll value per passing trade-ship, in gold. Calibrated against
   * the engine's `tradeShipGold` (~75K-120K per voyage; see EngineConfig) and
   * the research's ~24-45% trade-share figures: a Global strait tolls ~4-6%
   * of a typical voyage. See 12-chokepoints.md for the derivation. This is the
   * FIXED per-transit toll (like real canal Sound Dues), the recommended
   * default; `suggestedTollFraction` is the alternative %-of-value model.
   */
  suggestedTollPerShip: number;
  /**
   * SUGGESTED toll as a FRACTION (0..1) of a transiting trade-ship's eventual
   * gold value - the "% of passing trade gold" model of s.8.8a. Choose ONE of
   * fixed-per-ship (`suggestedTollPerShip`) or this fraction in the mechanic;
   * they should not both apply to the same transit.
   */
  suggestedTollFraction: number;
  /**
   * SUGGESTED interdiction strength: the fraction (0..1) of a passing enemy
   * trade-ship's value the controller can tax/destroy when interdicting.
   */
  suggestedInterdictionFraction: number;
};

/**
 * The full, ordered list of tagged World-map chokepoints. Each `bbox` covers
 * the strait's water plus the coast on both sides so the controller (owner of
 * the adjacent land) can be resolved from tile ownership.
 */
export const CHOKEPOINTS: readonly Chokepoint[] = [
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    connects: ["Persian Gulf", "Gulf of Oman"],
    lat: 26.6,
    lon: 56.3,
    // Musandam gap between the Persian Gulf and the Gulf of Oman.
    bbox: { x0: 1234, y0: 346, x1: 1252, y1: 360 },
    tier: CHOKEPOINT_TIERS.Global,
    suggestedTollPerShip: 5000,
    suggestedTollFraction: 0.05,
    suggestedInterdictionFraction: 0.5,
  },
  {
    id: "malacca",
    name: "Strait of Malacca",
    connects: ["Indian Ocean", "South China Sea"],
    lat: 1.5,
    lon: 102.5,
    // Narrowest part of the strait between Sumatra and the Malay peninsula.
    bbox: { x0: 1478, y0: 478, x1: 1512, y1: 502 },
    tier: CHOKEPOINT_TIERS.Global,
    suggestedTollPerShip: 6000,
    suggestedTollFraction: 0.06,
    suggestedInterdictionFraction: 0.5,
  },
  {
    id: "bab_el_mandeb",
    name: "Strait of Bab-el-Mandeb",
    connects: ["Red Sea", "Gulf of Aden"],
    lat: 12.5,
    lon: 43.3,
    // Southern end of the Red Sea, a few tiles wide between Africa and Arabia.
    bbox: { x0: 1168, y0: 424, x1: 1186, y1: 438 },
    tier: CHOKEPOINT_TIERS.Global,
    suggestedTollPerShip: 4000,
    suggestedTollFraction: 0.05,
    suggestedInterdictionFraction: 0.5,
  },
  {
    id: "suez",
    name: "Suez Canal",
    connects: ["Mediterranean Sea", "Red Sea"],
    lat: 30.5,
    lon: 32.3,
    // Canal water line from the Mediterranean to the Gulf of Suez.
    bbox: { x0: 1108, y0: 316, x1: 1132, y1: 346 },
    tier: CHOKEPOINT_TIERS.Global,
    suggestedTollPerShip: 5000,
    suggestedTollFraction: 0.05,
    suggestedInterdictionFraction: 0.4,
  },
  {
    id: "turkish_straits",
    name: "Bosporus & Dardanelles",
    connects: ["Black Sea", "Aegean Sea"],
    lat: 40.5,
    lon: 27.5,
    // Bosporus, Sea of Marmara and Dardanelles.
    bbox: { x0: 1068, y0: 256, x1: 1100, y1: 286 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 3000,
    suggestedTollFraction: 0.03,
    suggestedInterdictionFraction: 0.4,
  },
  {
    id: "gibraltar",
    name: "Strait of Gibraltar",
    connects: ["Atlantic Ocean", "Mediterranean Sea"],
    lat: 35.95,
    lon: -5.5,
    // Gap between southern Spain and Morocco.
    bbox: { x0: 896, y0: 284, x1: 912, y1: 298 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 3000,
    suggestedTollFraction: 0.03,
    suggestedInterdictionFraction: 0.3,
  },
  {
    id: "panama",
    name: "Panama Canal",
    connects: ["Atlantic Ocean", "Pacific Ocean"],
    lat: 9.0,
    lon: -79.8,
    // Isthmus water gap between the Caribbean and the Pacific.
    bbox: { x0: 490, y0: 448, x1: 512, y1: 462 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 3500,
    suggestedTollFraction: 0.035,
    suggestedInterdictionFraction: 0.4,
  },
  {
    id: "dover",
    name: "Strait of Dover (Pas de Calais)",
    connects: ["North Sea", "English Channel"],
    lat: 51.0,
    lon: 1.4,
    // Narrow channel between Britain and the continent, down to the English Channel.
    bbox: { x0: 934, y0: 190, x1: 952, y1: 206 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 2500,
    suggestedTollFraction: 0.025,
    suggestedInterdictionFraction: 0.3,
  },
  {
    id: "danish_straits",
    name: "Danish Straits (Kattegat/Oresund)",
    connects: ["Baltic Sea", "North Sea"],
    lat: 56.0,
    lon: 10.0,
    // Kattegat exit between Jutland, Zealand and the German coast.
    bbox: { x0: 1012, y0: 166, x1: 1040, y1: 180 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 1500,
    suggestedTollFraction: 0.015,
    suggestedInterdictionFraction: 0.3,
  },
  {
    id: "bering",
    name: "Bering Strait",
    connects: ["Arctic Ocean", "Pacific Ocean"],
    lat: 65.7,
    lon: -168.5,
    // Siberian side of the strait; the map edge splits the strait, so the box cannot wrap to Alaska.
    bbox: { x0: 1976, y0: 100, x1: 1999, y1: 124 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 800,
    suggestedTollFraction: 0.01,
    suggestedInterdictionFraction: 0.2,
  },
  {
    id: "taiwan",
    name: "Taiwan Strait",
    connects: ["East China Sea", "South China Sea"],
    lat: 24.5,
    lon: 119.5,
    // Water between the Chinese coast and Taiwan.
    bbox: { x0: 1590, y0: 356, x1: 1612, y1: 378 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 3500,
    suggestedTollFraction: 0.035,
    suggestedInterdictionFraction: 0.4,
  },
  {
    id: "luzon",
    name: "Luzon Strait",
    connects: ["South China Sea", "Philippine Sea"],
    lat: 21.0,
    lon: 121.0,
    // Water between southern Taiwan and northern Luzon.
    bbox: { x0: 1596, y0: 374, x1: 1622, y1: 398 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 3000,
    suggestedTollFraction: 0.03,
    suggestedInterdictionFraction: 0.35,
  },
  {
    id: "tsushima",
    name: "Korea / Tsushima Strait",
    connects: ["Sea of Japan", "East China Sea"],
    lat: 34.5,
    lon: 129.4,
    // Water between southern Korea and Kyushu.
    bbox: { x0: 1664, y0: 303, x1: 1692, y1: 318 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 1800,
    suggestedTollFraction: 0.02,
    suggestedInterdictionFraction: 0.3,
  },
  {
    id: "lombok",
    name: "Lombok Strait",
    connects: ["Java Sea", "Indian Ocean"],
    lat: -8.5,
    lon: 115.8,
    // Narrow channel between Bali and Lombok.
    bbox: { x0: 1600, y0: 528, x1: 1626, y1: 548 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 1500,
    suggestedTollFraction: 0.015,
    suggestedInterdictionFraction: 0.25,
  },
  {
    id: "sunda",
    name: "Sunda Strait",
    connects: ["Indian Ocean", "Java Sea"],
    lat: -6.0,
    lon: 105.5,
    // Gap between southern Sumatra and Java.
    bbox: { x0: 1508, y0: 538, x1: 1540, y1: 556 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 1500,
    suggestedTollFraction: 0.015,
    suggestedInterdictionFraction: 0.25,
  },
  {
    id: "mozambique",
    name: "Mozambique Channel",
    connects: ["Indian Ocean", "Indian Ocean"],
    lat: -16.0,
    lon: 42.0,
    // Narrowest part of the channel between Africa and Madagascar.
    bbox: { x0: 1154, y0: 596, x1: 1200, y1: 612 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 1000,
    suggestedTollFraction: 0.01,
    suggestedInterdictionFraction: 0.2,
  },
  {
    id: "drake",
    name: "Drake Passage",
    connects: ["Atlantic Ocean", "Pacific Ocean"],
    lat: -58.0,
    lon: -68.0,
    // Water between the southern tip of South America and the Antarctic peninsula.
    bbox: { x0: 556, y0: 848, x1: 612, y1: 896 },
    tier: CHOKEPOINT_TIERS.Minor,
    suggestedTollPerShip: 800,
    suggestedTollFraction: 0.008,
    suggestedInterdictionFraction: 0.15,
  },
];

/** Convenience lookup by id (pure, returns undefined if absent). */
export const getChokepoint = (id: string): Chokepoint | undefined =>
  CHOKEPOINTS.find((c) => c.id === id);

/** True if a pixel (x, y) falls inside a chokepoint's bounding box (pure). */
export const chokepointContains = (
  chokepoint: Chokepoint,
  x: number,
  y: number,
): boolean =>
  x >= chokepoint.bbox.x0 &&
  x <= chokepoint.bbox.x1 &&
  y >= chokepoint.bbox.y0 &&
  y <= chokepoint.bbox.y1;

/**
 * Default toll constants (the mechanic is designed in 12-chokepoints.md).
 * These are the per-tier recommended values used when a tier has no bespoke
 * per-ship value - kept here so the design doc and engine cite one source.
 */
export const TIER_BASE_TOLL: Record<ChokepointTier, number> = {
  Global: 5000,
  Major: 3000,
  Minor: 1500,
};
