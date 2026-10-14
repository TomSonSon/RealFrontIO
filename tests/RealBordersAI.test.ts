import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
  Relation,
} from "@openfront/engine-api/game/GameTypes";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { NationAllianceBehavior } from "@openfront/engine/execution/nation/NationAllianceBehavior";
import { NationEmojiBehavior } from "@openfront/engine/execution/nation/NationEmojiBehavior";
import { NationNukeBehavior } from "@openfront/engine/execution/nation/NationNukeBehavior";
import { NationExecution } from "@openfront/engine/execution/NationExecution";
import { AiAttackBehavior } from "@openfront/engine/execution/utils/AiAttackBehavior";
import { Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import { canAiAttack } from "@openfront/engine/realism/RealBordersPolicy";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { TestConfig } from "./util/TestConfig";

const REAL_BORDERS = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};

const PEACE_TICKS = 1800;

// Mirrors the real-borders branch of createNationsForGame.
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

async function realBordersGame(): Promise<{ game: Game; runner: GameRunner }> {
  const game = await setup(
    "../../../resources/maps/realisticworld",
    REAL_BORDERS,
    [],
    undefined,
    undefined,
    false,
    countryNations(),
  );
  // Production real borders uses 1800 ticks; the test config defaults to 0.
  (game.config() as TestConfig).setNationSpawnImmunityDuration(PEACE_TICKS);
  const runner = new GameRunner(
    game,
    new Executor(game, "real_borders_ai", "no_client"),
    () => {},
  );
  runner.init();
  return { game, runner };
}

function tick(runner: GameRunner, game: Game, ticks = 1): void {
  for (let i = 0; i < ticks; i++) {
    runner.addTurn({ turnNumber: game.ticks(), intents: [] });
    runner.executeNextTick();
  }
}

function tileOwners(game: Game): Uint16Array {
  const owners = new Uint16Array(game.width() * game.height());
  for (let t = 0; t < owners.length; t++) owners[t] = game.ownerID(t);
  return owners;
}

function changedTiles(before: Uint16Array, after: Uint16Array): number {
  let changed = 0;
  for (let t = 0; t < before.length; t++) {
    if (before[t] !== after[t]) changed++;
  }
  return changed;
}

function nationPlayers(game: Game): Player[] {
  return game.allPlayers().filter((p) => p.type() === PlayerType.Nation);
}

// Adjacent nation pairs at the moment of the call, each pair once.
function adjacentNationPairs(game: Game): [Player, Player][] {
  const pairs: [Player, Player][] = [];
  for (const a of nationPlayers(game)) {
    for (const n of a.nearby()) {
      if (!n.isPlayer() || n.type() !== PlayerType.Nation) continue;
      if (n.id() > a.id()) pairs.push([a, n]);
    }
  }
  return pairs;
}

function byName(game: Game, name: string): Player {
  const p = game.allPlayers().find((x) => x.name() === name);
  if (p === undefined) throw new Error(`no player ${name}`);
  return p;
}

describe("real borders AI: peace window", () => {
  test("no tile changes and no attacks during the first 1800 ticks", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 1);

    const before = tileOwners(game);
    for (let i = 0; i < PEACE_TICKS / 100; i++) {
      tick(runner, game, 100);
      const attacks = game
        .allPlayers()
        .reduce((n, p) => n + p.outgoingAttacks().length, 0);
      expect(attacks, `attacks at tick ${game.ticks()}`).toBe(0);
    }
    expect(changedTiles(before, tileOwners(game))).toBe(0);
  }, 300_000);
});

