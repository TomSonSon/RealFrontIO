import {
  GameMapType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import {
  GameUpdateType,
  GameUpdateViewData,
} from "@openfront/engine-api/game/GameUpdates";
import { CHOKEPOINTS } from "@openfront/engine-api/resources/Chokepoints";
import {
  TECH_NODES,
  canPurchaseTech,
} from "@openfront/engine-api/resources/TechNodes";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { diffPlayerUpdate } from "@openfront/engine/game/GameUpdateUtils";
import { GameRunner } from "@openfront/engine/GameRunner";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import {
  makeEmptyGu,
  makeGameView,
  makePlayerUpdate,
  makePlayerView,
} from "./util/viewStubs";

async function run(realistic: boolean, ticks: number) {
  const game = await setup("world", {
    gameMap: GameMapType.World,
    ...(realistic ? { publicGameModifiers: { isRealisticWorld: true } } : {}),
  });
  game.addPlayer(new PlayerInfo("a", PlayerType.Human, "a_client", "a"));
  const byTick = new Map<number, GameUpdateViewData>();
  const runner = new GameRunner(
    game,
    new Executor(game, "g", "a_client"),
    (gu) => {
      if (!("errMsg" in gu)) byTick.set(gu.tick, gu);
    },
  );
  for (let t = 0; t < ticks; t++) {
    runner.addTurn({ turnNumber: t, intents: [] });
    runner.executeNextTick();
  }
  return byTick;
}

describe("chokepoints on the view data", () => {
  test("realism: full list on first tick, then only when it changes", async () => {
    const byTick = await run(true, 100);
    const emitted = [...byTick.values()].filter((g) => g.chokepoints);
    expect(emitted.length).toBe(1);
    expect(emitted[0].chokepoints!.map((c) => c.id)).toEqual(
      CHOKEPOINTS.map((c) => c.id),
    );
  });

  test("classic mode never emits chokepoints", async () => {
    const byTick = await run(false, 40);
    expect([...byTick.values()].some((g) => g.chokepoints)).toBe(false);
  });
});

describe("techRanks in player diffs", () => {
  test("a rank change is diffed; unchanged ranks are not", () => {
    const prev = makePlayerUpdate({ techRanks: ["military_1"] });
    expect(diffPlayerUpdate(prev, { ...prev })).toBeNull();
    const next = { ...prev, techRanks: ["military_1", "military_2"] };
    expect(diffPlayerUpdate(prev, next)?.techRanks).toEqual([
      "military_1",
      "military_2",
    ]);
    expect(diffPlayerUpdate(prev, next)?.type).toBe(GameUpdateType.Player);
  });
});

describe("canPurchaseTech (shared)", () => {
  const t1 = TECH_NODES.find((n) => n.id === "military_1")!;
  test("needs gold, prerequisite and a free rank slot", () => {
    expect(canPurchaseTech("military_1", [], t1.cost)).toBe(true);
    expect(canPurchaseTech("military_1", [], t1.cost - 1)).toBe(false);
    expect(canPurchaseTech("military_2", [], 10n ** 9n)).toBe(false);
    expect(canPurchaseTech("military_2", ["military_1"], 10n ** 9n)).toBe(true);
    expect(canPurchaseTech("military_1", ["military_1"], 10n ** 9n)).toBe(
      false,
    );
    expect(canPurchaseTech("nope", [], 10n ** 9n)).toBe(false);
  });
});

describe("client views", () => {
  test("PlayerView.techRanks reads and updates from PlayerUpdate", () => {
    const pv = makePlayerView({ data: { techRanks: ["economy_1"] } });
    expect(pv.techRanks()).toEqual(["economy_1"]);
    pv.applyUpdate(makePlayerUpdate({ techRanks: ["economy_1", "economy_2"] }));
    expect(pv.techRanks()).toEqual(["economy_1", "economy_2"]);
    expect(makePlayerView().techRanks()).toEqual([]);
  });

  test("GameView.chokepointControllers keeps the latest list", () => {
    const gv = makeGameView();
    expect(gv.chokepointControllers()).toEqual([]);
    gv.update(makeEmptyGu(1, { chokepoints: [{ id: "suez", controller: 3 }] }));
    gv.update(makeEmptyGu(2));
    expect(gv.chokepointControllers()).toEqual([
      { id: "suez", controllerSmallID: 3 },
    ]);
  });
});
