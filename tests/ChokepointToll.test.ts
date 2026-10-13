import { GameMapType, PlayerType } from "@openfront/engine-api/game/GameTypes";
import * as Chokepoints from "@openfront/engine-api/resources/Chokepoints";
import {
  CHOKEPOINT_TIERS,
  CHOKEPOINTS,
  getChokepoint,
  TIER_BASE_TOLL,
} from "@openfront/engine-api/resources/Chokepoints";
import { readVersioned } from "@openfront/engine-lib/snapshot/SnapshotType";
import {
  TradeShipExecution,
  TradeShipExecutionSnapshot,
} from "@openfront/engine/execution/TradeShipExecution";
import { PathStatus } from "@openfront/engine/pathfinding/types";
import * as ChokepointToll from "@openfront/engine/realism/ChokepointToll";
import {
  chokepointController,
  interdictMultiplier,
  tollForTier,
} from "@openfront/engine/realism/ChokepointToll";
import { playerInfo, setup } from "./util/Setup";

/**
 * ChokepointToll - strategic chokepoint toll/interdiction (research
 * research/real-world-realism/12-chokepoints.md s.8.8a).
 *
 * Focused on the four required behaviours:
 *  1. control detection (plurality + deterministic smallID tie-break)
 *  2. toll credited once per strait per voyage (realistic world)
 *  3. interdiction reduces the arrival payout
 *  4. classic mode is byte-for-byte unchanged (no toll, no interdiction)
 */

// ---------------------------------------------------------------------------
// Pure control-detection helpers (no engine, fully self-contained mock map)
// ---------------------------------------------------------------------------

type MockPlayer = { smallID: () => number };

/** Build a mock Game object exposing just what `chokepointController` reads. */
function makeControlGame(opts: {
  /** TileRefs (y*W+x) that are ocean. */
  water: number[];
  /** tileRef -> smallID owner. Absent = terra nullius. */
  owners: Map<number, number>;
  players: MockPlayer[];
}): any {
  const W = 12;
  const H = 12;
  const waterSet = new Set(opts.water);
  const owners = opts.owners;
  const playerMap = new Map(opts.players.map((p) => [p.smallID(), p]));

  const map = {
    isValidCoord: (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H,
    ref: (x: number, y: number) => y * W + x,
    isOcean: (ref: number) => waterSet.has(ref),
    isLand: (ref: number) => !waterSet.has(ref),
    ownerID: (ref: number) => owners.get(ref) ?? 0,
  };

  return {
    map: () => map,
    neighbors8: (ref: number, out: number[]) => {
      const x = ref % W;
      const y = (ref / W) | 0;
      const hasN = y > 0;
      const hasS = y < H - 1;
      let n = 0;
      if (x !== 0) {
        if (hasN) out[n++] = ref - 1 - W;
        out[n++] = ref - 1;
        if (hasS) out[n++] = ref - 1 + W;
      }
      if (hasN) out[n++] = ref - W;
      if (hasS) out[n++] = ref + W;
      if (x !== W - 1) {
        if (hasN) out[n++] = ref + 1 - W;
        out[n++] = ref + 1;
        if (hasS) out[n++] = ref + 1 + W;
      }
      return n;
    },
    playerBySmallID: (id: number) => playerMap.get(id) ?? null,
  };
}

// A single ocean tile at (5,5) -> ref 65. bbox covering just it.
const WATER = { x: 5, y: 5, ref: 5 * 12 + 5 };
// Adjacent land tiles by (x,y):
const NEIGHBOR_REF = new Map<string, number>();
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    if (dx === 0 && dy === 0) continue;
    NEIGHBOR_REF.set(
      `${WATER.x + dx},${WATER.y + dy}`,
      (WATER.y + dy) * 12 + (WATER.x + dx),
    );
  }
}

const cp = {
  id: "test",
  name: "Test Strait",
  connects: ["A", "B"] as [string, string],
  lat: 0,
  lon: 0,
  bbox: { x0: 5, y0: 5, x1: 5, y1: 5 },
  tier: CHOKEPOINT_TIERS.Global,
  suggestedTollPerShip: 5000,
  suggestedTollFraction: 0.05,
  suggestedInterdictionFraction: 0.5,
};

