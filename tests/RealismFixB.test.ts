import {
  GameMapType,
  PlayerInfo,
  PlayerType,
  Relation,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { AllianceRequestExecution } from "@openfront/engine/execution/alliance/AllianceRequestExecution";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { NationAllianceBehavior } from "@openfront/engine/execution/nation/NationAllianceBehavior";
import { NationEmojiBehavior } from "@openfront/engine/execution/nation/NationEmojiBehavior";
import { PlayerExecution } from "@openfront/engine/execution/PlayerExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { placeNationCapital } from "@openfront/engine/realism/RealisticWorld";
import { setup } from "./util/Setup";

const REALISTIC = {
  gameMap: GameMapType.World,
  publicGameModifiers: { isRealisticWorld: true },
};

function human(game: Game, id: string): Player {
  return game.addPlayer(new PlayerInfo(id, PlayerType.Human, null, id));
}

function nation(game: Game, name: string, id: string): Player {
  return game.addPlayer(new PlayerInfo(name, PlayerType.Nation, null, id));
}

function firstLandTile(game: Game, skip = 0): number {
  let found = -1;
  let seen = 0;
  game.map().forEachTile((t) => {
    if (found < 0 && game.map().isLand(t) && !game.map().isImpassable(t)) {
      if (seen++ === skip) found = t;
    }
  });
  return found;
}

describe("passage exclaves are not re-conquered (PlayerExecution)", () => {
  async function run(realistic: boolean) {
    const game = await setup(
      "big_plains",
      realistic ? REALISTIC : { gameMap: GameMapType.World },
    );
    const a = human(game, "A");
    const b = human(game, "B");
    const t = human(game, "T");
    game.map().forEachTile((tile) => {
      if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
      const x = game.x(tile);
      const w = game.width();
      if (x < w / 3) a.conquer(tile);
      else if (x < (2 * w) / 3) b.conquer(tile);
      else t.conquer(tile);
    });
    game.addExecution(new AllianceRequestExecution(a, b.id()));
    game.executeNextTick();
    game.addExecution(new AllianceRequestExecution(b, a.id()));
    game.executeNextTick();
    expect(a.isAlliedWith(b)).toBe(true);
    const aInitial = a.numTilesOwned();
    a.setTroops(1_000_000);
    t.setTroops(1_000_000);
    b.setTroops(1_000_000);
    for (const p of [a, b, t]) game.addExecution(new PlayerExecution(p));
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 300; i++) game.executeNextTick();
    return a.numTilesOwned() - aInitial;
  }

  test("realistic: the attacker's gain accumulates", async () => {
    expect(await run(true)).toBeGreaterThan(100);
  });
});

describe("dead players release their embargoes", () => {
  test("target's incoming count and passive gold recover when the sender dies", async () => {
    const game = await setup("big_plains", REALISTIC);
    const sender = human(game, "S");
    const other = human(game, "O");
    const target = human(game, "T");
    sender.conquer(firstLandTile(game, 0));
    other.conquer(firstLandTile(game, 1));
    target.conquer(firstLandTile(game, 2));
    sender.addEmbargo(target, false);
    other.addEmbargo(target, false);
    expect(game.incomingEmbargoCount(target)).toBe(2);

    for (const p of [sender, other, target]) {
      game.addExecution(new PlayerExecution(p));
    }
    const g0 = target.gold();
    game.executeNextTick();
    const sanctionedGain = target.gold() - g0;

    sender.relinquish(firstLandTile(game, 0));
    expect(sender.isAlive()).toBe(false);
    game.executeNextTick();

    expect(sender.getEmbargoes()).toHaveLength(0);
    expect(game.incomingEmbargoCount(target)).toBe(1);

    other.relinquish(firstLandTile(game, 1));
    game.executeNextTick();
    expect(game.incomingEmbargoCount(target)).toBe(0);

    const before = target.gold();
    game.executeNextTick();
    const full = target.gold() - before;
    expect(full).toBeGreaterThan(0n);
    expect(full).toBeGreaterThan(sanctionedGain);

    // The restore path recounts from every player's embargoes, dead included.
    let recount = 0;
    for (const p of game.allPlayers()) {
      for (const e of p.getEmbargoes()) {
        if (!e.isTemporary && e.target === target) recount++;
      }
    }
    expect(recount).toBe(game.incomingEmbargoCount(target));
  });
});

describe("nation capital is free", () => {
  test("gold after placement equals the seeded gold", async () => {
    const game = await setup("big_plains", REALISTIC);
    const n = nation(game, "United States", "us_id");
    const tile = firstLandTile(game);
    n.conquer(tile);
    n.addGold(500_000n);
    const before = n.gold();
    placeNationCapital(game, n, tile);
    expect(n.units(UnitType.City)).toHaveLength(1);
    expect(n.gold()).toBe(before);
  });
});

describe("seeded relations decay to the real-world baseline", () => {
  async function pair(opts: object) {
    const game = await setup("big_plains", opts);
    const us = nation(game, "United States", "us_id");
    const cn = nation(game, "China", "cn_id");
    const uk = nation(game, "United Kingdom", "uk_id");
    us.updateRelation(cn, -60);
    us.updateRelation(uk, 80);
    for (let i = 0; i < 1500; i++) us.decayRelations();
    return { us, cn, uk };
  }

  test("realistic: hostile and friendly seeds persist", async () => {
    const { us, cn, uk } = await pair(REALISTIC);
    expect(us.relation(cn)).toBe(Relation.Hostile);
    expect(us.relation(uk)).toBe(Relation.Friendly);
  });

  test("classic: relations still decay to zero", async () => {
    const { us, cn, uk } = await pair({});
    expect(us.relation(cn)).toBe(Relation.Neutral);
    expect(us.relation(uk)).toBe(Relation.Neutral);
  });
});

describe("betrayers are refused by nations", () => {
  async function decide(opts: object) {
    const game = await setup("big_plains", opts);
    const n = nation(game, "France", "fr_id");
    const betrayer = human(game, "B");
    n.conquer(firstLandTile(game, 0));
    betrayer.conquer(firstLandTile(game, 1));
    n.updateRelation(betrayer, 100);
    betrayer.markTraitor();
    const wait = game.config().traitorDuration() + 2;
    for (let i = 0; i < wait; i++) game.executeNextTick();
    expect(betrayer.isTraitor()).toBe(false);
    const random = new PseudoRandom(7);
    const behavior = new NationAllianceBehavior(
      random,
      game,
      n,
      new NationEmojiBehavior(random, game, n),
    );
    const accept = vi.fn();
    const reject = vi.fn();
    vi.spyOn(n, "incomingAllianceRequests").mockReturnValue([
      {
        requestor: () => betrayer,
        recipient: () => n,
        createdAt: () => game.ticks(),
        accept,
        reject,
      } as never,
    ]);
    behavior.handleAllianceRequests();
    return { accept, reject, betrayer };
  }

  test("realistic: rejected after the traitor window", async () => {
    const { accept, reject, betrayer } = await decide(REALISTIC);
    expect(betrayer.isAllianceBlacklisted()).toBe(true);
    expect(accept).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalled();
  });

  test("classic: not blacklisted, request accepted", async () => {
    const { accept, betrayer } = await decide({});
    expect(betrayer.isAllianceBlacklisted()).toBe(false);
    expect(accept).toHaveBeenCalled();
  });
});
