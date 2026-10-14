import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { describe, expect, test } from "vitest";
import { realismKeyFor } from "../../src/client/view/PlayerView";
import { makePlayerView } from "../util/viewStubs";

describe("realismKeyFor", () => {
  test("unclaimed human gets a non-roster key, never its username", () => {
    expect(realismKeyFor(null, PlayerType.Human, "player-a", "France")).toBe(
      "human:player-a",
    );
  });

  test("nation keeps its static name", () => {
    expect(realismKeyFor(null, PlayerType.Nation, "player-b", "France")).toBe(
      "France",
    );
  });

  test("claimed human uses the explicit country key", () => {
    expect(realismKeyFor("France", PlayerType.Human, "player-a", "alice")).toBe(
      "France",
    );
  });
});

describe("PlayerView.realismKey", () => {
  test("unclaimed human is keyed by id even when its name matches a country", () => {
    const pv = makePlayerView({
      data: { playerType: PlayerType.Human, id: "player-a", name: "France" },
    });
    expect(pv.realismKey()).toBe("human:player-a");
  });

  test("nation is keyed by its name", () => {
    const pv = makePlayerView({
      data: { playerType: PlayerType.Nation, id: "player-b", name: "France" },
    });
    expect(pv.realismKey()).toBe("France");
  });

  test("claimed human is keyed by the explicit country key", () => {
    const pv = makePlayerView({
      data: {
        playerType: PlayerType.Human,
        id: "player-a",
        name: "alice",
        realismKey: "France",
      },
    });
    expect(pv.realismKey()).toBe("France");
  });
});
