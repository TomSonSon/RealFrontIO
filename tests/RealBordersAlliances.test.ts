import {
  Cell,
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import {
  REALISTIC_BLOCS,
  startingAlliancePairs,
} from "@openfront/engine-api/resources/RealismBlocs";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { REALISTIC_RELATIONS } from "@openfront/engine-api/resources/RealismData";
import { StampedIntent } from "@openfront/engine-api/Schemas";
import { Executor } from "@openfront/engine/execution/ExecutionManager";
import { Game, Player } from "@openfront/engine/game/Game";
import { GameRunner } from "@openfront/engine/GameRunner";
import {
  isRealismCountry,
  realisticStartingScore,
} from "@openfront/engine/realism/RealisticWorld";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";
import { expectSnapshotRoundTrip } from "./util/Snapshot";

const REAL_BORDERS = {
  gameMap: GameMapType.RealisticWorld,
  publicGameModifiers: { isRealisticWorld: true },
};

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

async function realBordersGame(
  gameConfig: Parameters<typeof setup>[1] = REAL_BORDERS,
): Promise<{ game: Game; runner: GameRunner }> {
  const game = await setup(
    "../../../resources/maps/realisticworld",
    gameConfig,
    [new PlayerInfo("me", PlayerType.Human, "me_client", "me")],
    undefined,
    undefined,
    false,
    countryNations(),
  );
  const runner = new GameRunner(
    game,
    new Executor(game, "real_borders_alliances", "me_client"),
    () => {},
  );
  runner.init();
  runner.addTurn({ turnNumber: 0, intents: [] });
  runner.executeNextTick();
  return { game, runner };
}

// One tick, returning its updates.
function step(
  runner: GameRunner,
  game: Game,
  intents: { type: "spawn"; tile: number; clientID: string }[] = [],
) {
  runner.addTurn({
    turnNumber: game.ticks(),
    intents: intents as unknown as StampedIntent[],
  });
  return runner.executeNextTick();
}

function spawn(clientID: string, tile: number) {
  return { type: "spawn" as const, tile, clientID };
}

function anchorTile(game: Game, name: string): number {
  const c = roster().find((r) => r.name === name);
  if (c === undefined) throw new Error(`no roster country ${name}`);
  return game.ref(c.anchor[0], c.anchor[1]);
}

function playerNamed(game: Game, name: string): Player {
  const player = game.allPlayers().find((p) => p.name() === name);
  if (player === undefined) throw new Error(`no player for ${name}`);
  return player;
}

function livingCountries(game: Game): Player[] {
  return game.allPlayers().filter((p) => p.isAlive() && isRealismCountry(p));
}

function allianceCount(game: Game): number {
  return game.allPlayers().reduce((n, p) => n + p.alliances().length, 0) / 2;
}

function allied(a: Player, b: Player): boolean {
  return a.isAlliedWith(b);
}

// Raw starting relation value of `from` toward `to`.
function rawRelation(from: Player, to: Player): number {
  const relations = (from as unknown as { relations: Map<Player, number> })
    .relations;
  return relations.get(to) ?? 0;
}

function hashOf(game: Game): number {
  return (game as unknown as { hash(): number }).hash();
}

// Spawn the human on France and run until the spawn phase has ended and the
// countries are started.
async function startedGame() {
  const started = await realBordersGame();
  const { game, runner } = started;
  step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
  step(runner, game);
  step(runner, game);
  return { game, runner };
}

describe("real borders: starting alliances", () => {
  test("every living treaty pair is allied, and no others", async () => {
    const { game } = await startedGame();
    const present = new Set(livingCountries(game).map((p) => p.realismKey()));
    const expected = startingAlliancePairs(present);
    expect(expected.length).toBeGreaterThan(0);

    const byName = new Map(
      livingCountries(game).map((p) => [p.realismKey(), p] as const),
    );
    for (const [a, b] of expected) {
      expect(allied(byName.get(a)!, byName.get(b)!), `${a}-${b}`).toBe(true);
    }
    expect(allianceCount(game)).toBe(expected.length);
  });

  test("NATO members are all pairwise allied", async () => {
    const { game } = await startedGame();
    const nato = REALISTIC_BLOCS.find((b) => b.id === "nato")!.members;
    const living = livingCountries(game).filter((p) =>
      nato.includes(p.realismKey()),
    );
    expect(living.length).toBeGreaterThan(20);
    const pairs = (living.length * (living.length - 1)) / 2;
    let count = 0;
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        expect(allied(living[i], living[j])).toBe(true);
        count++;
      }
    }
    expect(count).toBe(pairs);
  });

  test("no alliance between countries outside a shared treaty bloc", async () => {
    const { game } = await startedGame();
    const us = playerNamed(game, "United States");
    const china = playerNamed(game, "China");
    expect(allied(us, china)).toBe(false);
    expect(allied(china, playerNamed(game, "Russia"))).toBe(false);
  });

  test("a retired country is not allied, and the human stands in for it", async () => {
    const { game } = await startedGame();
    const france = playerNamed(game, "France");
    const me = playerNamed(game, "me");
    expect(france.isAlive()).toBe(false);
    expect(france.alliances()).toHaveLength(0);
    expect(me.realismKey()).toBe("France");
    expect(allied(me, playerNamed(game, "Germany"))).toBe(true);
    expect(allied(me, playerNamed(game, "United States"))).toBe(true);
  });

  test("EU members outside NATO are not allied to the human, and start at their relation", async () => {
    const { game } = await startedGame();
    const me = playerNamed(game, "me");
    let checked = 0;
    for (const name of ["Austria", "Ireland", "Cyprus"]) {
      const other = game.allPlayers().find((p) => p.realismKey() === name);
      if (other === undefined || !other.isAlive()) continue;
      expect(allied(me, other), name).toBe(false);
      expect(rawRelation(me, other), name).toBe(
        realisticStartingScore("France", name, true),
      );
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("no alliance is seeded when alliances are disabled, relations still are", async () => {
    const { game, runner } = await realBordersGame({
      ...REAL_BORDERS,
      disableAlliances: true,
    });
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    step(runner, game);
    step(runner, game);
    expect(allianceCount(game)).toBe(0);
    expect(
      rawRelation(playerNamed(game, "me"), playerNamed(game, "Germany")),
    ).toBe(realisticStartingScore("France", "Germany", true));
  });

  test("the seeding tick emits no alliance request updates", async () => {
    const { game, runner } = await realBordersGame();
    const types: GameUpdateType[] = [];
    step(runner, game, [spawn("me_client", anchorTile(game, "France"))]);
    for (let i = 0; i < 3; i++) {
      const updates = step(runner, game);
      for (const [type, list] of Object.entries(updates)) {
        if ((list as unknown[]).length > 0) types.push(Number(type));
      }
    }
    expect(allianceCount(game)).toBeGreaterThan(0);
    expect(types).not.toContain(GameUpdateType.AllianceRequest);
    expect(types).not.toContain(GameUpdateType.AllianceRequestReply);
  });

  test("treaty alliances outlive the default alliance duration", async () => {
    const { game, runner } = await startedGame();
    const germany = playerNamed(game, "Germany");
    const france = playerNamed(game, "me");
    const seeded = germany.allianceWith(france);
    expect(seeded).not.toBeNull();
    for (let i = 0; i < 3000; i++) step(runner, game);
    expect(germany.isAlliedWith(france)).toBe(true);
    const alliance = germany.allianceWith(france);
    expect(alliance?.id()).toBe(seeded?.id());
    expect(alliance!.expiresAt()).toBeGreaterThan(game.ticks() + 900_000_000);
  }, 600_000);

  test("explicit relation rows win over the bloc default", async () => {
    const { game } = await startedGame();
    const living = livingCountries(game);
    const byName = new Map(living.map((p) => [p.realismKey(), p] as const));
    let checked = 0;
    for (const bloc of REALISTIC_BLOCS) {
      for (const a of bloc.members) {
        for (const b of bloc.members) {
          if (a >= b) continue;
          const explicit =
            REALISTIC_RELATIONS[a]?.[b] ?? REALISTIC_RELATIONS[b]?.[a];
          const pa = byName.get(a);
          const pb = byName.get(b);
          if (explicit === undefined || pa === undefined || pb === undefined) {
            continue;
          }
          expect(rawRelation(pa, pb), `${a}-${b}`).toBe(
            realisticStartingScore(a, b, false) ?? 0,
          );
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("a bloc partner without an explicit row starts at the bloc default", async () => {
    const { game } = await startedGame();
    const germany = playerNamed(game, "Germany");
    const me = playerNamed(game, "me");
    expect(rawRelation(germany, me)).toBe(
      realisticStartingScore("Germany", "France", true),
    );
    expect(rawRelation(me, germany)).toBe(
      realisticStartingScore("France", "Germany", true),
    );
  });

  test("two identical starts have equal hashes every 25 ticks", async () => {
    async function hashes(): Promise<number[]> {
      const { game, runner } = await realBordersGame();
      const out: number[] = [];
      for (let t = 1; t <= 300; t++) {
        step(
          runner,
          game,
          t === 1 ? [spawn("me_client", anchorTile(game, "France"))] : [],
        );
        if (t % 25 === 0) out.push(hashOf(game));
      }
      return out;
    }
    expect(await hashes()).toEqual(await hashes());
  }, 600_000);

  test("a started game round-trips with its alliances", async () => {
    const { game } = await startedGame();
    const restored = await expectSnapshotRoundTrip(
      game,
      "../../../resources/maps/realisticworld",
      30,
    );
    expect(allianceCount(restored)).toBe(allianceCount(game));
  }, 600_000);
});
