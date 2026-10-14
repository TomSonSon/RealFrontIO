/**
 * Pure (no WebGL) helpers that turn the `settings.fx` slice into per-spawn
 * FX parameters. Kept out of the passes so they can be unit-tested.
 */

import {
  UT_ATOM_BOMB,
  UT_HYDROGEN_BOMB,
  UT_MIRV_WARHEAD,
} from "../../../types";
import type { RenderSettings } from "../../RenderSettings";

/**
 * Visual explosion radius (shockwave / debris scatter — not the gameplay
 * damage radius) for a detonating unit type, or undefined for non-nukes.
 * The settings radii are classic-map sizes, scaled by the map's mapScale().
 */
export function nukeExplosionRadius(
  fx: RenderSettings["fx"],
  unitType: string,
  mapScale: number,
): number | undefined {
  switch (unitType) {
    case UT_ATOM_BOMB:
      return fx.nukeRadiusAtom * mapScale;
    case UT_HYDROGEN_BOMB:
      return fx.nukeRadiusHydro * mapScale;
    case UT_MIRV_WARHEAD:
      return fx.nukeRadiusMirv * mapScale;
    default:
      return undefined;
  }
}
