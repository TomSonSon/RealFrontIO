import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import type {
  PlayerLike,
  UnitLike,
} from "@openfront/engine-api/game/ReadViews";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { realBordersCountry as realBordersCountryOf } from "@openfront/engine-lib/configuration/RealBordersStrength";
import { EngineConfig } from "@openfront/engine/configuration/EngineConfig";
import { describe, expect, test, vi } from "vitest";

// Every roster country has seeded cities in the structures data, so the
// fallback branch is reached by reporting zero seeded cities for every country.
vi.mock(
  "@openfront/engine-lib/configuration/RealBordersStrength",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@openfront/engine-lib/configuration/RealBordersStrength")
      >();
    return {
      ...original,
      realBordersCountry: (key: string) => {
        const country = original.realBordersCountry(key);
        return country === undefined
          ? undefined
          : { ...country, seededCities: 0 };
      },
    };
  },
);

const REAL_BORDERS: Partial<GameConfig> = {
  gameMap: GameMapType.RealisticWorld,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  publicGameModifiers: { isRealisticWorld: true },
};

function config(): EngineConfig {
  return new EngineConfig(
    {
      gameMap: GameMapType.World,
      gameMapSize: GameMapSize.Normal,
      gameMode: GameMode.FFA,
      gameType: GameType.Singleplayer,
      difficulty: Difficulty.Medium,
      nations: "default",
      donateGold: false,
      donateTroops: false,
      bots: 0,
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      randomSpawn: false,
      ...REAL_BORDERS,
    },
    false,
  );
}

function cityStub(): UnitLike {
  return {
    type: () => UnitType.City,
    isUnderConstruction: () => false,
    level: () => 1,
  } as unknown as UnitLike;
}

function stub(key: string, tiles: number, cities: number): PlayerLike {
  const list = Array.from({ length: cities }, cityStub);
  return {
    id: () => "p",
    smallID: () => 1,
    isPlayer: () => true,
    type: () => PlayerType.Nation,
    isLobbyCreator: () => false,
    numTilesOwned: () => tiles,
    troops: () => 0,
    gold: () => 0n,
    units: (t: UnitType) => (t === UnitType.City ? list : []),
    realismKey: () => key,
  };
}

describe("real borders cap without seeded cities", () => {
  test("keeps 1.5 x start for the land and adds 0.10 x start per city", () => {
    const france = roster().find((c) => c.name === "France");
    if (france === undefined) throw new Error("no France");
    const start = realBordersCountryOf("France")?.start;
    if (start === undefined) throw new Error("no start");
    const cap = config().maxTroops(stub("France", france.tiles, 2));
    expect(
      Math.abs(cap - (1.5 * start + 2 * 0.1 * start)) / start,
    ).toBeLessThan(1e-9);
  });
});
