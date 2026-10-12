import {
  Difficulty,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { AllianceRequestExecution } from "@openfront/engine/execution/alliance/AllianceRequestExecution";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { NationCoalitionBehavior } from "@openfront/engine/execution/nation/NationCoalitionBehavior";
import { Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";

/**
 * §8.6 coalition bot voting (research/10) and §8.7 right-of-passage.
 */

describe("coalition war declarations — how bots vote (8.6)", () => {
  async function scenario(difficulty = Difficulty.Medium) {
    const game = await setup("big_plains", {
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

describe("right-of-passage through allies (8.7) — no ownership change", () => {
  test("an attacker can push into a target through an ally's territory without taking the ally's tiles", async () => {
    const game = await setup("big_plains", {
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

    // Real alliance between A and B.
    game.addExecution(new AllianceRequestExecution(a, b.id()));
    game.executeNextTick();
    game.addExecution(new AllianceRequestExecution(b, a.id()));
    game.executeNextTick();
    expect(a.isAlliedWith(b)).toBe(true);

    a.setTroops(200_000);
    t.setTroops(200_000);

    // A attacks T through its ally B (no focus).
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 120 && t.isAlive(); i++) {
      game.executeNextTick();
    }

    // A conquered some of T's territory ...
    expect(a.numTilesOwned()).toBeGreaterThan(aInitial);
    // ... and B's tiles were never touched (no ownership change).
    expect(b.numTilesOwned()).toBe(bInitial);
  });

  test("without an ally, A cannot conquer T's far territory", async () => {
    const game = await setup("big_plains", {
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
    // A and B are NOT allied, so A has no passage through B: it cannot reach T.
    expect(a.numTilesOwned()).toBe(aInitial);
  });
});
