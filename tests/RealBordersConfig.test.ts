import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  PlayerType,
} from "@openfront/engine-api/game/GameTypes";
import {
  AdditionalNation,
  Nation as ManifestNation,
} from "@openfront/engine-api/game/MapFiles";
import { roster } from "@openfront/engine-api/resources/RealismCountries";
import { GameConfig, GameStartInfo } from "@openfront/engine-api/Schemas";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { EngineConfig } from "@openfront/engine/configuration/EngineConfig";
import { createNationsForGame } from "@openfront/engine/game/NationCreation";
import { describe, expect, test } from "vitest";
import { setup } from "./util/Setup";

const REAL_BORDERS: Partial<GameConfig> = {
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
      bots: 5,
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
      randomSpawn: true,
      ...overrides,
    },
    false,
  );
}

function gameStart(overrides: Partial<GameConfig>): GameStartInfo {
  return {
    gameID: "rb1234",
    lobbyCreatedAt: 0,
    config: {
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
    players: [],
  };
}

function manifestNations(count: number): ManifestNation[] {
  return Array.from({ length: count }, (_, i) => ({
    coordinates: [i, i] as [number, number],
    flag: "",
    name: `Manifest${i}`,
  }));
}

const noExtras: AdditionalNation[] = [];

describe("isRealBorders", () => {
  test("true only for flag + World + Normal + FFA", () => {
    expect(config(REAL_BORDERS).isRealBorders()).toBe(true);
  });

  test("false for Compact, Team mode, non-World maps, or the flag off", () => {
    expect(
      config({
        ...REAL_BORDERS,
        gameMapSize: GameMapSize.Compact,
      }).isRealBorders(),
    ).toBe(false);
    expect(
      config({ ...REAL_BORDERS, gameMode: GameMode.Team }).isRealBorders(),
    ).toBe(false);
    expect(
      config({ ...REAL_BORDERS, gameMap: GameMapType.Asia }).isRealBorders(),
    ).toBe(false);
    expect(
      config({
        ...REAL_BORDERS,
        publicGameModifiers: undefined,
      }).isRealBorders(),
    ).toBe(false);
    expect(config().isRealBorders()).toBe(false);
  });
});

describe("real borders config overrides", () => {
  test("real borders: no bots, no random spawn, 3 minute nation immunity", () => {
    const c = config({ ...REAL_BORDERS, bots: 5, randomSpawn: true });
    expect(c.bots()).toBe(0);
    expect(c.numBots()).toBe(0);
    expect(c.isRandomSpawn()).toBe(false);
    expect(c.nationSpawnImmunityDuration()).toBe(1800);
  });

  test("classic World game keeps its bots, random spawn and immunity", () => {
    const c = config({ bots: 5, randomSpawn: true });
    expect(c.bots()).toBe(5);
    expect(c.isRandomSpawn()).toBe(true);
    expect(c.nationSpawnImmunityDuration()).toBe(50);
  });

  test("legacy realism on Compact keeps its bots, random spawn and immunity", () => {
    const c = config({
      ...REAL_BORDERS,
      gameMapSize: GameMapSize.Compact,
      bots: 5,
      randomSpawn: true,
    });
    expect(c.bots()).toBe(5);
    expect(c.isRandomSpawn()).toBe(true);
    expect(c.nationSpawnImmunityDuration()).toBe(50);
  });

  test("real borders game built through setup() reports the overrides", async () => {
    const game = await setup(
      "world",
      { ...REAL_BORDERS, bots: 5, randomSpawn: true },
      [],
      undefined,
      EngineConfig,
    );
    expect(game.config().bots()).toBe(0);
    expect(game.config().isRandomSpawn()).toBe(false);
    expect(game.config().nationSpawnImmunityDuration()).toBe(1800);
  });
});

describe("createNationsForGame in real borders", () => {
  test("returns one nation per roster country, in roster order", () => {
    const nations = createNationsForGame(
      gameStart({ ...REAL_BORDERS, nations: 3 }),
      manifestNations(72),
      noExtras,
      0,
      new PseudoRandom(1),
    );
    const countries = roster();
    expect(nations).toHaveLength(countries.length);
    nations.forEach((n, i) => {
      const c = countries[i];
      expect(n.playerInfo.name).toBe(c.name);
      expect(n.playerInfo.nationFlag).toBe(c.flag || null);
      expect(n.playerInfo.playerType).toBe(PlayerType.Nation);
      expect(n.spawnCell?.x).toBe(c.anchor[0]);
      expect(n.spawnCell?.y).toBe(c.anchor[1]);
    });
  });

  test("is deterministic for the same seed", () => {
    const run = () =>
      createNationsForGame(
        gameStart(REAL_BORDERS),
        manifestNations(72),
        noExtras,
        0,
        new PseudoRandom(9),
      ).map((n) => [n.playerInfo.id, n.playerInfo.name]);
    expect(run()).toEqual(run());
  });

  test("classic World keeps the manifest nations in manifest order", () => {
    const manifest = manifestNations(4);
    const nations = createNationsForGame(
      gameStart({ nations: "default" }),
      manifest,
      noExtras,
      0,
      new PseudoRandom(1),
    );
    expect(nations.map((n) => n.playerInfo.name)).toEqual(
      manifest.map((m) => m.name),
    );
  });
});
