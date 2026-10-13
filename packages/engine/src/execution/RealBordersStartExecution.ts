import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { startingAlliancePairs } from "@openfront/engine-api/resources/RealismBlocs";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { GameID } from "@openfront/engine-api/Schemas";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { simpleHash } from "@openfront/engine-lib/Util";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import {
  isRealismCountry,
  placeNationCapital,
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
const AUTO_CLAIM_MIN_TILES = 200;

/**
 * Real borders: once the spawn phase ends, starts the countries. Runs once,
 * then deactivates.
 */
export class RealBordersStartExecution implements Execution {
  private active = true;
  private mg: Game;

  constructor(private gameID: GameID) {}

  init(mg: Game): void {
    this.mg = mg;
  }

  tick(): void {
    if (this.mg.inSpawnPhase()) return;
    this.active = false;
    this.claimUnspawnedHumans();
    this.seedRelations();
    this.seedStartingAlliances();
    this.placeCapitals();
    this.addExecutions();
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
    const countries = new Map(
      this.livingCountries().map((p) => [p.realismKey(), p] as const),
    );
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

  private placeCapitals(): void {
    const spawns = new Map(
      this.mg.nations().map((n) => [n.playerInfo.name, n.spawnCell] as const),
    );
    for (const nation of this.mg.nations()) {
      const spawn = nation.spawnCell;
      if (spawn === undefined) continue;
      const player = this.mg.player(nation.playerInfo.id);
      if (!player.isAlive()) continue;
      placeNationCapital(this.mg, player, this.mg.ref(spawn.x, spawn.y));
    }
    for (const human of this.mg.allPlayers()) {
      if (human.type() !== PlayerType.Human || !human.isAlive()) continue;
      const spawn = spawns.get(human.realismKey());
      if (spawn === undefined) continue;
      placeNationCapital(this.mg, human, this.mg.ref(spawn.x, spawn.y));
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
    });
  }

  restoreSnapshot(s: RealBordersStartState, r: SnapshotReader): void {
    this.active = s.active;
    this.gameID = s.gameID;
    if (s.initialized) this.mg = r.game;
  }
}

const RealBordersStartStateSchema = z.object({
  active: z.boolean(),
  gameID: z.string(),
  initialized: z.boolean(),
});
type RealBordersStartState = z.infer<typeof RealBordersStartStateSchema>;

export const RealBordersStartExecutionSnapshot = execSnapshotType({
  name: "RealBordersStart",
  version: 1,
  schema: RealBordersStartStateSchema,
  cls: () => RealBordersStartExecution,
});
