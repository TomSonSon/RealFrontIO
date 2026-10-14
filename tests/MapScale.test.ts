import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerType,
  TerrainType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import type {
  PlayerLike,
  UnitLike,
} from "@openfront/engine-api/game/ReadViews";
import {
  realismSourceNames,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import { realismCityCount } from "@openfront/engine-api/resources/RealismStructures";
import { GameConfig } from "@openfront/engine-api/Schemas";
import { realBordersCountry } from "@openfront/engine-lib/configuration/RealBordersStrength";
import {
  AttackLogicInput,
  EngineConfig,
} from "@openfront/engine/configuration/EngineConfig";
import { describe, expect, test } from "vitest";

const REAL_BORDERS: Partial<GameConfig> = {
  gameMap: GameMapType.RealisticWorld,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  publicGameModifiers: { isRealisticWorld: true },
};

// Legacy realism: the Realistic World flag on classic World, which is not real borders.
const LEGACY_REALISM: Partial<GameConfig> = {
  gameMap: GameMapType.World,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  publicGameModifiers: { isRealisticWorld: true },
};

function config(overrides: Partial<GameConfig> = {}): EngineConfig {
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
      ...overrides,
    },
    false,
  );
}

const realBorders = config(REAL_BORDERS);
const classic = config();
const legacy = config(LEGACY_REALISM);

describe("map scale", () => {
  test("is 2.5 in real borders and exactly 1 in classic and legacy", () => {
    expect(realBorders.mapScale()).toBe(2.5);
    expect(realBorders.mapAreaScale()).toBe(6.25);
    expect(classic.mapScale()).toBe(1);
    expect(classic.mapAreaScale()).toBe(1);
    expect(legacy.isRealBorders()).toBe(false);
    expect(legacy.mapScale()).toBe(1);
  });
});

describe("base config getters", () => {
  // [name, getter, classic value (old literal), real borders value (old x 2.5)]
  const rows: [string, (c: EngineConfig) => number, number, number][] = [
    ["defensePostRange", (c) => c.defensePostRange(), 30, 75],
    ["trainStationMaxRange", (c) => c.trainStationMaxRange(), 110, 275],
    ["structureMinDist", (c) => c.structureMinDist(), 15, 37.5],
    ["maxSamRange", (c) => c.maxSamRange(), 150, 375],
    ["samRange(1)", (c) => c.samRange(1), 70, 175],
    ["samRange(5)", (c) => c.samRange(5), 102, 255],
    [
      "nukeAllianceBreakThreshold",
      (c) => c.nukeAllianceBreakThreshold(),
      100,
      625,
    ],
    [
      "defaultNukeTargetableRange",
      (c) => c.defaultNukeTargetableRange(),
      150,
      375,
    ],
    ["parabolaMinHeight", (c) => c.parabolaMinHeight(), 50, 125],
    [
      "atom outer radius",
      (c) => c.nukeMagnitudes(UnitType.AtomBomb).outer,
      30,
      75,
    ],
    [
      "atom inner radius",
      (c) => c.nukeMagnitudes(UnitType.AtomBomb).inner,
      12,
      30,
    ],
    [
      "hydro outer radius",
      (c) => c.nukeMagnitudes(UnitType.HydrogenBomb).outer,
      100,
      250,
    ],
    [
      "hydro inner radius",
      (c) => c.nukeMagnitudes(UnitType.HydrogenBomb).inner,
      80,
      200,
    ],
    [
      "MIRV warhead outer radius",
      (c) => c.nukeMagnitudes(UnitType.MIRVWarhead).outer,
      18,
      45,
    ],
    [
      "MIRV warhead inner radius",
      (c) => c.nukeMagnitudes(UnitType.MIRVWarhead).inner,
      12,
      30,
    ],
  ];

  for (const [name, get, classicValue, realValue] of rows) {
    test(`${name}: classic ${classicValue}, real borders ${realValue}`, () => {
      expect(get(classic)).toBe(classicValue);
      expect(get(legacy)).toBe(classicValue);
      expect(get(realBorders)).toBeCloseTo(realValue, 9);
    });
  }
});

