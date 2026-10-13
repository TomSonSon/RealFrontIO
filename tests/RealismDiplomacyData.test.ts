import {
  GameMapType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import { Game, Player } from "@openfront/engine/game/Game";
import { diffPlayerUpdate } from "@openfront/engine/game/GameUpdateUtils";
import { setup } from "./util/Setup";
import { makePlayerUpdate } from "./util/viewStubs";

async function realismGame(isRealisticWorld: boolean): Promise<Game> {
  return setup("big_plains", {
    gameMap: GameMapType.World,
    ...(isRealisticWorld
      ? { publicGameModifiers: { isRealisticWorld: true } }
      : {}),
  });
}

function addPlayers(game: Game, names: string[]): Player[] {
  return names.map(
    (n) =>
      game.addPlayer(
        new PlayerInfo(n, PlayerType.Human, null, n.toLowerCase()),
      ) as Player,
  );
}

describe("Realistic diplomacy fields on PlayerUpdate", () => {
  test("a betrayer shows reputation -40 and is alliance-blocked", async () => {
    const game = await realismGame(true);
    const [a] = addPlayers(game, ["A"]);
    a.markTraitor();
    const update = a.toUpdate();
    expect(update!.reputation).toBe(-40);
    expect(update!.allianceBlocked).toBe(true);
  });

  test("permanent embargoes are counted as embargoSenders", async () => {
    const game = await realismGame(true);
    const [a, b, c] = addPlayers(game, ["A", "B", "C"]);
    b.addEmbargo(a, false);
    c.addEmbargo(a, false);
    expect(a.toUpdate()!.embargoSenders).toBe(2);
  });

  test("temporary embargoes are not counted", async () => {
    const game = await realismGame(true);
    const [a, b] = addPlayers(game, ["A", "B"]);
    b.addEmbargo(a, true);
    expect(a.toUpdate()!.embargoSenders).toBe(0);
  });

  test("classic games carry none of the three fields", async () => {
    const game = await realismGame(false);
    const [a, b] = addPlayers(game, ["A", "B"]);
    a.markTraitor();
    b.addEmbargo(a, false);
    const update = a.toUpdate()!;
    expect(update.reputation).toBeUndefined();
    expect(update.embargoSenders).toBeUndefined();
    expect(update.allianceBlocked).toBeUndefined();
  });

  test("later changes are diffed; unchanged values are not", async () => {
    const game = await realismGame(true);
    const [a, b] = addPlayers(game, ["A", "B"]);
    a.toUpdate();
    expect(a.toUpdate()).toBeNull();
    a.markTraitor();
    b.addEmbargo(a, false);
    const diff = a.toUpdate();
    expect(diff?.reputation).toBe(-40);
    expect(diff?.allianceBlocked).toBe(true);
    expect(diff?.embargoSenders).toBe(1);
  });

  test("diffPlayerUpdate emits a change to the fields", () => {
    const prev = makePlayerUpdate({
      reputation: 0,
      embargoSenders: 0,
      allianceBlocked: false,
    });
    expect(diffPlayerUpdate(prev, { ...prev })).toBeNull();
    const diff = diffPlayerUpdate(prev, {
      ...prev,
      reputation: -40,
      embargoSenders: 2,
      allianceBlocked: true,
    });
    expect(diff?.reputation).toBe(-40);
    expect(diff?.embargoSenders).toBe(2);
    expect(diff?.allianceBlocked).toBe(true);
  });
});
