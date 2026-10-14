import {
  countryIndexRemap,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import {
  decodeRealWorldCountryRaster,
  REAL_WORLD_WIDTH,
} from "@openfront/engine-api/resources/RealWorldCountries";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type { ExecRecord } from "../snapshot/SnapshotContext";
import { rosterNationsByName } from "./RealBordersClaim";

/**
 * Real borders: gives every roster country its real land and spawn tile during
 * init(), so it is in place from tick 0. Runs once, then deactivates.
 */
export class RealBordersInitExecution implements Execution {
  private done = false;

  init(mg: Game): void {
    if (mg.width() !== REAL_WORLD_WIDTH) {
      throw new Error(`real borders needs a ${REAL_WORLD_WIDTH}-wide map`);
    }
    const raster = decodeRealWorldCountryRaster();
    const remap = countryIndexRemap();

    const byName = rosterNationsByName(mg);

    const countries = roster();
    const owners: Player[] = [];
    for (const c of countries) {
      const player = byName.get(c.name);
      if (player === undefined) {
        throw new Error(`real borders: no player for ${c.name}`);
      }
      owners[c.index] = player;
    }

    const firstTile: number[] = [];
    for (let tile = 0; tile < raster.length; tile++) {
      const index = remap[raster[tile]];
      if (index === 0) continue;
      if (!mg.isLand(tile) || mg.isImpassable(tile)) continue;
      firstTile[index] ??= tile;
      owners[index].conquer(tile);
    }

    for (const c of countries) {
      const anchor = mg.ref(c.anchor[0], c.anchor[1]);
      const owned = mg.owner(anchor) === owners[c.index];
      owners[c.index].setSpawnTile(
        owned ? anchor : (firstTile[c.index] ?? anchor),
      );
    }

    this.done = true;
  }

  tick(): void {}

  isActive(): boolean {
    return !this.done;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }

  snapshot(): ExecRecord {
    return RealBordersInitExecutionSnapshot.write({ done: this.done });
  }

  restoreSnapshot(s: RealBordersInitState): void {
    this.done = s.done;
  }
}

/** Land of raster countries with no roster entry (Antarctica); it stays unowned. */
export function neutralLandTiles(mg: Game): number {
  const raster = decodeRealWorldCountryRaster();
  const remap = countryIndexRemap();
  let count = 0;
  for (let tile = 0; tile < raster.length; tile++) {
    if (raster[tile] === 0 || remap[raster[tile]] !== 0) continue;
    if (mg.isLand(tile)) count++;
  }
  return count;
}

const RealBordersInitStateSchema = z.object({ done: z.boolean() });
type RealBordersInitState = z.infer<typeof RealBordersInitStateSchema>;

export const RealBordersInitExecutionSnapshot = execSnapshotType({
  name: "RealBordersInit",
  version: 1,
  schema: RealBordersInitStateSchema,
  cls: () => RealBordersInitExecution,
});