describe("engine config getters", () => {
  // [name, getter, classic value (old literal), real borders value (old x 2.5)]
  const rows: [string, (c: EngineConfig) => number, number, number][] = [
    ["trainStationMinRange", (c) => c.trainStationMinRange(), 15, 37.5],
    ["minDistanceBetweenPlayers", (c) => c.minDistanceBetweenPlayers(), 30, 75],
    ["radiusPortSpawn", (c) => c.radiusPortSpawn(), 20, 50],
    [
      "tradeShipShortRangeDebuff",
      (c) => c.tradeShipShortRangeDebuff(),
      300,
      750,
    ],
    ["warshipPatrolRange", (c) => c.warshipPatrolRange(), 100, 250],
    ["warshipTargettingRange", (c) => c.warshipTargettingRange(), 130, 325],
    [
      "warshipPassiveHealingRange",
      (c) => c.warshipPassiveHealingRange(),
      150,
      375,
    ],
    ["warshipDockingRange (unchanged)", (c) => c.warshipDockingRange(), 5, 5],
    ["defaultSamRange", (c) => c.defaultSamRange(), 70, 175],
    ["defaultSamMissileSpeed", (c) => c.defaultSamMissileSpeed(), 12, 30],
    ["atom speed", (c) => c.nukeSpeed(UnitType.AtomBomb), 10, 25],
    ["hydro speed", (c) => c.nukeSpeed(UnitType.HydrogenBomb), 10, 25],
    ["MIRV speed", (c) => c.nukeSpeed(UnitType.MIRV), 15, 37.5],
    ["MIRV warhead speed", (c) => c.nukeSpeed(UnitType.MIRVWarhead), 22, 55],
    ["mirvRange", (c) => c.mirvRange(), 1500, 3750],
    ["mirvMinimumSpread", (c) => c.mirvMinimumSpread(), 55, 137.5],
    ["mirvSeparationHeight", (c) => c.mirvSeparationHeight(), 500, 1250],
    [
      "mirvSeparationHeightOffset",
      (c) => c.mirvSeparationHeightOffset(),
      50,
      125,
    ],
    ["focusRadius", (c) => c.focusRadius(), 40, 100],
    ["trainSpeed", (c) => c.trainSpeed(), 2, 5],
    ["samDistanceScale", (c) => c.samDistanceScale(), 1, 2.5],
  ];

  for (const [name, get, classicValue, realValue] of rows) {
    test(`${name}: classic ${classicValue}, real borders ${realValue}`, () => {
      expect(get(classic)).toBe(classicValue);
      expect(get(legacy)).toBe(classicValue);
      expect(get(realBorders)).toBeCloseTo(realValue, 9);
    });
  }

  test("tradeShipGold keeps its gold constants and only moves with the scaled debuff", () => {
    const player = stubPlayer();
    const dist = 1000;
    const debuff = 300 * 2.5;
    const expected = Math.floor(
      75_000 / (1 + Math.exp(-0.03 * (dist - debuff))) + 50 * dist,
    );
    expect(Number(realBorders.tradeShipGold(dist, player))).toBeCloseTo(
      expected,
      -1,
    );
  });

  test("the SAM missile speed is an integer in real borders", () => {
    expect(Number.isInteger(realBorders.defaultSamMissileSpeed())).toBe(true);
  });
});

function attackInput(
  defender: boolean,
  overrides: Partial<AttackLogicInput> = {},
): AttackLogicInput {
  return {
    terrain: TerrainType.Plains,
    attackTroops: 1000,
    attacker: { type: PlayerType.Human, numTiles: 100 },
    defender: defender
      ? {
          type: PlayerType.Human,
          numTiles: 100,
          troops: 0,
          isTraitor: false,
          isDisconnectedTeammate: false,
        }
      : null,
    defenderHasDefensePost: false,
    falloutRatio: null,
    borderSize: 10,
    ...overrides,
  };
}

function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe("attack logic scale", () => {
  test("tile budget (tickFraction) is divided by the map scale", () => {
    const input = attackInput(true);
    const base = legacy.attackLogic(input).tickFraction;
    const scaled = realBorders.attackLogic(input).tickFraction;
    expect(relativeError(scaled, base / 2.5)).toBeLessThan(1e-6);
  });

  test("terra nullius tile budget is divided by the map scale", () => {
    const input = attackInput(false);
    const base = legacy.attackLogic(input).tickFraction;
    const scaled = realBorders.attackLogic(input).tickFraction;
    expect(relativeError(scaled, base / 2.5)).toBeLessThan(1e-6);
  });

  test("the per-tile base loss term is divided by the map area scale", () => {
    // Zero defender troops drop the density term, leaving only the base term.
    const input = attackInput(true);
    const base = legacy.attackLogic(input).attackerTroopLoss;
    const scaled = realBorders.attackLogic(input).attackerTroopLoss;
    expect(relativeError(scaled, base / 6.25)).toBeLessThan(1e-6);
  });
});

function cityStub(): UnitLike {
  return {
    type: () => UnitType.City,
    isUnderConstruction: () => false,
    level: () => 1,
  } as unknown as UnitLike;
}

