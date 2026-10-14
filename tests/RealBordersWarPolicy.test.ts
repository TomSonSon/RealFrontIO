import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { NationAllianceBehavior } from "@openfront/engine/execution/nation/NationAllianceBehavior";
import { NationEmojiBehavior } from "@openfront/engine/execution/nation/NationEmojiBehavior";
import { AiAttackBehavior } from "@openfront/engine/execution/utils/AiAttackBehavior";
import { Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import {
  canAiAttack,
  isCityCapReached,
  isWarWeary,
  REAL_BORDERS_CONQUEST_COOLDOWN_TICKS,
} from "@openfront/engine/realism/RealBordersPolicy";
import { describe, expect, test, vi } from "vitest";
import { setup } from "./util/Setup";
import { TestConfig } from "./util/TestConfig";

function countryNations(): Nation[] {
  return roster().map(
    (c) =>
      new Nation(
        new Cell(c.anchor[0], c.anchor[1]),
        new PlayerInfo(
          c.name,
          PlayerType.Nation,
          null,
          c.name,
          false,
          null,
          [],
          null,
          c.flag || null,
        ),
      ),
  );
}

async function peaceOverGame(): Promise<Game> {
  const game = await setup(
    "../../../resources/maps/realisticworld",
    {
      gameMap: GameMapType.RealisticWorld,
      publicGameModifiers: { isRealisticWorld: true },
    },
    [],
    undefined,
    undefined,
    false,
    countryNations(),
  );
  (game.config() as TestConfig).setNationSpawnImmunityDuration(0);
  const runner = new GameRunner(
    game,
    new Executor(game, "war_policy", "no_client"),
    () => {},
  );
  runner.init();
  for (let i = 0; i < 2; i++) {
    runner.addTurn({ turnNumber: game.ticks(), intents: [] });
    runner.executeNextTick();
  }
  game.endSpawnPhase();
  runner.addTurn({ turnNumber: game.ticks(), intents: [] });
  runner.executeNextTick();
  return game;
}

function nations(game: Game): Player[] {
  return game.allPlayers().filter((p) => p.type() === PlayerType.Nation);
}

function behaviorFor(game: Game, nation: Player): AiAttackBehavior {
  const emoji = new NationEmojiBehavior(new PseudoRandom(1), game, nation);
  const alliance = new NationAllianceBehavior(
    new PseudoRandom(1),
    game,
    nation,
    emoji,
  );
  return new AiAttackBehavior(
    new PseudoRandom(1),
    game,
    nation,
    0.5,
    0.3,
    0.2,
    alliance,
    emoji,
  );
}

describe("real borders war policy", () => {
  test("only land neighbours are targets, retaliation reaches anyone", async () => {
    const game = await peaceOverGame();
    const [a, b] = nations(game)
      .flatMap((x) => x.nearby().map((n) => [x, n] as const))
      .find(([x, n]) => n.isPlayer() && x.sharesBorderWith(n)) as [
      Player,
      Player,
    ];
    const far = nations(game).find(
      (p) => p !== a && p !== b && !a.sharesBorderWith(p),
    )!;
    a.updateRelation(b, -300);
    a.updateRelation(far, -300);
    expect(canAiAttack(game, a, b)).toBe(true);
    expect(canAiAttack(game, a, far)).toBe(false);

    far.createAttack(a, 1000, null, new Set());
    expect(canAiAttack(game, a, far)).toBe(true);
  });

  test("a war weary nation only retaliates", async () => {
    const game = await peaceOverGame();
    const big = nations(game).reduce((x, y) =>
      x.numTilesOwned() > y.numTilesOwned() ? x : y,
    );
    expect(isWarWeary(game, big)).toBe(true);
    const neighbour = big.nearby().find((n) => n.isPlayer()) as Player;
    big.updateRelation(neighbour, -300);
    expect(canAiAttack(game, big, neighbour)).toBe(false);
    neighbour.createAttack(big, 1000, null, new Set());
    expect(canAiAttack(game, big, neighbour)).toBe(true);
  });

  test("the AI sends no boat at a hostile non-neighbour", async () => {
    const game = await peaceOverGame();
    const a = nations(game)[0];
    const far = nations(game).find(
      (p) => p !== a && !a.sharesBorderWith(p) && p.numTilesOwned() > 0,
    )!;
    a.updateRelation(far, -300);
    const behavior = behaviorFor(game, a);
    expect(behavior.sendAttack(far)).toBe(false);
    expect(a.unitCount(UnitType.TransportShip)).toBe(0);
  });

  test("a dead target starts a cooldown that only retaliation overrides", async () => {
    const game = await peaceOverGame();
    const [a, b] = nations(game)
      .flatMap((x) => x.nearby().map((n) => [x, n] as const))
      .find(([x, n]) => n.isPlayer() && x.sharesBorderWith(n)) as [
      Player,
      Player,
    ];
    a.updateRelation(b, -300);
    const behavior = behaviorFor(game, a);
    const priv = behavior as unknown as {
      watchedTargets: string[];
      updateConquestHold(): void;
    };
    expect(behavior.shouldAttack(b)).toBe(true);

    priv.watchedTargets = [b.id()];
    const alive = vi.spyOn(b, "isAlive").mockReturnValue(false);
    priv.updateConquestHold();
    alive.mockRestore();
    expect(behavior.shouldAttack(b)).toBe(false);
    expect(behavior.shouldAttack(game.terraNullius())).toBe(true);

    b.createAttack(a, 1000, null, new Set());
    expect(behavior.shouldAttack(b)).toBe(true);

    const ticks = vi
      .spyOn(game, "ticks")
      .mockReturnValue(game.ticks() + REAL_BORDERS_CONQUEST_COOLDOWN_TICKS);
    expect(behavior.shouldAttack(b)).toBe(true);
    ticks.mockRestore();
  });

  test("AI nations stop building cities at the troop cap limit", async () => {
    const game = await peaceOverGame();
    const p = nations(game)[0];
    expect(isCityCapReached(game, p)).toBe(false);
    vi.spyOn(game.config(), "maxTroops").mockReturnValue(1e18);
    expect(isCityCapReached(game, p)).toBe(true);
  });

  test("classic games have no new limits", async () => {
    const game = await setup("world", {}, [
      new PlayerInfo("a", PlayerType.Human, "a_client", "a"),
      new PlayerInfo("b", PlayerType.Human, "b_client", "b"),
    ]);
    const [a, b] = game.allPlayers();
    expect(canAiAttack(game, a, b)).toBe(true);
    expect(isCityCapReached(game, a)).toBe(false);
  });
});
