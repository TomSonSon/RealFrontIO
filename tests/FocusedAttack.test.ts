import { PlayerInfo, PlayerType } from "@openfront/engine-api/game/GameTypes";
import { AttackIntentSchema } from "@openfront/engine-api/Schemas";
import {
  AttackExecution,
  focusBudgetWeight,
} from "@openfront/engine/execution/AttackExecution";
import { Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";

/**
 * Region/front-focused attacks: an optional `tile` on an attack intent makes
 * the attack concentrate its frontier and per-tick budget near that point
 * ("push a specific region harder") instead of the whole border. The focus is
 * inert by default (no tile = classic whole-border attack), so all existing
 * behavior is unchanged unless a focus is set.
 */
describe("focused (region) attacks", () => {
  test("focusBudgetWeight makes tiles near the focus cheap to conquer", () => {
    // Within the focus radius: 0.5x budget cost (2x throughput).
    expect(focusBudgetWeight(0)).toBe(0.5);
    expect(focusBudgetWeight(40)).toBe(0.5);
    // Far away: the unfocused cost, never a penalty.
    expect(focusBudgetWeight(80)).toBe(1);
    expect(focusBudgetWeight(500)).toBe(1);
    // Monotone: closer is always cheaper than farther.
    expect(focusBudgetWeight(10)).toBeLessThan(focusBudgetWeight(50));
    expect(focusBudgetWeight(50)).toBeLessThan(focusBudgetWeight(70));
    expect(focusBudgetWeight(70)).toBeDefined();
  });

  test("AttackIntentSchema accepts an optional focus tile", () => {
    const withTile = AttackIntentSchema.parse({
      type: "attack",
      targetID: null,
      troops: 100,
      tile: 5,
    });
    expect(withTile.tile).toBe(5);

    const withoutTile = AttackIntentSchema.parse({
      type: "attack",
      targetID: null,
      troops: 100,
    });
    expect(withoutTile.tile).toBeUndefined();
  });

  test("a focused attack runs and conquers defender territory at the focus", async () => {
    const game = await setup("big_plains", { infiniteGold: true });
    const attacker = game.addPlayer(
      new PlayerInfo("attacker", PlayerType.Human, null, "attacker_id"),
    ) as Player;
    const defender = game.addPlayer(
      new PlayerInfo("defender", PlayerType.Human, null, "defender_id"),
    ) as Player;
    attacker.setTroops(200_000);
    defender.setTroops(200_000);

    // Give each player half the land so they share a long border.
    const land: number[] = [];
    game.map().forEachTile((t) => {
      if (game.map().isLand(t)) land.push(t);
    });
    const half = Math.floor(land.length / 2);
    land.forEach((t, idx) =>
      idx < half ? attacker.conquer(t) : defender.conquer(t),
    );

    // Focus on the defender's first border tile (adjacent to the attacker).
    let focusTile: number | undefined;
    defender.borderTiles().forEach((t) => {
      focusTile ??= t;
    });
    expect(focusTile).toBeDefined();

    game.addExecution(
      new AttackExecution(
        undefined,
        attacker,
        defender.id(),
        null,
        true,
        focusTile!,
      ),
    );
    for (let k = 0; k < 60 && defender.isAlive(); k++) {
      game.executeNextTick();
    }

    // The attack took at least some of the defender's territory.
    expect(defender.numTilesOwned()).toBeLessThan(half);
  });
});
