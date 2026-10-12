import { GameMapType } from "@openfront/engine-api/game/GameTypes";
import { describe, expect, it, vi } from "vitest";
import { MapPlaylist } from "../../src/server/MapPlaylist";

vi.mock("../../src/server/MapLandTiles", () => ({
  getMapLandTiles: async () => 1_000_000,
}));

describe("MapPlaylist realism modifier", () => {
  it("is only rolled for the World map", async () => {
    const playlist = new MapPlaylist();
    for (let i = 0; i < 400; i++) {
      const config = await playlist.gameConfig("special");
      if (config.publicGameModifiers?.isRealisticWorld) {
        expect(config.gameMap).toBe(GameMapType.World);
      }
    }
  });
});
