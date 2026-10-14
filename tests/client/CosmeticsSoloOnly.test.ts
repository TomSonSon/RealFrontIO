import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCosmetics,
  getPlayerCosmeticsRefs,
  invalidateCosmetics,
  prewarmCosmetics,
} from "../../src/client/Cosmetics";

vi.mock("../../src/client/SoloOnly", () => ({ SOLO_ONLY: true }));

vi.mock("../../src/client/Api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Api")>()),
  getUserMe: vi.fn(async () => false),
}));

describe("cosmetics in the solo-only build", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invalidateCosmetics();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    invalidateCosmetics();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("answers the catalog as null without a request", async () => {
    expect(await fetchCosmetics()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("warms nothing and still resolves", async () => {
    await expect(prewarmCosmetics()).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves the default player cosmetics without a request", async () => {
    const refs = await getPlayerCosmeticsRefs();
    expect(refs.flag).toBeUndefined();
    expect(refs.patternName).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
