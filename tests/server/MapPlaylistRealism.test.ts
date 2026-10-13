import { describe, expect, it, vi } from "vitest";
import { MapPlaylist } from "../../src/server/MapPlaylist";

vi.mock("../../src/server/MapLandTiles", () => ({
  getMapLandTiles: async () => 1_000_000,
}));

describe("MapPlaylist realism modifier", () => {
  it("is never rolled in the public playlist", async () => {
    const playlist = new MapPlaylist();
    for (let i = 0; i < 1500; i++) {
      const config = await playlist.gameConfig("special");
      expect(config.publicGameModifiers?.isRealisticWorld).toBeUndefined();
    }
  });
});
