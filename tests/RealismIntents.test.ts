import {
  GameMapType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import {
  DeclareCoalitionWarIntentSchema,
  IntentSchema,
  PurchaseTechIntentSchema,
  StampedIntent,
} from "@openfront/engine-api/Schemas";
import { AllianceRequestExecution } from "@openfront/engine/execution/alliance/AllianceRequestExecution";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { Game, Player } from "@openfront/engine/game/Game";
import { snapshotGame } from "@openfront/engine/snapshot/GameSnapshot";
import { setup } from "./util/Setup";
import { diffSnapshots, roundTrip } from "./util/Snapshot";

const REALISM = {
  gameMap: GameMapType.World,
  publicGameModifiers: { isRealisticWorld: true },
};

function addPlayer(game: Game, name: string, type = PlayerType.Human): Player {
  return game.addPlayer(
    new PlayerInfo(name, type, `${name}_client`, name),
  ) as Player;
}

function grantLand(game: Game, players: Player[]): void {
  let i = 0;
  game.map().forEachTile((t) => {
    if (!game.map().isLand(t) || game.map().isImpassable(t)) return;
    players[i++ % players.length].conquer(t);
  });
}

function ally(game: Game, x: Player, y: Player): void {
  game.addExecution(new AllianceRequestExecution(x, y.id()));
  game.executeNextTick();
  game.addExecution(new AllianceRequestExecution(y, x.id()));
  game.executeNextTick();
}

function send(game: Game, intent: Record<string, unknown>, from: Player): void {
  const executor = new Executor(game, "game_id", undefined);
  const stamped = {
    ...intent,
    clientID: from.clientID(),
  } as unknown as StampedIntent;
  game.addExecution(executor.createExec(stamped));
  game.executeNextTick();
}

describe("declare_coalition_war through the executor", () => {
  async function scenario() {
    const game = await setup("big_plains", REALISM);
    const initiator = addPlayer(game, "I");
    const target = addPlayer(game, "T");
    const nation = addPlayer(game, "N", PlayerType.Nation);
    const human = addPlayer(game, "H");
    grantLand(game, [initiator, target, nation, human]);
    ally(game, initiator, nation);
    ally(game, initiator, human);
    nation.updateRelation(target, -100);
    human.updateRelation(target, -100);
    return { game, initiator, target, nation, human };
  }

  test("allied nations join, humans are never forced", async () => {
    const { game, initiator, target, nation, human } = await scenario();
    send(
      game,
      {
        type: "declare_coalition_war",
        target: target.id(),
        candidates: [nation.id(), human.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(target)).toBe(true);
    expect(human.hasEmbargoAgainst(target)).toBe(false);
  });

  test("duplicate candidates are harmless", async () => {
    const { game, initiator, target, nation } = await scenario();
    send(
      game,
      {
        type: "declare_coalition_war",
        target: target.id(),
        candidates: [nation.id(), nation.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(target)).toBe(true);
  });

  test("a dead nation is never drafted", async () => {
    const { game, initiator, target, nation } = await scenario();
    [...nation.tiles()].forEach((t) => nation.relinquish(t));
    expect(nation.isAlive()).toBe(false);
    send(
      game,
      {
        type: "declare_coalition_war",
        target: target.id(),
        candidates: [nation.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(target)).toBe(false);
  });

  test("snapshots and round-trips right after the intent tick", async () => {
    const { game, initiator, target, nation } = await scenario();
    send(
      game,
      {
        type: "declare_coalition_war",
        target: target.id(),
        candidates: [nation.id()],
      },
      initiator,
    );
    const { restored } = await roundTrip(game, "big_plains");
    expect(diffSnapshots(snapshotGame(restored), snapshotGame(game))).toEqual(
      [],
    );
  });

  test("a dead initiator cannot declare", async () => {
    const { game, initiator, target, nation } = await scenario();
    [...initiator.tiles()].forEach((t) => initiator.relinquish(t));
    expect(initiator.isAlive()).toBe(false);
    send(
      game,
      {
        type: "declare_coalition_war",
        target: target.id(),
        candidates: [nation.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(target)).toBe(false);
  });

  test("targeting yourself or an ally is rejected", async () => {
    const { game, initiator, nation, human } = await scenario();
    nation.updateRelation(human, -100);
    send(
      game,
      {
        type: "declare_coalition_war",
        target: initiator.id(),
        candidates: [nation.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(initiator)).toBe(false);
    send(
      game,
      {
        type: "declare_coalition_war",
        target: human.id(),
        candidates: [nation.id()],
      },
      initiator,
    );
    expect(nation.hasEmbargoAgainst(human)).toBe(false);
  });

  test("the schema caps the candidate list", () => {
    const base = { type: "declare_coalition_war", target: "TTTTTTTT" };
    const ids = (n: number) => Array.from({ length: n }, () => "TTTTTTTT");
    expect(
      DeclareCoalitionWarIntentSchema.safeParse({
        ...base,
        candidates: ids(33),
      }).success,
    ).toBe(false);
    expect(
      IntentSchema.safeParse({ ...base, candidates: ids(32) }).success,
    ).toBe(true);
  });
});

describe("purchase_tech through the executor", () => {
  test("buys a node in realism, ignores invalid ids", async () => {
    const game = await setup("big_plains", REALISM);
    const p = addPlayer(game, "P");
    grantLand(game, [p]);
    p.addGold(1_000_000n);
    send(game, { type: "purchase_tech", techId: "nope" }, p);
    expect(game.ownedTechNodeIds(p)).toEqual([]);
    send(game, { type: "purchase_tech", techId: "economy_1" }, p);
    expect(game.ownedTechNodeIds(p)).toEqual(["economy_1"]);
  });

  test("is a no-op outside realism and for dead players", async () => {
    const classic = await setup("big_plains", {});
    const c = addPlayer(classic, "C");
    grantLand(classic, [c]);
    c.addGold(1_000_000n);
    send(classic, { type: "purchase_tech", techId: "economy_1" }, c);
    expect(classic.ownedTechNodeIds(c)).toEqual([]);

    const game = await setup("big_plains", REALISM);
    const p = addPlayer(game, "P");
    grantLand(game, [p]);
    p.addGold(1_000_000n);
    [...p.tiles()].forEach((t) => p.relinquish(t));
    send(game, { type: "purchase_tech", techId: "economy_1" }, p);
    expect(game.ownedTechNodeIds(p)).toEqual([]);
  });

  test("snapshots and round-trips right after the intent tick", async () => {
    const game = await setup("big_plains", REALISM);
    const p = addPlayer(game, "P");
    grantLand(game, [p]);
    p.addGold(1_000_000n);
    send(game, { type: "purchase_tech", techId: "economy_1" }, p);
    const { restored } = await roundTrip(game, "big_plains");
    expect(diffSnapshots(snapshotGame(restored), snapshotGame(game))).toEqual(
      [],
    );
    expect(restored.ownedTechNodeIds(restored.player("P"))).toEqual([
      "economy_1",
    ]);
  });

  test("the schema rejects an empty id", () => {
    expect(
      PurchaseTechIntentSchema.safeParse({ type: "purchase_tech", techId: "" })
        .success,
    ).toBe(false);
  });
});

describe("attack focus tile gating", () => {
  async function focusOf(config: object, tile: number): Promise<unknown> {
    const game = await setup("big_plains", config);
    const a = addPlayer(game, "A");
    const t = addPlayer(game, "T");
    const executor = new Executor(game, "game_id", undefined);
    const exec = executor.createExec({
      type: "attack",
      clientID: a.clientID()!,
      targetID: t.id(),
      troops: 10,
      tile,
    });
    return (exec as unknown as { focusTile: number | null }).focusTile;
  }

  test("kept only in realism and only for valid tiles", async () => {
    expect(await focusOf(REALISM, 5)).toBe(5);
    expect(await focusOf({}, 5)).toBeNull();
    expect(await focusOf(REALISM, 999_999_999)).toBeNull();
  });
});

describe("realism attack across a snapshot", () => {
  test("a restored mid-attack game matches the live one", async () => {
    const game = await setup("big_plains", REALISM);
    const a = addPlayer(game, "A");
    const b = addPlayer(game, "B");
    const t = addPlayer(game, "T");
    // A | T | B: A borders T directly.
    game.map().forEachTile((tile) => {
      if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
      const x = game.x(tile);
      const w = game.width();
      if (x < w / 3) a.conquer(tile);
      else if (x < (2 * w) / 3) t.conquer(tile);
      else b.conquer(tile);
    });
    ally(game, a, b);
    a.setTroops(200_000);
    t.setTroops(200_000);
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 15; i++) game.executeNextTick();

    const { restored } = await roundTrip(game, "big_plains");
    for (let i = 0; i < 40; i++) {
      game.executeNextTick();
      restored.executeNextTick();
    }
    expect(diffSnapshots(snapshotGame(restored), snapshotGame(game))).toEqual(
      [],
    );
    expect(restored.player("A").numTilesOwned()).toBe(a.numTilesOwned());
    expect(a.numTilesOwned()).toBeGreaterThan(0);
  });
});
