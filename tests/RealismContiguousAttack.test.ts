import {
  GameMapType,
  PlayerInfo,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import { AllianceRequestExecution } from "@openfront/engine/execution/alliance/AllianceRequestExecution";
import { AttackExecution } from "@openfront/engine/execution/AttackExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { setup } from "./util/Setup";

const REALISTIC = {
  gameMap: GameMapType.World,
  publicGameModifiers: { isRealisticWorld: true },
};

function human(game: Game, id: string): Player {
  return game.addPlayer(
    new PlayerInfo(id, PlayerType.Human, null, id),
  ) as Player;
}

async function ally(game: Game, x: Player, y: Player) {
  game.addExecution(new AllianceRequestExecution(x, y.id()));
  game.executeNextTick();
  game.addExecution(new AllianceRequestExecution(y, x.id()));
  game.executeNextTick();
}

function paint(game: Game, ownerAt: (x: number, w: number) => Player) {
  game.map().forEachTile((tile) => {
    if (!game.map().isLand(tile) || game.map().isImpassable(tile)) return;
    ownerAt(game.x(tile), game.width()).conquer(tile);
  });
}

function ownedTiles(p: Player): Set<number> {
  const tiles = new Set<number>();
  for (const t of p.tiles()) tiles.add(t);
  return tiles;
}

// Every tile `p` owns is 4-connected to `original` through tiles `p` owns.
function staysContiguous(
  game: Game,
  p: Player,
  original: Set<number>,
): boolean {
  const owned = ownedTiles(p);
  const seen = new Set<number>(original);
  const queue = [...original];
  const buf = [0, 0, 0, 0];
  while (queue.length > 0) {
    const tile = queue.pop()!;
    const n = game.map().neighbors4(tile, buf);
    for (let i = 0; i < n; i++) {
      const nb = buf[i];
      if (owned.has(nb) && !seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  for (const t of owned) {
    if (!seen.has(t)) return false;
  }
  return true;
}

describe("attacks are contiguous from the attacker's own border (no implicit passage)", () => {
  // Bands: A | R1 (T) | B | R2 (T). A only borders T in R1; R2 is cut off by B.
  const R2_START = 0.85;
  const bandOwner =
    (a: Player, b: Player, t: Player) => (x: number, w: number) => {
      if (x < w * 0.15) return a;
      if (x < w * 0.7) return t;
      if (x < w * R2_START) return b;
      return t;
    };

  for (const alliance of ["A-B", "none", "B-T"] as const) {
    test(`alliance ${alliance}: A never takes R2 and its land stays contiguous`, async () => {
      const game = await setup("big_plains", REALISTIC);
      const a = human(game, "A");
      const b = human(game, "B");
      const t = human(game, "T");
      paint(game, bandOwner(a, b, t));
      if (alliance === "A-B") await ally(game, a, b);
      if (alliance === "B-T") await ally(game, b, t);

      const r2Start = R2_START * game.width();
      const original = ownedTiles(a);
      a.setTroops(200_000);
      t.setTroops(200_000);
      game.addExecution(
        new AttackExecution(undefined, a, t.id(), null, true, null),
      );

      let takesR2 = false;
      for (let i = 0; i < 150 && t.isAlive(); i++) {
        game.executeNextTick();
        for (const tile of a.tiles()) {
          if (game.x(tile) >= r2Start) takesR2 = true;
        }
      }

      expect(takesR2).toBe(false);
      expect(a.numTilesOwned()).toBeGreaterThan(original.size);
      expect(staysContiguous(game, a, original)).toBe(true);
    });
  }

  test("a focus tile deep inside T still conquers contiguously from the border", async () => {
    const game = await setup("big_plains", REALISTIC);
    const a = human(game, "A");
    const b = human(game, "B");
    const t = human(game, "T");
    paint(game, bandOwner(a, b, t));

    const borderX = Math.floor(game.width() * 0.15);
    const deepX = borderX + 60;
    expect(deepX).toBeLessThan(Math.floor(game.width() * 0.7));
    let focusTile: number | undefined;
    game.map().forEachTile((tile) => {
      if (
        focusTile === undefined &&
        game.x(tile) === deepX &&
        game.map().isLand(tile) &&
        game.owner(tile) === t
      ) {
        focusTile = tile;
      }
    });
    expect(focusTile).toBeDefined();

    const original = ownedTiles(a);
    a.setTroops(200_000);
    t.setTroops(200_000);
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, focusTile!),
    );
    for (let i = 0; i < 150 && t.isAlive(); i++) {
      game.executeNextTick();
    }

    expect(a.numTilesOwned()).toBeGreaterThan(original.size);
    expect(staysContiguous(game, a, original)).toBe(true);
  });
});

describe("classic and realistic attacks across a shared border", () => {
  async function run(realistic: boolean) {
    const game = await setup(
      "big_plains",
      realistic ? REALISTIC : { gameMap: GameMapType.World },
    );
    const a = human(game, "A");
    const t = human(game, "T");
    paint(game, (x, w) => (x < w / 2 ? a : t));

    const original = ownedTiles(a);
    a.setTroops(200_000);
    t.setTroops(200_000);
    game.addExecution(
      new AttackExecution(undefined, a, t.id(), null, true, null),
    );
    for (let i = 0; i < 120 && t.isAlive(); i++) {
      game.executeNextTick();
    }
    return {
      gain: a.numTilesOwned() - original.size,
      contiguous: staysContiguous(game, a, original),
    };
  }

  test("both modes gain land and keep it contiguous", async () => {
    const classic = await run(false);
    const realistic = await run(true);
    expect(classic.gain).toBeGreaterThan(0);
    expect(realistic.gain).toBeGreaterThan(0);
    expect(classic.contiguous).toBe(true);
    expect(realistic.contiguous).toBe(true);
  });
});
