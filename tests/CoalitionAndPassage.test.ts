import {
  Difficulty,
  GameMapType,
  PlayerInfo,
  PlayerType,
  Relation,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { AllianceRequestExecution } from "@openfront/engine/execution/alliance/AllianceRequestExecution";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { NationCoalitionBehavior } from "@openfront/engine/execution/nation/NationCoalitionBehavior";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";

/**
 * section 8.6 coalition bot voting (research/10) and section 8.7 (attacks are
 * contiguous from the attacker's own border; no implicit right of passage).
 */

describe("coalition war declarations - how bots vote (8.6)", () => {
  async function scenario(difficulty = Difficulty.Medium) {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
      difficulty,
    });
    const initiator = game.addPlayer(
      new PlayerInfo("I", PlayerType.Human, null, "I"),
    ) as Player;
    const target = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;
    const voter = game.addPlayer(
      new PlayerInfo("V", PlayerType.Human, null, "V"),
    ) as Player;
    const behavior = new NationCoalitionBehavior(
      new PseudoRandom(1),
      game,
      voter,
    );
    return { game, initiator, target, voter, behavior };
  }

  test("votes to join a friendly power's war on an already-hostile target", async () => {
    const { initiator, target, voter, behavior } = await scenario();
    voter.updateRelation(target, -100); // already hostile
    voter.updateRelation(initiator, 50); // trusts the initiator
    expect(behavior.voteYes(initiator, target)).toBe(true);
  });

  test("refuses a war on a neutral target when the initiator isn't an ally", async () => {
    const { initiator, target, behavior } = await scenario();
    // voter keeps default neutral relations with both.
    expect(behavior.voteYes(initiator, target)).toBe(false);
  });

  test("Easy nations are reluctant even against a hostile target", async () => {
    const { initiator, target, voter, behavior } = await scenario(
      Difficulty.Easy,
    );
    voter.updateRelation(target, -100); // hostile target, but Easy is reluctant
    expect(behavior.voteYes(initiator, target)).toBe(false);
  });
});

describe("no implicit right of passage through allies (8.7)", () => {
  test("an ally bordering the target does not open a route: the attacker gains no target tiles", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "A"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "B"),
    ) as Player;
    const t = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;

    // Three vertical bands: A (left), B (middle), T (right). B separates A and
    // T so A does not border T directly.
    game.map().forEachTile((tile) => {
      if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
      const x = game.x(tile);
      const w = game.width();
      if (x < w / 3) a.conquer(tile);
      else if (x < (2 * w) / 3) b.conquer(tile);
      else t.conquer(tile);
    });
    const bInitial = b.numTilesOwned();
    const aInitial = a.numTilesOwned();
    const tInitial = t.numTilesOwned();

    // Real alliance between A and B.
    game.addExecution(new AllianceRequestExecution(a, b.id()));
    game.executeNextTick();
    game.addExecution(new AllianceRequestExecution(b, a.id()));
    game.executeNextTick();
    expect(a.isAlliedWith(b)).toBe(true);

    a.setTroops(200_000);
    t.setTroops(200_000);

    // A attacks T; A's only border is with B, which borders T.
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 120 && t.isAlive(); i++) {
      game.executeNextTick();
    }

    // A never reaches T: the attack starts from A's own border only.
    expect(a.numTilesOwned()).toBe(aInitial);
    expect(t.numTilesOwned()).toBe(tInitial);
    expect(b.numTilesOwned()).toBe(bInitial);
  });

  test("without an ally, A cannot conquer T's far territory", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "A"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "B"),
    ) as Player;
    const t = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;
    game.map().forEachTile((tile) => {
      if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
      const x = game.x(tile);
      const w = game.width();
      if (x < w / 3) a.conquer(tile);
      else if (x < (2 * w) / 3) b.conquer(tile);
      else t.conquer(tile);
    });
    const aInitial = a.numTilesOwned();
    a.setTroops(200_000);
    t.setTroops(200_000);
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 120 && t.isAlive(); i++) {
      game.executeNextTick();
    }
    // A and B are NOT allied, and A does not border T: it cannot reach T.
    expect(a.numTilesOwned()).toBe(aInitial);
  });

  test("a chain of allies does not open a route: the attacker gains no target tiles", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const a = game.addPlayer(
      new PlayerInfo("A", PlayerType.Human, null, "A"),
    ) as Player;
    const b = game.addPlayer(
      new PlayerInfo("B", PlayerType.Human, null, "B"),
    ) as Player;
    const c = game.addPlayer(
      new PlayerInfo("C", PlayerType.Human, null, "C"),
    ) as Player;
    const t = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;

    // Four vertical bands: A | B | C | T. A only borders B, C only borders T.
    game.map().forEachTile((tile) => {
      if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
      const x = game.x(tile);
      const w = game.width();
      if (x < w / 4) a.conquer(tile);
      else if (x < w / 2) b.conquer(tile);
      else if (x < (3 * w) / 4) c.conquer(tile);
      else t.conquer(tile);
    });
    const bInitial = b.numTilesOwned();
    const cInitial = c.numTilesOwned();
    const aInitial = a.numTilesOwned();
    const tInitial = t.numTilesOwned();

    // Alliances A-B and B-C form a chain A -> B -> C.
    for (const [x, y] of [
      [a, b],
      [b, c],
    ] as const) {
      game.addExecution(new AllianceRequestExecution(x, y.id()));
      game.executeNextTick();
      game.addExecution(new AllianceRequestExecution(y, x.id()));
      game.executeNextTick();
    }
    expect(a.isAlliedWith(b)).toBe(true);
    expect(b.isAlliedWith(c)).toBe(true);

    a.setTroops(200_000);
    t.setTroops(200_000);
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 160 && t.isAlive(); i++) {
      game.executeNextTick();
    }

    // A has no border with T or C, so the attack never leaves A's own land.
    expect(a.numTilesOwned()).toBe(aInitial);
    expect(t.numTilesOwned()).toBe(tInitial);
    expect(b.numTilesOwned()).toBe(bInitial);
    expect(c.numTilesOwned()).toBe(cInitial);
  });
});