describe("real borders AI: wars after the peace window", () => {
  test("hostile pairs fight, neutral pairs never do, Lesotho keeps its land", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 1);
    tick(runner, game, PEACE_TICKS);

    const pairs = adjacentNationPairs(game);
    const hostile = new Set<string>();
    const neutral = new Set<string>();
    for (const [a, b] of pairs) {
      const key = [a.id(), b.id()].sort().join("|");
      if (a.relation(b) === Relation.Hostile) hostile.add(key);
      else neutral.add(key);
    }
    expect(hostile.size).toBeGreaterThan(0);

    const lesotho = byName(game, "Lesotho");
    const lesothoTiles = lesotho.numTilesOwned();
    const seen = new Set<unknown>();
    let hostileAttacks = 0;
    let neutralAttacks = 0;
    let attacksOnLesotho = 0;
    for (let i = 0; i < 3000 - PEACE_TICKS; i++) {
      tick(runner, game);
      for (const p of game.allPlayers()) {
        for (const a of p.outgoingAttacks()) {
          if (seen.has(a)) continue;
          seen.add(a);
          const target = a.target();
          if (!target.isPlayer()) continue;
          if (target === lesotho) attacksOnLesotho++;
          const key = [p.id(), target.id()].sort().join("|");
          if (hostile.has(key)) hostileAttacks++;
          else if (neutral.has(key)) neutralAttacks++;
        }
      }
    }

    expect(hostileAttacks).toBeGreaterThan(0);
    expect(neutralAttacks).toBe(0);
    expect(attacksOnLesotho).toBe(0);
    expect(lesotho.numTilesOwned()).toBe(lesothoTiles);

    const zero = nationPlayers(game).filter(
      (p) => p.numTilesOwned() === 0,
    ).length;
    expect(zero).toBeLessThanOrEqual(10);
  }, 600_000);

  test("passive countries get no AI, slow countries attack less often", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 2);

    const executions = (
      game as unknown as { executions(): unknown[] }
    ).executions();
    const aiNames = new Set(
      executions
        .filter((e) => e instanceof NationExecution)
        .map(
          (e) => (e as unknown as { nation: Nation }).nation.playerInfo.name,
        ),
    );
    for (const c of roster()) {
      expect(aiNames.has(c.name), c.name).toBe(!c.passive);
    }

    const rateOf = (name: string): number => {
      const exec = executions.find(
        (e) =>
          e instanceof NationExecution &&
          (e as unknown as { nation: Nation }).nation.playerInfo.name === name,
      ) as unknown as { attackRate: number };
      return exec.attackRate;
    };
    const slow = roster().find((c) => c.slow && !c.passive);
    const normal = roster().find((c) => !c.slow && !c.passive);
    expect(rateOf(slow!.name) % 6).toBe(0);
    expect(rateOf(normal!.name) % 3).toBe(0);
  }, 120_000);
});

describe("canAiAttack", () => {
  test("classic games are unchanged", async () => {
    const game = await setup("world", {}, [
      new PlayerInfo("a", PlayerType.Human, "a_client", "a"),
      new PlayerInfo("b", PlayerType.Human, "b_client", "b"),
    ]);
    const [a, b] = game.allPlayers();
    expect(canAiAttack(game, a, b)).toBe(true);
    expect(canAiAttack(game, a, game.terraNullius())).toBe(true);
  });

  test("peace, hostility, friendliness and retaliation", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 1);
    const config = game.config() as TestConfig;

    const [a, b] = adjacentNationPairs(game)[0];
    const d = nationPlayers(game).find(
      (p) => p !== a && p !== b && !a.sharesBorderWith(p),
    )!;

    // Peace: nothing is allowed, not even hostile targets or terra nullius.
    a.updateRelation(b, -300);
    expect(a.relation(b)).toBe(Relation.Hostile);
    expect(canAiAttack(game, a, b)).toBe(false);
    expect(canAiAttack(game, a, game.terraNullius())).toBe(false);

    config.setNationSpawnImmunityDuration(0);
    expect(canAiAttack(game, a, b)).toBe(true);
    expect(canAiAttack(game, a, game.terraNullius())).toBe(true);

    // Not hostile, no attack in either direction: no attack.
    a.updateRelation(d, 300);
    expect(a.relation(d)).not.toBe(Relation.Hostile);
    expect(canAiAttack(game, a, d)).toBe(false);

    // Retaliation: d attacks a, so a may counterattack d.
    d.createAttack(a, 1000, null, new Set());
    expect(canAiAttack(game, a, d)).toBe(true);
  });
});

function nukeBehavior(game: Game, nation: Player): NationNukeBehavior {
  const emojiBehavior = new NationEmojiBehavior(
    new PseudoRandom(1),
    game,
    nation,
  );
  const allianceBehavior = new NationAllianceBehavior(
    new PseudoRandom(1),
    game,
    nation,
    emojiBehavior,
  );
  const attackBehavior = new AiAttackBehavior(
    new PseudoRandom(1),
    game,
    nation,
    0.5,
    0.3,
    0.2,
    allianceBehavior,
    emojiBehavior,
  );
  return new NationNukeBehavior(
    new PseudoRandom(2),
    game,
    nation,
    attackBehavior,
    emojiBehavior,
  );
}

describe("real borders AI: nuke targets", () => {
  test("no nuke target inside the peace window, a hostile one after it", async () => {
    const { game, runner } = await realBordersGame();
    tick(runner, game, 2);
    game.endSpawnPhase();
    tick(runner, game, 1);
    // A target at under half the attacker's cap counts as much weaker and is never nuked.
    const config = game.config();
    const [a, b] = adjacentNationPairs(game).find(
      ([x, y]) => config.maxTroops(x) < 2 * config.maxTroops(y),
    )!;
    a.updateRelation(b, -300);
    expect(a.relation(b)).toBe(Relation.Hostile);

    const behavior = nukeBehavior(game, a);
    expect(behavior.findBestNukeTarget()).toBeNull();

    (game.config() as TestConfig).setNationSpawnImmunityDuration(0);
    expect(behavior.findBestNukeTarget()).toBe(b);
  });
});