describe("chokepointController", () => {
  it("the plurality coastal-land owner controls the chokepoint", () => {
    const A = { smallID: () => 1 };
    const B = { smallID: () => 2 };
    const owners = new Map<number, number>([
      [NEIGHBOR_REF.get("4,5")!, 1], // A: (4,5)
      [NEIGHBOR_REF.get("5,4")!, 1], // A: (5,4)  -> A owns 2
      [NEIGHBOR_REF.get("6,5")!, 2], // B: (6,5)  -> B owns 1
    ]);
    const game = makeControlGame({
      water: [WATER.ref],
      owners,
      players: [A, B],
    });
    expect(chokepointController(game, cp)).toBe(A);
  });

  it("breaks a tie by smaller smallID", () => {
    const A = { smallID: () => 3 };
    const B = { smallID: () => 1 };
    const owners = new Map<number, number>([
      [NEIGHBOR_REF.get("4,5")!, 3], // A: 1 tile
      [NEIGHBOR_REF.get("6,5")!, 1], // B: 1 tile -> tie -> smaller smallID wins
    ]);
    const game = makeControlGame({
      water: [WATER.ref],
      owners,
      players: [A, B],
    });
    expect(chokepointController(game, cp)).toBe(B);
  });

  it("only owned coastal land counts (terra nullius is ignored)", () => {
    const B = { smallID: () => 2 };
    // (4,5) is terra nullius; (6,5) is owned by B (smallID 2).
    const owners = new Map<number, number>([[NEIGHBOR_REF.get("6,5")!, 2]]);
    const game = makeControlGame({
      water: [WATER.ref],
      owners,
      players: [B],
    });
    expect(chokepointController(game, cp)).toBe(B);
  });

  it("returns null when nobody owns the coastal window", () => {
    const game = makeControlGame({
      water: [WATER.ref],
      owners: new Map(),
      players: [],
    });
    expect(chokepointController(game, cp)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pure toll / interdiction math
// ---------------------------------------------------------------------------

describe("tollForTier", () => {
  it("returns the TIER_BASE_TOLL scaled by goldMultiplier", () => {
    expect(tollForTier(CHOKEPOINT_TIERS.Global, 1)).toBe(
      BigInt(TIER_BASE_TOLL.Global),
    );
    expect(tollForTier(CHOKEPOINT_TIERS.Major, 2)).toBe(BigInt(3000 * 2));
    expect(tollForTier(CHOKEPOINT_TIERS.Minor, 1.5)).toBe(
      BigInt(Math.round(1500 * 1.5)),
    );
  });
});

describe("interdictMultiplier", () => {
  it("keeps (1 - suggestedInterdictionFraction) of the payout", () => {
    expect(interdictMultiplier(getChokepoint("hormuz")!)).toBeCloseTo(0.5);
    expect(interdictMultiplier(getChokepoint("drake")!)).toBeCloseTo(0.85);
  });
});

// ---------------------------------------------------------------------------
// TradeShipExecution integration (realistic world vs classic)
// ---------------------------------------------------------------------------

type Harness = {
  game: any;
  origOwner: any;
  dstOwner: any;
  controller: any;
  tradeShip: any;
  srcPort: any;
  dstPort: any;
  exec: TradeShipExecution;
};

async function makeHarness(opts: {
  realistic: boolean;
  map?: string;
}): Promise<Harness> {
  const game = await setup(opts.map ?? "world", {
    gameMap: GameMapType.World,
    infiniteGold: true,
    instantBuild: true,
    ...(opts.realistic
      ? { publicGameModifiers: { isRealisticWorld: true } }
      : {}),
  });

  const origOwner = {
    id: vi.fn(() => 1),
    clientID: vi.fn(() => null),
    addGold: vi.fn(),
    addTradeGold: vi.fn(),
    isOnSameTeam: vi.fn(() => false),
    isAlliedWith: vi.fn(() => false),
    canTrade: vi.fn(() => true),
    isLobbyCreator: vi.fn(() => false),
  } as any;
  const dstOwner = {
    id: vi.fn(() => 2),
    clientID: vi.fn(() => null),
    addGold: vi.fn(),
    addTradeGold: vi.fn(),
    isOnSameTeam: vi.fn(() => false),
    isAlliedWith: vi.fn(() => false),
    canTrade: vi.fn(() => true),
  } as any;
  const controller = {
    id: vi.fn(() => 9),
    smallID: vi.fn(() => 9),
    clientID: vi.fn(() => null),
    addGold: vi.fn(),
    hasEmbargoAgainst: vi.fn(() => false),
  } as any;
  const tradeShip = {
    isActive: vi.fn(() => true),
    owner: vi.fn(() => origOwner),
    id: vi.fn(() => 123),
    move: vi.fn(),
    setTargetUnit: vi.fn(),
    setSafeFromPirates: vi.fn(),
    touch: vi.fn(),
    delete: vi.fn(),
    tile: vi.fn(() => 32),
  } as any;
  const srcPort = {
    id: vi.fn(() => 101),
    tile: vi.fn(() => 10),
    owner: vi.fn(() => origOwner),
    isActive: vi.fn(() => true),
    isUnderConstruction: vi.fn(() => false),
    isMarkedForDeletion: vi.fn(() => false),
  } as any;
  const dstPort = {
    id: vi.fn(() => 102),
    tile: vi.fn(() => 100),
    owner: vi.fn(() => dstOwner),
    isActive: vi.fn(() => true),
    isUnderConstruction: vi.fn(() => false),
    isMarkedForDeletion: vi.fn(() => false),
  } as any;

  const exec = new TradeShipExecution(origOwner, srcPort, dstPort);
  exec.init(game, 0);
  (exec as any).pathFinder = {
    next: vi.fn(() => ({ status: PathStatus.NEXT, node: 32 })),
    findPath: vi.fn((from: number) => [from]),
    pathForTraversal: vi.fn(() => [32]),
  } as any;
  (exec as any).tradeShip = tradeShip;

  return {
    game,
    origOwner,
    dstOwner,
    controller,
    tradeShip,
    srcPort,
    dstPort,
    exec,
  };
}

describe("TradeShipExecution chokepoint toll (realistic world)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records the Global toll once per voyage and pays it out of the payout", async () => {
    const { game, origOwner, dstOwner, controller, exec } = await makeHarness({
      realistic: true,
    });
    vi.spyOn(Chokepoints, "chokepointContains").mockImplementation(
      (c: any) => c.id === "hormuz",
    );
    vi.spyOn(ChokepointToll, "chokepointController").mockReturnValue(
      controller,
    );

    exec.tick(1);
    // Same strait re-entered: one toll per strait per voyage.
    exec.tick(2);
    expect((exec as any).chokepointsTolledThisVoyage).toHaveLength(1);
    // Nothing is minted while the ship sails.
    expect(controller.addGold).not.toHaveBeenCalled();

    // A payout well above the toll so neither side is capped.
    vi.spyOn(game.config(), "tradeShipGold").mockReturnValue(20_000n);
    (exec as any).complete();
    const payout = BigInt(
      Math.floor(20_000 * game.config().tradeMultiplier("other")),
    );
    // TIER_BASE_TOLL.Global * goldMultiplier(1)
    expect(controller.addGold).toHaveBeenCalledTimes(1);
    expect(controller.addGold).toHaveBeenCalledWith(5000n);
    const ownerGain = origOwner.addGold.mock.calls[0][0] as bigint;
    expect(ownerGain).toBe(payout - 5000n);
    expect(dstOwner.addGold).toHaveBeenCalledWith(ownerGain, expect.anything());
    expect(ownerGain + 5000n).toBe(payout);
  });

  it("never deducts more than the payout", async () => {
    const { game, origOwner, controller, exec } = await makeHarness({
      realistic: true,
    });
    (exec as any).chokepointsTolledThisVoyage = [{ id: "hormuz", controller }];
    vi.spyOn(game.config(), "tradeShipGold").mockReturnValue(1_000n);
    (exec as any).complete();
    const payout = BigInt(
      Math.floor(1_000 * game.config().tradeMultiplier("other")),
    );
    expect(controller.addGold).toHaveBeenCalledWith(payout);
    expect(origOwner.addGold.mock.calls[0][0]).toBe(0n);
  });

  it("scans a strait once per voyage even when it has no controller", async () => {
    const { exec } = await makeHarness({ realistic: true });
    vi.spyOn(Chokepoints, "chokepointContains").mockImplementation(
      (c: any) => c.id === "hormuz",
    );
    const spy = vi
      .spyOn(ChokepointToll, "chokepointController")
      .mockReturnValue(null);

    exec.tick(1);
    exec.tick(2);
    exec.tick(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not toll on a map that is not the Normal World size", async () => {
    const { exec, controller } = await makeHarness({
      realistic: true,
      map: "ocean_and_land",
    });
    vi.spyOn(Chokepoints, "chokepointContains").mockReturnValue(true as any);
    vi.spyOn(ChokepointToll, "chokepointController").mockReturnValue(
      controller,
    );

    exec.tick(1);
    expect(controller.addGold).not.toHaveBeenCalled();
  });

  it("does not toll when running in classic mode", async () => {
    const { exec, controller } = await makeHarness({ realistic: false });
    vi.spyOn(Chokepoints, "chokepointContains").mockReturnValue(true as any);
    vi.spyOn(ChokepointToll, "chokepointController").mockReturnValue(
      controller,
    );

    exec.tick(1);
    expect(controller.addGold).not.toHaveBeenCalled();
  });
});

describe("TradeShipExecution chokepoint interdiction (realistic world)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reduces the arrival payout when the controller embargoes the destination", async () => {
    const { game, origOwner, dstOwner, controller, srcPort, dstPort, exec } =
      await makeHarness({ realistic: true });
    (exec as any).tilesTraveled = 5;
    (exec as any).chokepointsTolledThisVoyage = [{ id: "hormuz", controller }];
    controller.hasEmbargoAgainst = vi.fn(() => true);
    vi.spyOn(game.config(), "tradeShipGold").mockReturnValue(100_000n);

    (exec as any).complete();

    const cfg = game.config();
    const base = cfg.tradeShipGold(5, origOwner);
    const pre = BigInt(Math.floor(Number(base) * cfg.tradeMultiplier("other")));
    // hormuz suggestedInterdictionFraction = 0.5 -> keep 0.5, then the toll.
    const expected = BigInt(Math.floor(Number(pre) * 0.5)) - 5000n;

    expect(origOwner.addGold).toHaveBeenCalledWith(expected, srcPort.tile());
    expect(dstOwner.addGold).toHaveBeenCalledWith(expected, dstPort.tile());
    expect(controller.addGold).toHaveBeenCalledWith(5000n);
  });

  it("does not reduce the payout without an embargo", async () => {
    const { game, origOwner, dstOwner, controller, srcPort, dstPort, exec } =
      await makeHarness({ realistic: true });
    (exec as any).tilesTraveled = 5;
    (exec as any).chokepointsTolledThisVoyage = [{ id: "hormuz", controller }];
    controller.hasEmbargoAgainst = vi.fn(() => false);
    vi.spyOn(game.config(), "tradeShipGold").mockReturnValue(100_000n);

    (exec as any).complete();

    const cfg = game.config();
    const base = cfg.tradeShipGold(5, origOwner);
    const expected =
      BigInt(Math.floor(Number(base) * cfg.tradeMultiplier("other"))) - 5000n;
    expect(origOwner.addGold).toHaveBeenCalledWith(expected, srcPort.tile());
    expect(dstOwner.addGold).toHaveBeenCalledWith(expected, dstPort.tile());
  });

  it("ignores interdiction in classic mode", async () => {
    const { game, origOwner, dstOwner, controller, srcPort, dstPort, exec } =
      await makeHarness({ realistic: false });
    (exec as any).tilesTraveled = 5;
    (exec as any).chokepointsTolledThisVoyage = [{ id: "hormuz", controller }];
    controller.hasEmbargoAgainst = vi.fn(() => true);

    (exec as any).complete();

    const cfg = game.config();
    const base = cfg.tradeShipGold(5, origOwner);
    // Classic mode pays the unscaled base and applies no interdiction.
    const expected = base;
    expect(origOwner.addGold).toHaveBeenCalledWith(expected, srcPort.tile());
    expect(dstOwner.addGold).toHaveBeenCalledWith(expected, dstPort.tile());
  });
});

describe("TradeShipExecution snapshot", () => {
  const base = {
    active: true,
    initialized: true,
    tradeShip: null,
    wasCaptured: false,
    pathFinder: null,
    tilesTraveled: 3,
    motionPlanId: 1,
    motionPlanDst: null,
    origOwner: 1,
    srcPort: 1,
    dstPort: 2,
  };

  it("migrates a v1 record to empty chokepoint state", () => {
    const state = readVersioned(TradeShipExecutionSnapshot, {
      v: 1,
      d: base,
    });
    expect(state.chokepointsChecked).toEqual([]);
    expect(state.chokepointsTolledThisVoyage).toEqual([]);
  });

  it("round-trips checked and tolled straits with their controller", () => {
    const state = {
      ...base,
      chokepointsChecked: ["hormuz", "suez"],
      chokepointsTolledThisVoyage: [{ id: "hormuz", controller: 4 }],
    };
    const rec = TradeShipExecutionSnapshot.write(state);
    expect(readVersioned(TradeShipExecutionSnapshot, rec)).toEqual(state);
  });
});

// ---------------------------------------------------------------------------
// Boxes against the real World map terrain
// ---------------------------------------------------------------------------

describe.each(["world", "../../../resources/maps/world"])(
  "chokepoint boxes on the real World map (%s)",
  (mapName) => {
    it.each(CHOKEPOINTS.map((c) => [c.id, c] as const))(
      "%s covers ocean with land on its coast",
      async (_id, cp) => {
        const game = await setup(mapName, { gameMap: GameMapType.World });
        const map = game.map();
        let ocean = 0;
        let coast = 0;
        for (let y = cp.bbox.y0; y <= cp.bbox.y1; y++) {
          for (let x = cp.bbox.x0; x <= cp.bbox.x1; x++) {
            const t = map.ref(x, y);
            if (!map.isOcean(t)) continue;
            ocean++;
            const nbuf = new Array<number>(8);
            const n = game.neighbors8(t, nbuf);
            for (let i = 0; i < n; i++) if (map.isLand(nbuf[i])) coast++;
          }
        }
        expect(ocean).toBeGreaterThan(0);
        expect(coast).toBeGreaterThan(0);
      },
    );

    it.each(CHOKEPOINTS.map((c) => [c.id, c] as const))(
      "%s is controlled by a player owning its coast",
      async (_id, cp) => {
        const game = await setup(mapName, { gameMap: GameMapType.World });
        const map = game.map();
        const player = game.addPlayer(
          playerInfo("controller", PlayerType.Human),
        );
        expect(chokepointController(game, cp)).toBeNull();
        let given = false;
        for (let y = cp.bbox.y0; y <= cp.bbox.y1 && !given; y++) {
          for (let x = cp.bbox.x0; x <= cp.bbox.x1 && !given; x++) {
            const t = map.ref(x, y);
            if (!map.isOcean(t)) continue;
            const nbuf = new Array<number>(8);
            const n = game.neighbors8(t, nbuf);
            for (let i = 0; i < n && !given; i++) {
              if (map.isLand(nbuf[i])) {
                player.conquer(nbuf[i]);
                given = true;
              }
            }
          }
        }
        expect(chokepointController(game, cp)).toBe(player);
      },
    );
  },
);
