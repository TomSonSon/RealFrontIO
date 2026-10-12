/**
 * Chokepoints.ts
 *
 * STATIC DATA MODULE — no engine imports, no runtime dependencies. Safe to
 * import from anywhere (engine, server, client, tests, tooling).
 *
 * PURPOSE (research: research/real-world-realism/10-economics-and-diplomacy.md
 * §8.8a "Chokepoint commercial/toll leverage", and
 * research/real-world-realism/05-terrain-and-geography.md §6 "Sea/Strait
 * Chokepoints & Island Chains").
 *
 * A maritime chokepoint is a narrow strait/canal through which a
 * disproportionate share of trade must pass. Controlling one gives a nation
 * leverage over everyone who uses it: you can tax (toll) or deny (interdict)
 * commerce — the real-world mechanism behind Hormuz, Malacca, Suez, etc.
 *
 * This file is the *map-data pass* called for by §8.8a: it tags the water
 * bands of the world's major straits on the OpenFront "World" map
 * (2000 x 1000 tiles, full 360° equirectangular). The mechanic itself is
 * designed in research/real-world-realism/12-chokepoints.md and is gated
 * behind `isRealisticWorld`.
 *
 * COORDINATE PROJECTION (matches the World map, 2000 x 1000):
 *   x = (lon + 180) / 360 * 2000
 *   y = (90 - lat) / 180 * 1000
 * Origin top-left, x → east, y → south. lon ∈ [-180, +180], lat ∈ [-90, +90].
 *
 * Coordinate sources: research doc §6 lat/long for each strait (WGS84),
 * converted to pixel boxes here. Boxes are deliberately GENEROUS search
 * regions (a strait is only a handful of pixels at 2000-wide scale; we
 * include the surrounding water so a resolver can honour the actual DEM),
 * matching §05's stated "boxes are approximate but generous — treat them as
 * search regions".
 */

// ---------------------------------------------------------------------------
// Projection helpers (pure, dependency-free — duplicated here so the file is
// self-contained and safe to import anywhere).
// ---------------------------------------------------------------------------

export const WORLD_MAP_WIDTH = 2000;
export const WORLD_MAP_HEIGHT = 1000;

export const lonToX = (lon: number): number =>
  ((lon + 180) / 360) * WORLD_MAP_WIDTH;
export const latToY = (lat: number): number =>
  ((90 - lat) / 180) * WORLD_MAP_HEIGHT;

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
  /** Stable unique id (string, never changes once shipped — used in saves). */
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
   * gold value — the "% of passing trade gold" model of §8.8a. Choose ONE of
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
 * The full, ordered list of tagged World-map chokepoints.
 *
 * Water-band pixel boxes were computed from the research doc's lat/long using
 * the equirectangular projection above. Because a strait is only ~1-3 px wide
 * at this scale, each box is widened by a margin so it reliably captures the
 * water column between the two shores; the shipping-lane resolver (in the
 * engine, later) intersects these boxes with actual Ocean tiles.
 */
export const CHOKEPOINTS: readonly Chokepoint[] = [
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    connects: ["Persian Gulf", "Gulf of Oman"],
    lat: 26.6,
    lon: 56.3,
    // ~26.6°N, 56.3°E → narrow N-S water ~ (x 1312-1314, y 351-353) + margin.
    bbox: { x0: 1308, y0: 348, x1: 1318, y1: 356 },
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
    // Long E-W strait ~1-7°N, 95-103°E; the strategic (ever-narrowing) western
    // half around the Malacca/Singapore throat is the toll-relevant band.
    bbox: { x0: 1526, y0: 458, x1: 1578, y1: 494 },
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
    // ~12.5°N, 43.3°E → narrow N-S water ~ (x 1240-1242, y 428-432) + margin.
    bbox: { x0: 1220, y0: 420, x1: 1260, y1: 438 },
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
    // ~30-31°N, 32.3°E → narrow N-S artificial water ~ (x 1179-1181, y 329-334).
    bbox: { x0: 1175, y0: 326, x1: 1185, y1: 338 },
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
    // Two straits ~ (Bosporus 41°N,29°E ; Dardanelles 40.2°N,26.3°E) with the
    // Sea of Marmara between; box spans both + Marmara band.
    bbox: { x0: 1144, y0: 269, x1: 1163, y1: 285 },
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
    // ~35.95°N, 5.5°W → narrow E-W-ish water ~ (x 969-972, y 299-301) + margin.
    bbox: { x0: 964, y0: 296, x1: 977, y1: 304 },
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
    // ~9°N, 79-80°W → artificial N-S water ~ (x 557-561, y 444-451).
    bbox: { x0: 553, y0: 440, x1: 563, y1: 452 },
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
    // ~51°N, 1.4°E → narrow N-S water ~ (x 1007-1009, y 216-217) + margin.
    bbox: { x0: 1002, y0: 213, x1: 1013, y1: 220 },
    tier: CHOKEPOINT_TIERS.Major,
    suggestedTollPerShip: 2500,
    suggestedTollFraction: 0.025,
    suggestedInterdictionFraction: 0.3,
  },
  {
    id: "danish_straits",
    name: "Danish Straits (Kattegat/Øresund)",
    connects: ["Baltic Sea", "North Sea"],
    lat: 56.0,
    lon: 10.0,
    // ~54-58°N, 8-12°E → the Baltic exit; box spans Kattegat/Skagerrak/Øresund.
    bbox: { x0: 1044, y0: 179, x1: 1066, y1: 197 },
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
    // ~65-66°N, 168-170°W → narrow N-S water ~ (x 61-67, y 133-136).
    bbox: { x0: 58, y0: 130, x1: 72, y1: 140 },
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
    // ~23-25.5°N, 118.8-120.8°E → N-S water ~ (x 1660-1671, y 358-372).
    bbox: { x0: 1656, y0: 355, x1: 1676, y1: 375 },
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
    // ~21°N, 120-122°E → water between Taiwan & Luzon ~ (x 1668-1679, y 378-384).
    bbox: { x0: 1664, y0: 374, x1: 1684, y1: 388 },
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
    // ~34-35°N, 129-129.8°E → water between Korea & Japan ~ (x 1717-1721, y 306-311).
    bbox: { x0: 1714, y0: 303, x1: 1724, y1: 314 },
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
    // ~8.5°S, 115.8°E → water between Bali & Lombok ~ (x 1642-1644, y 546-550).
    bbox: { x0: 1638, y0: 543, x1: 1648, y1: 553 },
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
    // ~6°S, 105.5°E → water between Sumatra & Java ~ (x 1583-1588, y 531-534).
    bbox: { x0: 1578, y0: 526, x1: 1592, y1: 538 },
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
    // Wide channel ~ (-12 to -18°S, 40.5-43.5°E) between Madagascar & Africa.
    bbox: { x0: 1225, y0: 567, x1: 1242, y1: 600 },
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
    // Wide storm passage ~ (-55 to -60°S, 64-72°W) below Cape Horn.
    bbox: { x0: 600, y0: 806, x1: 644, y1: 833 },
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
 * per-ship value — kept here so the design doc and engine cite one source.
 */
export const TIER_BASE_TOLL: Record<ChokepointTier, number> = {
  Global: 5000,
  Major: 3000,
  Minor: 1500,
};
