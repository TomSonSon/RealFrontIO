import {
  realismSourceNames,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import { realismCityCount } from "@openfront/engine-api/resources/RealismStructures";

// Internal troop units: the HUD shows internal / 10, so one shown troop is one
// inhabitant.
const INTERNAL_PER_INHABITANT = 10;
const START_FLOOR = 20_000;

/**
 * Real borders cap of a roster country with no seeded cities, as a multiple of
 * its start (the land term alone).
 */
export const REAL_BORDERS_CAP_FACTOR = 1.5;
/** Share of the start that one city level adds when the country has no seeded cities. */
export const REAL_BORDERS_CITY_SHARE = 0.1;
/**
 * Share of the start that all seeded cities together add. Each city level adds
 * its equal fraction, so the cap at the start is 1.5 x start.
 */
export const REAL_BORDERS_SEEDED_CITY_SHARE = 0.5;
/** Multiplier on positive troop regen in real borders. */
export const REAL_BORDERS_REGEN_MULT = 1;

export interface RealBordersCountry {
  /** Starting troops: the population in internal units, with a floor. */
  readonly start: number;
  /** Land tiles at the start; the cap grows with land beyond this. */
  readonly tiles: number;
  /** Cities seeded in the country and its merged dependencies. */
  readonly seededCities: number;
}

const countries = new Map<string, RealBordersCountry | null>();

/** The roster country named `key` with its start, or undefined for any other name. */
export function realBordersCountry(
  key: string,
): RealBordersCountry | undefined {
  let found = countries.get(key);
  if (found === undefined) {
    const country = roster().find((c) => c.name === key);
    found =
      country === undefined
        ? null
        : {
            start: Math.max(
              START_FLOOR,
              Math.round(INTERNAL_PER_INHABITANT * country.population),
            ),
            tiles: country.tiles,
            seededCities: realismSourceNames(key).reduce(
              (sum, name) => sum + realismCityCount(name),
              0,
            ),
          };
    countries.set(key, found);
  }
  return found ?? undefined;
}