describe("coalition war declaration (8.6) - engine flow", () => {
  async function allyEach(game: Game, x: Player, y: Player) {
    game.addExecution(new AllianceRequestExecution(x, y.id()));
    game.executeNextTick();
    game.addExecution(new AllianceRequestExecution(y, x.id()));
    game.executeNextTick();
  }

  function grantLand(game: Game, players: Player[]): void {
    let i = 0;
    game.map().forEachTile((t) => {
      if (!game.map().isLand(t) || game.map().isImpassable(t)) return;
      players[i++ % players.length].conquer(t);
    });
  }

  test("allied candidates vote and join; idempotent commit", async () => {
    const game = await setup("big_plains", {
      gameMap: GameMapType.World,
      publicGameModifiers: { isRealisticWorld: true },
    });
    const initiator = game.addPlayer(
      new PlayerInfo("I", PlayerType.Human, null, "I"),
    ) as Player;
    const target = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;
    const v1 = game.addPlayer(
      new PlayerInfo("V1", PlayerType.Human, null, "V1"),
    ) as Player;
    const v2 = game.addPlayer(
      new PlayerInfo("V2", PlayerType.Human, null, "V2"),
    ) as Player;
    grantLand(game, [initiator, target, v1, v2]);

    await allyEach(game, initiator, v1);
    await allyEach(game, initiator, v2);
    // V1 already hates the target -> votes yes; V2 is neutral -> votes no.
    v1.updateRelation(target, -100);

    const joined = game.declareCoalitionWar(initiator, target, [v1, v2]);
    expect(joined).toContain(v1);
    expect(joined).not.toContain(v2);
    // V1 committed: hostile to the target + auto-sanction (embargo).
    expect(v1.relation(target)).toBe(Relation.Hostile);
    expect(v1.hasEmbargoAgainst(target)).toBe(true);
    // V2 did not join, so no embargo from it.
    expect(v2.hasEmbargoAgainst(target)).toBe(false);
  });

  test("classic mode (no realism) never forms a coalition war", async () => {
    const game = await setup("big_plains", {});
    const initiator = game.addPlayer(
      new PlayerInfo("I", PlayerType.Human, null, "I"),
    ) as Player;
    const target = game.addPlayer(
      new PlayerInfo("T", PlayerType.Human, null, "T"),
    ) as Player;
    const v1 = game.addPlayer(
      new PlayerInfo("V1", PlayerType.Human, null, "V1"),
    ) as Player;
    v1.updateRelation(target, -100);
    expect(game.declareCoalitionWar(initiator, target, [v1])).toHaveLength(0);
  });
});