/** A PlayerLike that owns `tiles` land tiles, `cities` cities and a country key. */
function stub(opts: {
  key: string;
  tiles: number;
  cities?: number;
  type?: PlayerType;
  troops?: number;
}): PlayerLike {
  const cities = Array.from({ length: opts.cities ?? 0 }, cityStub);
  return {
    id: () => "p",
    smallID: () => 1,
    isPlayer: () => true,
    type: () => opts.type ?? PlayerType.Nation,
    isLobbyCreator: () => false,
    numTilesOwned: () => opts.tiles,
    troops: () => opts.troops ?? 0,
    gold: () => 0n,
    units: (t: UnitType) => (t === UnitType.City ? cities : []),
    realismKey: () => opts.key,
  };
}

function stubPlayer(): PlayerLike {
  return stub({ key: "France", tiles: 300 });
}

function startOf(name: string): number {
  const start = realBordersCountry(name)?.start;
  if (start === undefined) throw new Error(`no country ${name}`);
  return start;
}

function tilesOf(name: string): number {
  const country = roster().find((c) => c.name === name);
  if (country === undefined) throw new Error(`no roster country ${name}`);
  return country.tiles;
}

function seededOf(name: string): number {
  const seeded = realBordersCountry(name)?.seededCities;
  if (seeded === undefined) throw new Error(`no country ${name}`);
  return seeded;
}

const NAMED = [
  "Luxembourg",
  "Germany",
  "China",
  "United States",
  "India",
  "Russia",
];

// Six named countries plus fourteen more with seeded cities, in roster order.
const SAMPLE_WITH_CITIES = [
  ...NAMED,
  ...roster()
    .map((c) => c.name)
    .filter((name) => !NAMED.includes(name) && seededOf(name) > 0)
    .slice(0, 14),
];

describe("real borders cap with seeded cities", () => {
  test("the sample has 20 countries with seeded cities", () => {
    expect(SAMPLE_WITH_CITIES).toHaveLength(20);
  });

  test("cap at tick 0 is 1.5 x start when cities equal the seeded count", () => {
    for (const name of SAMPLE_WITH_CITIES) {
      const cap = realBorders.maxTroops(
        stub({
          key: name,
          tiles: tilesOf(name),
          cities: seededOf(name),
        }),
      );
      const target = 1.5 * startOf(name);
      expect(relativeError(cap, target)).toBeLessThan(0.01);
    }
  });

  test("the seeded count matches realismCityCount summed over merged names", () => {
    for (const name of SAMPLE_WITH_CITIES) {
      const expected = realismSourceNames(name).reduce(
        (sum, source) => sum + realismCityCount(source),
        0,
      );
      expect(seededOf(name)).toBe(expected);
    }
    expect(seededOf("China")).toBeGreaterThan(realismCityCount("China"));
  });

  test("with half the cities the cap is start x (tiles factor + 0.25)", () => {
    for (const name of ["Russia", "United States"]) {
      expect(seededOf(name) % 2).toBe(0);
      const cap = realBorders.maxTroops(
        stub({
          key: name,
          tiles: tilesOf(name),
          cities: seededOf(name) / 2,
        }),
      );
      expect(relativeError(cap, 1.25 * startOf(name))).toBeLessThan(1e-9);
    }
  });

  test("conquering a city raises the cap, and losing one lowers it", () => {
    for (const name of SAMPLE_WITH_CITIES) {
      const seeded = seededOf(name);
      const at = (cities: number) =>
        realBorders.maxTroops(
          stub({ key: name, tiles: tilesOf(name), cities }),
        );
      expect(at(seeded + 1)).toBeGreaterThan(at(seeded));
      expect(at(seeded - 1)).toBeLessThan(at(seeded));
    }
  });

  test("the cap still grows with land", () => {
    const name = "France";
    const tiles = tilesOf(name);
    const small = realBorders.maxTroops(
      stub({ key: name, tiles, cities: seededOf(name) }),
    );
    const large = realBorders.maxTroops(
      stub({ key: name, tiles: tiles * 2, cities: seededOf(name) }),
    );
    expect(large).toBeGreaterThan(small);
  });

  test("the cap stays finite with 14.3e9 troops", () => {
    const name = "United States";
    const player = stub({
      key: name,
      tiles: tilesOf(name),
      cities: seededOf(name),
      troops: 14.3e9,
    });
    expect(Number.isFinite(realBorders.maxTroops(player))).toBe(true);
    expect(Number.isFinite(realBorders.troopIncreaseRate(player))).toBe(true);
  });
});
