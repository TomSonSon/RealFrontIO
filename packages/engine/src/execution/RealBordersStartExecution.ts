import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { startingAlliancePairs } from "@openfront/engine-api/resources/RealismBlocs";
import {
  roster,
  rosterNameOf,
} from "@openfront/engine-api/resources/RealismCountries";
import { REALISM_STRUCTURES } from "@openfront/engine-api/resources/RealismStructures";
import { GameID } from "@openfront/engine-api/Schemas";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { zInt } from "@openfront/engine-lib/snapshot/SnapshotType";
import { simpleHash } from "@openfront/engine-lib/Util";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import {
  placeStartingStructure,
  placeStartingUnit,
} from "../realism/RealisticStructures";
import {
  isRealismCountry,
  seedStartingRelations,
} from "../realism/RealisticWorld";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type { ExecRecord, SnapshotReader } from "../snapshot/SnapshotContext";
import { NationExecution } from "./NationExecution";
import { PlayerExecution } from "./PlayerExecution";
import {
  claimCountry,
  isClaimableCountry,
  rosterNationsByName,
} from "./RealBordersClaim";

// A human who never picked a country gets one of the larger, active countries.
const AUTO_CLAIM_MIN_TILES = 1250;

// Structures placed per tick once play starts. Keeps the rail and train station
// work of the start from landing on one tick.
const STRUCTURES_PER_TICK = 200;

/**
 * Real borders: once the spawn phase ends, starts the countries. The first tick
 * claims, seeds relations and starts the executions. Then the real-world
 * structures are placed in batches, in REALISM_STRUCTURES order, and the
 * execution deactivates after the last batch.
 */
export class RealBordersStartExecution implements Execution {
  private active = true;
  private mg: Game;
  private started = false;
  private cursor = 0;
  private placed = 0;
  private skipped = 0;

  constructor(private gameID: GameID) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(): void {
    if (this.mg.inSpawnPhase()) return;
    if (!this.started) {
      this.started = true;
      this.claimUnspawnedHumans();
      this.seedRelations();
      this.seedStartingAlliances();
      this.placeFallbackCapitals();
      this.addExecutions();
      return;
    }
    this.placeStructures();
  }

  // Only reached when no client picked a country before the spawn phase ended.
  private claimUnspawnedHumans(): void {
    const humans = this.mg
      .allPlayers()
      .filter((p) => p.type() === PlayerType.Human && !p.hasSpawned());
    for (const human of humans) {
      const candidates = this.unclaimedCountries();
      if (candidates.length === 0) return;
      const random = new PseudoRandom(
        simpleHash(this.gameID) + simpleHash(human.id()),
      );
      claimCountry(this.mg, human, random.randElement(candidates));
    }
  }

  private unclaimedCountries(): Player[] {
    const byName = rosterNationsByName(this.mg);
    const out: Player[] = [];
    for (const c of roster()) {
      if (c.passive) continue;
      const player = byName.get(c.name);
      if (
        player === undefined ||
        !isClaimableCountry(player) ||
        player.numTilesOwned() < AUTO_CLAIM_MIN_TILES
      ) {
        continue;
      }
      out.push(player);
    }
    return out;
  }

  // After the claims, so a claimed human carries its country's relations.
  private seedRelations(): void {
    seedStartingRelations(this.livingCountries(), true);
  }

  // After seedRelations, so treaty partners keep their relation.
  private seedStartingAlliances(): void {
    const countries = this.livingCountriesByKey();
    const pairs = startingAlliancePairs(new Set(countries.keys()));
    for (const [a, b] of pairs) {
      const first = countries.get(a);
      const second = countries.get(b);
      if (first === undefined || second === undefined) continue;
      this.mg.seedTreatyAlliance(first, second);
    }
  }

  private livingCountries(): Player[] {
    return this.mg
      .allPlayers()
      .filter((p) => p.isAlive() && isRealismCountry(p));
  }

  private livingCountriesByKey(): Map<string, Player> {
    return new Map(
      this.livingCountries().map((p) => [p.realismKey(), p] as const),
    );
  }

  // A country with no capital in the real-world data keeps the anchor city.
  private placeFallbackCapitals(): void {
    const withCapital = new Set(
      REALISM_STRUCTURES.filter((s) => s.capital === true).map((s) =>
        rosterNameOf(s.country),
      ),
    );
    for (const player of this.livingCountries()) {
      if (withCapital.has(player.realismKey())) continue;
      const spawn = player.spawnTile();
      if (spawn === undefined) continue;
      placeStartingUnit(
        this.mg,
        player,
        "city",
        this.mg.x(spawn),
        this.mg.y(spawn),
      );
    }
  }

  private placeStructures(): void {
    const owners = this.livingCountriesByKey();
    const end = Math.min(
      this.cursor + STRUCTURES_PER_TICK,
      REALISM_STRUCTURES.length,
    );
    for (; this.cursor < end; this.cursor++) {
      const structure = REALISM_STRUCTURES[this.cursor];
      if (placeStartingStructure(this.mg, owners, structure)) {
        this.placed++;
      } else {
        this.skipped++;
      }
    }
    if (this.cursor === REALISM_STRUCTURES.length) {
      this.active = false;
    }
  }

  private addExecutions(): void {
    const passive = new Set(
      roster()
        .filter((c) => c.passive)
        .map((c) => c.name),
    );
    for (const nation of this.mg.nations()) {
      const player = this.mg.player(nation.playerInfo.id);
      // A claimed country has no tiles and must not run an AI.
      if (!player.isAlive()) continue;
      this.mg.addExecution(new PlayerExecution(player));
      if (!passive.has(nation.playerInfo.name)) {
        this.mg.addExecution(new NationExecution(this.gameID, nation));
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }

  snapshot(): ExecRecord {
    return RealBordersStartExecutionSnapshot.write({
      active: this.active,
      gameID: this.gameID,
      initialized: this.mg !== undefined,
      started: this.started,
      cursor: this.cursor,
      placed: this.placed,
      skipped: this.skipped,
    });
  }

  restoreSnapshot(s: RealBordersStartState, r: SnapshotReader): void {
    this.active = s.active;
    this.gameID = s.gameID;
    if (s.initialized) this.mg = r.game;
    this.started = s.started;
    this.cursor = s.cursor;
    this.placed = s.placed;
    this.skipped = s.skipped;
  }
}

const RealBordersStartStateSchema = z.object({
  active: z.boolean(),
  gameID: z.string(),
  initialized: z.boolean(),
  started: z.boolean(),
  cursor: zInt(),
  placed: zInt(),
  skipped: zInt(),
});
type RealBordersStartState = z.infer<typeof RealBordersStartStateSchema>;

export const RealBordersStartExecutionSnapshot = execSnapshotType({
  name: "RealBordersStart",
  version: 1,
  schema: RealBordersStartStateSchema,
  cls: () => RealBordersStartExecution,
});
