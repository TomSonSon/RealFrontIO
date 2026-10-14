import { describe, expect, test } from "vitest";
import { nukeExplosionRadius } from "../src/client/render/gl/passes/fx-pass/FxSettings";
import { createRenderSettings } from "../src/client/render/gl/RenderSettings";
import {
  UT_ATOM_BOMB,
  UT_HYDROGEN_BOMB,
  UT_MIRV_WARHEAD,
  UT_WARSHIP,
} from "../src/client/render/types";

describe("nukeExplosionRadius", () => {
  test("reads the per-bomb radius from settings", () => {
    const fx = createRenderSettings().fx;
    fx.nukeRadiusAtom = 11;
    fx.nukeRadiusHydro = 22;
    fx.nukeRadiusMirv = 33;
    expect(nukeExplosionRadius(fx, UT_ATOM_BOMB, 1)).toBe(11);
    expect(nukeExplosionRadius(fx, UT_HYDROGEN_BOMB, 1)).toBe(22);
    expect(nukeExplosionRadius(fx, UT_MIRV_WARHEAD, 1)).toBe(33);
  });

  test("scales the per-bomb radius by the map scale", () => {
    const fx = createRenderSettings().fx;
    fx.nukeRadiusAtom = 11;
    expect(nukeExplosionRadius(fx, UT_ATOM_BOMB, 2.5)).toBe(27.5);
  });

  test("is undefined for non-nuke units", () => {
    expect(nukeExplosionRadius(createRenderSettings().fx, UT_WARSHIP, 1)).toBe(
      undefined,
    );
  });
});
