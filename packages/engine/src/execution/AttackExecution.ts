import { GameMap, TileRef } from "@openfront/engine-api/game/GameMap";
import {
  Difficulty,
  MessageType,
  PlayerID,
  PlayerType,
  TerrainType,
  TerraNullius,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { renderTroops } from "@openfront/engine-lib/Format";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import {
  zInt,
  zNum,
  zPlayerRef,
  zRandom,
  zRef,
  zTile,
  zTiles,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { assertNever } from "@openfront/engine-lib/Util";
import { z } from "zod";
import { AttackLogicInput } from "../configuration/EngineConfig";
import { Attack, Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { FlatBinaryHeap } from "./utils/FlatBinaryHeap"; // adjust path if needed

const malusForRetreat = 25;

// Focused-attack tuning ("push a specific region harder"). A focus tile makes
// the attack concentrate its frontier and per-tick budget near that point (the
// Schwerpunkt / main effort) while other borders become economy-of-force.
const FOCUS_RADIUS = 40; // tiles from the focus tile treated as the "main effort"
const FOCUS_PRIORITY_BONUS = 60; // min-heap priority offset (focus dequeues first)
const FOCUS_SPEED_MIN = 0.5; // budget cost multiplier at the focus (2x throughput)
const FOCUS_SPEED_MAX = 2.0; // budget cost multiplier far away (0.5x throughput)

/**
 * Per-tick budget weight for a conquered tile at `dist` tiles from the focus.
 * Near the focus tiles are cheap (more conquered per tick); far away they are
 * expensive (fewer per tick — the economy-of-force drip on other borders).
 * Monotone, deterministic, pure.
 */
export function focusBudgetWeight(dist: number): number {
  if (dist <= FOCUS_RADIUS) return FOCUS_SPEED_MIN;
  if (dist >= FOCUS_RADIUS * 2) return FOCUS_SPEED_MAX;
  const t = (dist - FOCUS_RADIUS) / FOCUS_RADIUS;
  return FOCUS_SPEED_MIN + (FOCUS_SPEED_MAX - FOCUS_SPEED_MIN) * t;
}
export class AttackExecution implements Execution {
  private active: boolean = true;
  private toConquer = new FlatBinaryHeap();

  private random = new PseudoRandom(123);

  private target: Player | TerraNullius;

  private mg: Game;
  // Direct GameMap reference to skip the Game delegation hop in hot loops.
  private map: GameMap;

  private attack: Attack | null = null;

  // Cached smallIDs for integer owner comparisons in hot loops.
  private ownerSmallID: number;
  private targetSmallID: number;
  // Reusable neighbor buffers to avoid closures/allocation in hot loops.
  private nbuf: TileRef[] = [0, 0, 0, 0];
  private nbuf2: TileRef[] = [0, 0, 0, 0];
  // Realistic-World right-of-passage: smallIDs of the attacker + everyone
  // reachable through a chain of alliances. Recomputed each refresh; used by
  // the tick loop to let a target tile that only borders an allied (passage)
  // tile be conquered, without ever taking the ally's own tile.
  private friendlyGroundIDs: Set<number> = new Set();

  constructor(
    private startTroops: number | null = null,
    private _owner: Player,
    private _targetID: PlayerID | null,
    private sourceTile: TileRef | null = null,
    private removeTroops: boolean = true,
    private focusTile: TileRef | null = null,
  ) {}

  public targetID(): PlayerID | null {
    return this._targetID;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game, ticks: number) {
    if (!this.active) {
      return;
    }
    this.mg = mg;
    this.map = mg.map();

    if (this._targetID !== null && !mg.hasPlayer(this._targetID)) {
      console.warn(`target ${this._targetID} not found`);
      this.active = false;
      return;
    }

    this.target =
      this._targetID === this.mg.terraNullius().id()
        ? mg.terraNullius()
        : mg.player(this._targetID);
    this.ownerSmallID = this._owner.smallID();
    this.targetSmallID = this.target.smallID();

    if (this._owner === this.target) {
      console.error(`Player ${this._owner} cannot attack itself`);
      this.active = false;
      return;
    }

    // ALLIANCE CHECK — block attacks on friendly (ally or same team)
    if (this.target.isPlayer()) {
      const targetPlayer = this.target as Player;
      if (this._owner.isFriendly(targetPlayer)) {
        console.warn(
          `${this._owner.displayName()} cannot attack ${targetPlayer.displayName()} because they are friendly (allied or same team)`,
        );
        this.active = false;
        return;
      }
    }

    if (this.target && this.target.isPlayer()) {
      const targetPlayer = this.target as Player;
      if (
        targetPlayer.type() !== PlayerType.Bot &&
        this._owner.type() !== PlayerType.Bot
      ) {
        // Don't let bots embargo since they can't trade anyway.
        targetPlayer.addEmbargo(this._owner, true);
        this.rejectIncomingAllianceRequests(targetPlayer);
      }
    }

    if (this.target.isPlayer() && !this._owner.canAttackPlayer(this.target)) {
      this.active = false;
      return;
    }

    this.startTroops ??= this.mg
      .config()
      .attackAmount(this._owner, this.target);
    if (this.removeTroops) {
      this.startTroops = Math.min(this._owner.troops(), this.startTroops);
      // Take the amount that was actually deducted, not the amount asked for.
      // removeTroops() floors, so a fractional request leaves the attack
      // holding troops the owner never paid for — and retreat refunds the
      // combined total, turning the leftover fractions into free troops.
      this.startTroops = this._owner.removeTroops(this.startTroops);
    }
    this.attack = this._owner.createAttack(
      this.target,
      this.startTroops,
      this.sourceTile,
      new Set<TileRef>(),
    );

    if (this.sourceTile !== null) {
      this.addNeighbors(this.sourceTile);
    } else {
      this.refreshToConquer();
    }

    // Record stats
    this.mg.stats().attack(this._owner, this.target, this.startTroops);

    for (const incoming of this._owner.incomingAttacks()) {
      if (incoming.attacker() === this.target) {
        // Target has opposing attack, cancel them out
        if (incoming.troops() > this.attack.troops()) {
          incoming.setTroops(incoming.troops() - this.attack.troops());
          this.attack.delete();
          this.active = false;
          return;
        } else {
          this.attack.setTroops(this.attack.troops() - incoming.troops());
          incoming.delete();
        }
      }
    }
    for (const outgoing of this._owner.outgoingAttacks()) {
      if (
        outgoing !== this.attack &&
        outgoing.target() === this.attack.target() &&
        // Boat attacks (sourceTile is not null) are not combined with other attacks
        this.attack.sourceTile() === null
      ) {
        this.attack.setTroops(this.attack.troops() + outgoing.troops());
        outgoing.delete();
      }
    }

    // Nothing next to the owner to conquer (no wilderness around them, or a
    // target they don't border): the attack doesn't happen. Held until the
    // next tick, the troops would sit out the regen step and come back free,
    // so one such attack per tick kept regen at its peak rate and refunded
    // past maxTroops.
    if (this.toConquer.size() === 0) {
      this.retreat();
      return;
    }

    // Only now is it known how large the attack the defender actually faces
    // is: a big assault is built by clicking repeatedly, and each click's
    // execution absorbs the earlier ones above. Recorded before the loops it
    // would measure one click, and would count an attack that cancelled out
    // and never landed.
    this.mg.stats().attackMaxIncoming(this.target, this.attack.troops());

    if (this.target.isPlayer()) {
      const difficulty = this.mg.config().gameConfig().difficulty;
      let relationChange: number;
      switch (difficulty) {
        case Difficulty.Easy:
          relationChange = -60;
          break;
        case Difficulty.Medium:
          relationChange = -70;
          break;
        case Difficulty.Hard:
          relationChange = -80;
          break;
        case Difficulty.Impossible:
          relationChange = -100;
          break;
        default:
          assertNever(difficulty);
      }
      this.target.updateRelation(this._owner, relationChange);
    }
  }

  private refreshToConquer() {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    this.toConquer.clear();
    this.attack.clearBorder();

    if (!this.mg.config().isRealisticWorld()) {
      // forEach over the dense storage — the values() generator showed up in
      // long-game profiles.
      this._owner.borderTiles().forEach((tile) => this.addNeighbors(tile));
      return;
    }

    // Multi-hop right-of-passage (Realistic World): seed the frontier from
    // every tile owned by the attacker OR a transitively-allied player, so the
    // attack can push into a target through a CHAIN of allies — using allied
    // territory as a springboard with NO ownership change (only target tiles
    // are ever conquered; addNeighbors adds only target-owned neighbours and
    // the tick loop only conquers target tiles).
    const ground = this.friendlyGroundPlayers();
    this.friendlyGroundIDs = new Set<number>(ground.map((p) => p.smallID()));
    for (const p of ground) {
      p.tiles().forEach((tile) => this.addNeighbors(tile));
    }
  }

  /**
   * The attacker plus everybody reachable through a chain of alliances (the
   * attacker's allies, their allies, ...) — the "friendly ground" an attack
   * may spring from under right-of-passage.
   */
  private friendlyGroundPlayers(): Player[] {
    const ground: Player[] = [this._owner];
    const seen = new Set<Player>([this._owner]);
    const queue: Player[] = [this._owner];
    while (queue.length > 0) {
      const p = queue.pop()!;
      for (const ally of p.allies()) {
        if (ally === this._owner || ally.smallID() === this.targetSmallID) {
          continue;
        }
        if (seen.has(ally)) continue;
        seen.add(ally);
        ground.push(ally);
        queue.push(ally);
      }
    }
    return ground;
  }

  private retreat(malusPercent = 0) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const deaths = this.attack.troops() * (malusPercent / 100);
    if (deaths) {
      this.mg.displayMessage(
        "events_display.attack_cancelled_retreat",
        MessageType.ATTACK_CANCELLED,
        this._owner.id(),
        undefined,
        { troops: renderTroops(deaths) },
      );
    }
    if (this.removeTroops === false && this.sourceTile === null) {
      // startTroops are always added to attack troops at init but not always removed from owner troops
      // subtract startTroops from attack troops so we don't give back startTroops to owner that were never removed
      // boat attacks (sourceTile !== null) are the exception: troops were removed at departure and must be returned after attack still
      this.attack.setTroops(this.attack.troops() - (this.startTroops ?? 0));
    }

    const survivors = this.attack.troops() - deaths;
    this._owner.addTroops(survivors);
    this.attack.delete();
    this.active = false;

    // Not all retreats are canceled attacks
    if (this.attack.retreated()) {
      // Record stats
      this.mg.stats().attackCancel(this._owner, this.target, survivors);
    }
  }

  tick(ticks: number) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }
    let troopCount = this.attack.troops(); // cache troop count
    const targetIsPlayer = this.target.isPlayer(); // cache target type
    const targetPlayer = targetIsPlayer ? (this.target as Player) : null; // cache target player

    if (this.attack.retreated()) {
      if (targetIsPlayer) {
        this.retreat(malusForRetreat);
      } else {
        this.retreat();
      }
      this.active = false;
      return;
    }

    if (this.attack.retreating()) {
      return;
    }

    if (!this.attack.isActive()) {
      this.active = false;
      return;
    }

    if (targetPlayer && this._owner.isFriendly(targetPlayer)) {
      // In this case a new alliance was created AFTER the attack started.
      this.retreat();
      return;
    }

    const borderSize = this.attack.borderSize() + this.random.nextInt(0, 5);
    // Each tile consumes a fraction of the tick; conquer until it is spent.
    let tickBudget = 1;

    while (tickBudget > 0) {
      if (troopCount < 1) {
        this.attack.delete();
        this.active = false;
        return;
      }

      if (this.toConquer.size() === 0) {
        this.refreshToConquer();
        this.retreat();
        return;
      }

      const tileToConquer = this.toConquer.dequeue();
      this.attack.removeBorderTile(tileToConquer);

      let onBorder = false;
      const numNeighbors = this.map.neighbors4(tileToConquer, this.nbuf);
      for (let i = 0; i < numNeighbors; i++) {
        const oid = this.map.ownerID(this.nbuf[i]);
        if (oid === this.ownerSmallID) {
          onBorder = true;
          break;
        }
        // Right-of-passage (Realistic World): an allied (transitively-friendly)
        // neighbour counts as launchable ground, so the attack can conquer a
        // target tile that only borders an ally (never the ally's own tile).
        if (
          this.mg.config().isRealisticWorld() &&
          oid !== 0 &&
          oid !== this.targetSmallID &&
          this.friendlyGroundIDs.has(oid)
        ) {
          onBorder = true;
          break;
        }
      }
      if (this.map.ownerID(tileToConquer) !== this.targetSmallID || !onBorder) {
        continue;
      }
      if (
        !this.map.isLand(tileToConquer) ||
        this.map.isImpassable(tileToConquer)
      ) {
        continue;
      }
      this.addNeighbors(tileToConquer);
      const { attackerTroopLoss, defenderTroopLoss, tickFraction } = this.mg
        .config()
        .attackLogic(
          this.attackLogicInput(troopCount, tileToConquer, borderSize),
        );
      // Focused attacks spend their per-tick budget fastest near the focus
      // (more tiles conquered there per tick) and slowest far from it.
      const weight =
        this.focusTile !== null
          ? focusBudgetWeight(
              this.map.manhattanDist(this.focusTile, tileToConquer),
            )
          : 1;
      tickBudget -= tickFraction * weight;
      troopCount -= attackerTroopLoss;
      this.attack.setTroops(troopCount);
      if (targetPlayer) {
        targetPlayer.removeTroops(defenderTroopLoss);
      }
      this._owner.conquer(tileToConquer);
      this.handleDeadDefender();
    }
  }

  private attackLogicInput(
    attackTroops: number,
    tile: TileRef,
    borderSize: number,
  ): AttackLogicInput {
    const defender = this.target.isPlayer() ? this.target : null;
    // Same test as scanning nearbyUnits() for a post owned by the defender
    // (active, not under construction, within range), without building a
    // result array per conquered tile — this runs for every tile of every
    // attack on the map.
    const defenderHasDefensePost =
      defender !== null &&
      this.mg.hasUnitNearby(
        tile,
        this.mg.config().defensePostRange(),
        UnitType.DefensePost,
        defender.id(),
      );
    return {
      terrain: this.map.terrainType(tile),
      attackTroops,
      attacker: {
        type: this._owner.type(),
        numTiles: this._owner.numTilesOwned(),
      },
      defender:
        defender === null
          ? null
          : {
              type: defender.type(),
              numTiles: defender.numTilesOwned(),
              troops: defender.troops(),
              isTraitor: defender.isTraitor(),
              isDisconnectedTeammate:
                defender.isDisconnected() && this._owner.isOnSameTeam(defender),
            },
      defenderHasDefensePost,
      falloutRatio: this.mg.hasFallout(tile)
        ? this.mg.numTilesWithFallout() / this.mg.numLandTiles()
        : null,
      borderSize,
    };
  }

  private rejectIncomingAllianceRequests(target: Player) {
    const request = this._owner
      .incomingAllianceRequests()
      .find((ar) => ar.requestor() === target);
    if (request !== undefined) {
      request.reject();
    }
  }

  private addNeighbors(tile: TileRef) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const tickNow = this.mg.ticks(); // cache tick

    const numNeighbors = this.map.neighbors4(tile, this.nbuf);
    for (let i = 0; i < numNeighbors; i++) {
      const neighbor = this.nbuf[i];
      if (
        this.map.isWater(neighbor) ||
        this.map.isImpassable(neighbor) ||
        this.map.ownerID(neighbor) !== this.targetSmallID
      ) {
        continue;
      }
      this.attack.addBorderTile(neighbor);
      let numOwnedByMe = 0;
      const numInner = this.map.neighbors4(neighbor, this.nbuf2);
      for (let j = 0; j < numInner; j++) {
        if (this.map.ownerID(this.nbuf2[j]) === this.ownerSmallID) {
          numOwnedByMe++;
        }
      }

      let mag: number;
      // In Realistic World mode mountains carry a much heavier frontier
      // penalty, so attack waves spread around (through passes/plains) rather
      // than charging the range head-on.
      const realistic = this.mg.config().isRealisticWorld();
      switch (this.map.terrainType(neighbor)) {
        case TerrainType.Plains:
          mag = realistic ? 1 : 1;
          break;
        case TerrainType.Highland:
          mag = realistic ? 1.8 : 1.5;
          break;
        case TerrainType.Mountain:
          mag = realistic ? 3.5 : 2;
          break;
        default:
          mag = 0;
          break;
      }

      // Focused attacks concentrate the frontier near the chosen tile: tiles
      // close to the focus carry a lower priority (min-heap dequeues the
      // lowest first), so they are conquered before far-flung borders, which
      // only receive the economy-of-force leftover.
      let focusPriority = 0;
      if (this.focusTile !== null) {
        const d = this.map.manhattanDist(this.focusTile, neighbor);
        if (d < FOCUS_RADIUS) {
          focusPriority = -FOCUS_PRIORITY_BONUS * (1 - d / FOCUS_RADIUS);
        }
      }

      const priority =
        (this.random.nextInt(0, 7) + 10) * (1 - numOwnedByMe * 0.5 + mag / 2) +
        tickNow +
        focusPriority;

      this.toConquer.enqueue(neighbor, priority);
    }
  }

  private handleDeadDefender() {
    if (!(this.target.isPlayer() && this.target.numTilesOwned() < 100)) return;
    const target: Player = this.target;

    this.mg.conquerPlayer(this._owner, target);

    const MAX_PASSES = 100;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let progressed = false;
      for (const tile of target.tiles()) {
        let borders = false;
        this.mg.forEachNeighbor(tile, (t) => {
          if (!borders && this.mg.owner(t) === this._owner) {
            borders = true;
          }
        });
        if (borders) {
          this._owner.conquer(tile);
          progressed = true;
        } else {
          let captured = false;
          this.mg.forEachNeighbor(tile, (neighbor) => {
            if (captured) return;
            const no = this.mg.owner(neighbor);
            if (no.isPlayer() && no !== target && !no.isFriendly(target)) {
              this.mg.player(no.id()).conquer(tile);
              captured = true;
            }
          });
          if (captured) progressed = true;
        }
      }
      if (!progressed) break;
    }
  }

  owner(): Player {
    return this._owner;
  }

  isActive(): boolean {
    return this.active;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return AttackExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      toConquer: this.toConquer.getState(),
      random: w.random(this.random),
      target: this.target === undefined ? null : w.owner(this.target),
      attack: this.attack === null ? null : w.attack(this.attack),
      startTroops: this.startTroops,
      owner: w.player(this._owner),
      targetID: this._targetID,
      sourceTile: this.sourceTile,
      focusTile: this.focusTile,
      removeTroops: this.removeTroops,
    });
  }

  restoreSnapshot(s: AttackExecutionState, r: SnapshotReader): void {
    this.active = s.active;
    this.toConquer = FlatBinaryHeap.fromState(s.toConquer);
    this.random = r.random(s.random);
    if (s.initialized) {
      this.mg = r.game;
      this.map = r.game.map();
    }
    if (s.target !== null) {
      this.target = r.owner(s.target);
      // Set together with target in init(); small ids are the stored refs.
      this.ownerSmallID = s.owner;
      this.targetSmallID = s.target;
    }
    this.attack = s.attack === null ? null : r.attack(s.attack);
    // Scratch buffers, overwritten before every read.
    this.nbuf = [0, 0, 0, 0];
    this.nbuf2 = [0, 0, 0, 0];
    // Recomputed on the next refresh; an empty set is correct until then.
    this.friendlyGroundIDs = new Set();
    this.startTroops = s.startTroops;
    this._owner = r.player(s.owner);
    this._targetID = s.targetID;
    this.sourceTile = s.sourceTile;
    this.focusTile = s.focusTile;
    this.removeTroops = s.removeTroops;
  }
}

const AttackExecutionStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  // Exact heap layout: ties between equal priorities dequeue by position.
  toConquer: z.object({
    pri: z.custom<Float32Array>(
      (v) => v instanceof Float32Array,
      "expected float32s",
    ),
    tiles: zTiles(),
    capacity: zInt(),
  }),
  random: zRandom(),
  /** Null until init() resolves the target. */
  target: zPlayerRef().nullable(),
  attack: zRef().nullable(),
  startTroops: zNum().nullable(),
  owner: zPlayerRef(),
  targetID: z.string().nullable(),
  sourceTile: zTile().nullable(),
  focusTile: zTile().nullable(),
  removeTroops: z.boolean(),
});
type AttackExecutionState = z.infer<typeof AttackExecutionStateSchema>;

export const AttackExecutionSnapshot = execSnapshotType({
  name: "Attack",
  version: 2,
  schema: AttackExecutionStateSchema,
  // v1 -> v2: added the optional focus region for region/front-focused attacks.
  migrations: {
    1: (d: unknown) => {
      const old = d as Record<string, unknown>;
      return { ...old, focusTile: old.focusTile ?? null };
    },
  },
  cls: () => AttackExecution,
});
