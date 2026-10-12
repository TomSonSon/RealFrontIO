import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  Gold,
  MessageType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import {
  chokepointContains,
  CHOKEPOINTS,
  getChokepoint,
} from "@openfront/engine-api/resources/Chokepoints";
import { renderNumber } from "@openfront/engine-lib/Format";
import {
  zInt,
  zPlayerRef,
  zRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { findClosestBy } from "@openfront/engine-lib/Util";
import { z } from "zod";
import { Execution, Game, Player, Unit } from "../game/Game";
import { WaterPathFinder } from "../pathfinding/PathFinder";
import { PathStatus } from "../pathfinding/types";
import {
  chokepointController,
  hasChokepointMap,
  interdictMultiplier,
  isTollExempt,
  tollForTier,
} from "../realism/ChokepointToll";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import {
  restoreWaterPathFinder,
  WaterPathFinderSchema,
  waterPathFinderState,
} from "../snapshot/PathfinderSnapshots";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class TradeShipExecution implements Execution {
  private active = true;
  private mg: Game;
  private tradeShip: Unit | undefined;
  private wasCaptured = false;
  private pathFinder: WaterPathFinder;
  private tilesTraveled = 0;
  private motionPlanId = 1;
  private motionPlanDst: TileRef | null = null;
  /**
   * Chokepoints (strait ids) already evaluated this voyage (Realistic World),
   * whether or not they produced a toll, so a strait's box is scanned once.
   * Mirrors `wasCaptured`/`tilesTraveled`: snapshot-serialized so replays
   * reproduce exactly ("one toll per strait per voyage").
   */
  private chokepointsChecked: string[] = [];
  /** Straits that charged a toll, with the controller that was paid. */
  private chokepointsTolledThisVoyage: { id: string; controller: Player }[] =
    [];

  constructor(
    private origOwner: Player,
    private srcPort: Unit,
    private _dstPort: Unit,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    const stagger = mg.nextShipStagger("tradeShip");
    this.pathFinder = new WaterPathFinder(mg, stagger, true); // memoized: port tile to port tile repeats
  }

  tick(ticks: number): void {
    if (this.pathFinder.rebuilt) {
      this.motionPlanDst = null; // Force motion plan re-recording
    }

    if (this.tradeShip === undefined) {
      const spawn = this.origOwner.canBuild(
        UnitType.TradeShip,
        this.srcPort.tile(),
      );
      if (spawn === false) {
        console.warn(`cannot build trade ship`);
        this.active = false;
        return;
      }
      this.tradeShip = this.origOwner.buildUnit(UnitType.TradeShip, spawn, {
        targetUnit: this._dstPort,
        lastSetSafeFromPirates: ticks,
      });
      this.mg.stats().boatSendTrade(this.origOwner, this._dstPort.owner());
    }

    if (!this.tradeShip.isActive()) {
      this.active = false;
      return;
    }

    const tradeShipOwner = this.tradeShip.owner();
    const dstPortOwner = this._dstPort.owner();
    if (this.wasCaptured !== true && this.origOwner !== tradeShipOwner) {
      // Store as variable in case ship is recaptured by previous owner
      this.wasCaptured = true;
      this.mg.displayMessage(
        "events_display.trade_ship_captured",
        MessageType.UNIT_DESTROYED,
        this.origOwner.id(),
        undefined,
        { name: tradeShipOwner.displayName() },
        this.tradeShip.id(),
        tradeShipOwner.id(),
      );
    }

    // If a player captures another player's port while trading we should delete
    // the ship.
    if (dstPortOwner.id() === this.srcPort.owner().id()) {
      this.tradeShip.delete(false);
      this.active = false;
      return;
    }

    if (
      !this.wasCaptured &&
      (!this._dstPort.isActive() || !tradeShipOwner.canTrade(dstPortOwner))
    ) {
      this.tradeShip.delete(false);
      this.active = false;
      return;
    }

    const curTile = this.tradeShip.tile();

    if (
      this.wasCaptured &&
      (tradeShipOwner !== dstPortOwner || !this._dstPort.isActive())
    ) {
      const myComponent = this.mg.getWaterComponent(curTile);
      const nearestPort = findClosestBy(
        tradeShipOwner.units(UnitType.Port),
        (port) => this.mg.manhattanDist(port.tile(), curTile),
        (port) =>
          port.isActive() &&
          !port.isMarkedForDeletion() &&
          !port.isUnderConstruction() &&
          myComponent !== null &&
          this.mg.hasWaterComponent(port.tile(), myComponent),
      );
      if (nearestPort === null) {
        this.tradeShip.delete(false);
        this.active = false;
        return;
      } else {
        this._dstPort = nearestPort;
        this.tradeShip.setTargetUnit(this._dstPort);
        // Plan-driven units don't emit per-tick unit updates, so force a sync for the new target.
        this.tradeShip.touch();
      }
    }

    if (curTile === this.dstPort()) {
      this.complete();
      return;
    }

    const dst = this._dstPort.tile();
    const result = this.pathFinder.next(curTile, dst);

    switch (result.status) {
      case PathStatus.NEXT:
        if (dst !== this.motionPlanDst) {
          this.motionPlanId++;
          const from = result.node;
          const path = this.pathFinder.pathForTraversal(from, dst);

          this.mg.recordMotionPlan({
            kind: "grid",
            unitId: this.tradeShip.id(),
            planId: this.motionPlanId,
            startTick: ticks + 1,
            ticksPerStep: 1,
            path,
          });
          this.motionPlanDst = dst;
        }
        // Update safeFromPirates status
        if (this.mg.isWater(result.node) && this.mg.isShoreline(result.node)) {
          this.tradeShip.setSafeFromPirates();
        }
        this.tradeShip.move(result.node);
        this.tilesTraveled++;
        // Realistic World: passive chokepoint toll - the controller earns a
        // deterministic toll (one per strait per voyage) when the ship passes
        // through a chokepoint's water band.
        if (this.chokepointsActive()) {
          this.applyChokepointTolls(result.node);
        }
        break;
      case PathStatus.COMPLETE:
        this.complete();
        return;
      case PathStatus.NOT_FOUND:
        console.warn("captured trade ship cannot find route");
        if (this.tradeShip.isActive()) {
          this.tradeShip.delete(false);
        }
        this.active = false;
        return;
    }
  }

  private chokepointsActive(): boolean {
    return this.mg.config().isRealisticWorld() && hasChokepointMap(this.mg);
  }

  /**
   * Realistic World passive toll: for each chokepoint whose water band the
   * ship's current tile lies in, credit its controller a fixed tier toll -
   * capped at one toll per strait per voyage (tracked in
   * `chokepointsTolledThisVoyage`). The controller's own / team / ally ships
   * transit toll-free (right of passage). Deterministic: pure helpers over
   * current tile ownership.
   */
  private applyChokepointTolls(tile: TileRef): void {
    if (this.tradeShip === undefined) return;
    const shipOwner = this.tradeShip.owner();
    const x = this.mg.map().x(tile);
    const y = this.mg.map().y(tile);
    for (const cp of CHOKEPOINTS) {
      if (this.chokepointsChecked.includes(cp.id)) continue;
      if (!chokepointContains(cp, x, y)) continue;
      this.chokepointsChecked.push(cp.id);
      const controller = chokepointController(this.mg, cp);
      if (controller === null) continue;
      if (isTollExempt(shipOwner, controller)) continue;
      const toll = tollForTier(cp.tier, this.mg.config().goldMultiplier());
      controller.addGold(toll);
      this.chokepointsTolledThisVoyage.push({ id: cp.id, controller });
    }
  }

  /**
   * Realistic World interdiction (opt-in blockade): if a chokepoint's
   * controller is embargoing the ship's destination-port owner, the voyage's
   * gold is reduced by the strait's `suggestedInterdictionFraction`. Applied
   * as a compounded multiplier on arrival; deterministic (Math.floor, fixed
   * order). Only straits this voyage actually crossed (tolled - allies/self
   * never reach here) are considered.
   */
  private applyInterdiction(gold: Gold): Gold {
    const dstOwner = this._dstPort.owner();
    let multiplier = 1;
    for (const { id, controller } of this.chokepointsTolledThisVoyage) {
      const cp = getChokepoint(id);
      if (cp === undefined) continue;
      if (controller.hasEmbargoAgainst(dstOwner)) {
        multiplier *= interdictMultiplier(cp);
      }
    }
    if (multiplier === 1) return gold;
    return BigInt(Math.floor(Number(gold) * multiplier));
  }

  private complete() {
    this.active = false;
    this.tradeShip!.delete(false);
    const srcOwner = this.srcPort.owner();
    const dstOwner = this._dstPort.owner();
    let rel: "self" | "team" | "ally" | "other" = "other";
    if (srcOwner.id() === dstOwner.id()) rel = "self";
    else if (srcOwner.isOnSameTeam(dstOwner)) rel = "team";
    else if (srcOwner.isAlliedWith(dstOwner)) rel = "ally";

    // Relation-scaled trade (Realistic World only): bloc-allied trade is worth
    // more, rival/neutral trade is tariffed. Classic mode -> multiplier 1.
    const realistic = this.mg.config().isRealisticWorld();
    let gold = this.mg
      .config()
      .tradeShipGold(this.tilesTraveled, this.tradeShip!.owner());
    if (realistic) {
      gold = BigInt(
        Math.floor(Number(gold) * this.mg.config().tradeMultiplier(rel)),
      );
      // Chokepoint interdiction: a controller embargoing the destination
      // port's owner cuts the transiting ship's payout.
      gold = this.applyInterdiction(gold);
    }

    if (this.wasCaptured && this.tradeShip!.owner() === this.origOwner) {
      // Retaken by its original owner: the payout stands, but nobody pirated it.
      this.origOwner.addGold(gold, this._dstPort.tile());
    } else if (this.wasCaptured) {
      this.tradeShip!.owner().addGold(gold, this._dstPort.tile());
      this.tradeShip!.owner().addPiracyGold(gold);
      this.mg.displayMessage(
        "events_display.received_gold_from_captured_ship",
        MessageType.CAPTURED_ENEMY_UNIT,
        this.tradeShip!.owner().id(),
        gold,
        {
          gold: renderNumber(gold),
          name: this.origOwner.displayName(),
        },
        undefined,
        this.origOwner.id(),
      );
      // Record stats
      this.mg
        .stats()
        .boatCapturedTrade(this.tradeShip!.owner(), this.origOwner, gold);
    } else {
      this.srcPort.owner().addGold(gold, this.srcPort.tile());
      this._dstPort.owner().addGold(gold, this._dstPort.tile());
      this.srcPort.owner().addTradeGold(gold);
      this._dstPort.owner().addTradeGold(gold);
      // Record stats
      this.mg
        .stats()
        .boatArriveTrade(this.srcPort.owner(), this._dstPort.owner(), gold);
    }
    return;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  dstPort(): TileRef {
    return this._dstPort.tile();
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return TradeShipExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      tradeShip: this.tradeShip === undefined ? null : w.unit(this.tradeShip),
      wasCaptured: this.wasCaptured,
      pathFinder:
        this.pathFinder === undefined
          ? null
          : waterPathFinderState(this.pathFinder),
      tilesTraveled: this.tilesTraveled,
      motionPlanId: this.motionPlanId,
      motionPlanDst: this.motionPlanDst,
      chokepointsChecked: this.chokepointsChecked,
      chokepointsTolledThisVoyage: this.chokepointsTolledThisVoyage.map(
        (t) => ({ id: t.id, controller: w.player(t.controller) }),
      ),
      origOwner: w.player(this.origOwner),
      srcPort: w.unit(this.srcPort),
      dstPort: w.unit(this._dstPort),
    });
  }

  restoreSnapshot(s: TradeShipExecutionState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.tradeShip = s.tradeShip === null ? undefined : r.unit(s.tradeShip);
    this.wasCaptured = s.wasCaptured;
    if (s.pathFinder !== null) {
      this.pathFinder = restoreWaterPathFinder(r.game, s.pathFinder);
    }
    this.tilesTraveled = s.tilesTraveled;
    this.motionPlanId = s.motionPlanId;
    this.motionPlanDst = s.motionPlanDst;
    this.chokepointsChecked = s.chokepointsChecked;
    this.chokepointsTolledThisVoyage = s.chokepointsTolledThisVoyage.map(
      (t) => ({ id: t.id, controller: r.player(t.controller) }),
    );
    this.origOwner = r.player(s.origOwner);
    this.srcPort = r.unit(s.srcPort);
    this._dstPort = r.unit(s.dstPort);
  }
}

const TradeShipExecutionStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  tradeShip: zRef().nullable(),
  wasCaptured: z.boolean(),
  /** Null before init(). */
  pathFinder: WaterPathFinderSchema.nullable(),
  tilesTraveled: zInt(),
  motionPlanId: zInt(),
  motionPlanDst: zTile().nullable(),
  chokepointsChecked: z.array(z.string()),
  chokepointsTolledThisVoyage: z.array(
    z.object({ id: z.string(), controller: zPlayerRef() }),
  ),
  origOwner: zPlayerRef(),
  srcPort: zRef(),
  dstPort: zRef(),
});
type TradeShipExecutionState = z.infer<typeof TradeShipExecutionStateSchema>;

export const TradeShipExecutionSnapshot = execSnapshotType({
  name: "TradeShip",
  version: 2,
  schema: TradeShipExecutionStateSchema,
  // v1 -> v2: added chokepoint-toll state (Realistic World s.8.8a). Old games
  // had no chokepoint mechanic, so the voyage starts with none tolled.
  migrations: {
    1: (d: unknown) => {
      const old = d as Record<string, unknown>;
      return {
        ...old,
        chokepointsChecked: [],
        chokepointsTolledThisVoyage: [],
      };
    },
  },
  cls: () => TradeShipExecution,
});
