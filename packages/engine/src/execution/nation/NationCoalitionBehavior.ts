import {
  Difficulty,
  PlayerType,
  Relation,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { Game, Player } from "../../game/Game";

/**
 * Nation-AI decision for coalition war declarations (research/10 section 8.6).
 *
 * When one nation proposes a coalition war on target X, each bot member must
 * VOTE YES or NO. This is the deterministic, difficulty-weighted policy a
 * nation uses to decide. The actual declaration/UI wiring lives on top; this
 * is the "how does the bot decide?" engine piece (and, per the project rules,
 * it is a pure-ish function of existing state - relations, troops, difficulty -
 * so it is bit-identical on every client).
 */
export class NationCoalitionBehavior {
  constructor(
    private random: PseudoRandom,
    private game: Game,
    private player: Player,
  ) {}

  /**
   * Rarely proposes a coalition war on a hated player, inviting its allied
   * nations. Realistic World only; the seeded random keeps it deterministic.
   */
  maybeDeclareWar(): void {
    if (!this.game.config().isRealisticWorld()) return;
    if (!this.random.chance(30)) return;
    const allies = this.player
      .allies()
      .filter((a) => a.type() === PlayerType.Nation);
    if (allies.length === 0) return;
    const target = this.game
      .players()
      .find(
        (p) =>
          p !== this.player &&
          p.isAlive() &&
          !this.player.isFriendly(p) &&
          this.player.relation(p) === Relation.Hostile,
      );
    if (target === undefined) return;
    const candidates = allies.filter(
      (a) =>
        !(
          a.relation(target) === Relation.Hostile && a.hasEmbargoAgainst(target)
        ),
    );
    if (candidates.length === 0) return;
    this.game.declareCoalitionWar(this.player, target, candidates);
  }

  /**
   * Should this nation join `initiator`'s coalition war against `target`?
   * Deterministic - no randomness.
   */
  voteYes(initiator: Player, target: Player): boolean {
    if (target === initiator || target === this.player) return false;

    // Never join a war against an ally/teammate.
    if (this.player.isFriendly(target)) return false;

    const relTarget = this.player.relation(target);

    // Only tag along with an ally's war - or one against somebody already
    // hated. An unknown initiator asking us to attack a stranger is a no.
    const initiatorFriendly = this.player.isFriendly(initiator);
    if (!initiatorFriendly && relTarget !== Relation.Hostile) return false;

    // A score of shared interest in the fight:
    let score = 0;
    if (relTarget === Relation.Hostile)
      score += 3; // already at odds with them
    else if (relTarget === Relation.Distrustful) score += 1; // tense already

    // Power calculus (bandwagon vs. must-stop-a-threat).
    const us = this.player.troops() + initiator.troops();
    const them = Math.max(1, target.troops());
    if (us > them * 1.5)
      score += 1; // easy pickings - join in for the spoils
    else if (them > us * 2) score += 1; // overwhelming threat - coalition needed

    return score >= this.threshold();
  }

  /**
   * Aggressiveness by difficulty: Easy nations are reluctant to volunteer for
   * wars; Impossible nations join eagerly.
   */
  private threshold(): number {
    switch (this.game.config().gameConfig().difficulty) {
      case Difficulty.Easy:
        return 5;
      case Difficulty.Medium:
        return 3;
      case Difficulty.Hard:
        return 2;
      case Difficulty.Impossible:
        return 1;
      default:
        return 3;
    }
  }
}
