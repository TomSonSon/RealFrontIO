import {
  GameMapType,
  Nation,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";
import { UseRealAttackLogic } from "./util/TestConfig";

const REALISM = {
  gameMap: GameMapType.World,
  publicGameModifiers: { isRealisticWorld: true },
};

function tech(over: Partial<Record<string, number>>) {
  return {
    troopRegen: 1,
    attackPower: 1,
    goldIncome: 1,
    structureCost: 1,
    ...over,
  };
}

async function duel(attackPower: number, focus: "none" | "far") {
  const game = await setup(
    "big_plains",
    REALISM,
    [],
    undefined,
    UseRealAttackLogic,
  );
  game
    .config()
    .setTechTreeProvider((p) =>
      p.id() === "att" ? tech({ attackPower }) : tech({}),
    );
  const a = game.addPlayer(
    new PlayerInfo("att", PlayerType.Human, null, "att"),
  ) as Player;
  const d = game.addPlayer(
    new PlayerInfo("def", PlayerType.Human, null, "def"),
  ) as Player;
  const w = game.width();
  let far = -1;
  game.map().forEachTile((t) => {
    if (!game.map().isLand(t) || game.map().isImpassable(t)) return;
    if (game.x(t) < w / 2) a.conquer(t);
    else {
      d.conquer(t);
      if (far < 0 || game.x(t) > game.x(far)) far = t;
    }
  });
  a.setTroops(100_000);
  d.setTroops(100_000);
  const before = a.numTilesOwned();
  game.addExecution(
    new AttackExecution(
      50_000,
      a,
      d.id(),
      null,
      true,
      focus === "far" ? far : null,
    ),
  );
  for (let i = 0; i < 40; i++) game.executeNextTick();
  return {
    gained: a.numTilesOwned() - before,
    defTroops: d.troops(),
    game,
  };
}

describe("tech attackPower applies to explicit-troop attacks", () => {
  test("an attacker with attackPower tech hurts the defender more", async () => {
    const plain = await duel(1, "none");
    const teched = await duel(1.5, "none");
    expect(plain.gained).toBeGreaterThan(0);
    expect(teched.defTroops).toBeLessThan(plain.defTroops);
  });

  test("classic config keeps combat power at identity", async () => {
    const game = await setup("big_plains", {});
    game.config().setTechTreeProvider(() => tech({ attackPower: 2 }));
    const p = game.addPlayer(
      new PlayerInfo("p", PlayerType.Human, null, "p"),
    ) as Player;
    expect(game.config().attackCombatPower(p)).toBe(1);
  });
});

describe("far focus never slows an attack", () => {
  test("conquers at least as much as no focus", async () => {
    const none = await duel(1, "none");
    const far = await duel(1, "far");
    expect(far.gained).toBeGreaterThanOrEqual(none.gained);
  });
});

describe("tech troopRegen", () => {
  async function regen(troopsFromCap: number) {
    const game = await setup(
      "big_plains",
      REALISM,
      [],
      undefined,
      UseRealAttackLogic,
    );
    game.config().setTechTreeProvider(() => tech({ troopRegen: 3 }));
    const p = game.addPlayer(
      new PlayerInfo("p", PlayerType.Human, null, "p"),
    ) as Player;
    const max = game.config().maxTroops(p);
    p.setTroops(max + troopsFromCap);
    return { rate: game.config().troopIncreaseRate(p), max, p };
  }

  test("over the cap the correction is never scaled", async () => {
    const { rate, max, p } = await regen(5_000);
    expect(rate).toBe(max - p.troops());
  });

  test("just under the cap does not overshoot", async () => {
    const { rate, max, p } = await regen(-3);
    expect(rate).toBeLessThanOrEqual(3);
    expect(p.troops() + rate).toBeLessThanOrEqual(max);
  });
});

describe("startingGold modifier reaches realistic nations", () => {
  async function gold(startingGold: number) {
    const nation = new Nation(
      undefined,
      new PlayerInfo("United States", PlayerType.Nation, null, "us_id"),
    );
    const game: Game = await setup(
      "big_plains",
      { ...REALISM, startingGold },
      [],
      undefined,
      UseRealAttackLogic,
      true,
      [nation],
    );
    const human = game.addPlayer(
      new PlayerInfo("h", PlayerType.Human, null, "h"),
    ) as Player;
    return { nation: game.player("us_id").gold(), human: human.gold() };
  }

  test("a large configured amount wins over the seed", async () => {
    const g = await gold(5_000_000);
    expect(g.nation).toBeGreaterThanOrEqual(5_000_000n);
    expect(g.human).toBe(5_000_000n);
  });

  test("a small configured amount keeps the seed", async () => {
    const g = await gold(1_000);
    expect(g.nation).toBeGreaterThan(1_000n);
    expect(g.human).toBe(1_000n);
  });
});
