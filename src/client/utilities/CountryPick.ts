import type { TileRef } from "@openfront/engine-api/game/GameMap";
import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { startingAlliancePairs } from "@openfront/engine-api/resources/RealismBlocs";
import {
  countryNeighbors,
  type RealismCountry,
  roster,
} from "@openfront/engine-api/resources/RealismCountries";
import { REALISTIC_RELATIONS } from "@openfront/engine-api/resources/RealismData";
import type { GameView, PlayerView } from "../view";

const RIVAL_SCORE = -50;

export interface CountryProfile {
  allies: string[];
  rivals: string[];
  neighbours: string[];
}

export function rosterCountry(name: string): RealismCountry | undefined {
  return roster().find((country) => country.name === name);
}

/** The roster country that owns this land tile, or null for anything else. */
export function countryPickOwner(
  game: GameView,
  tile: TileRef,
): PlayerView | null {
  if (!game.isLand(tile)) return null;
  const owner = game.owner(tile);
  if (!owner.isPlayer()) return null;
  if (owner.type() !== PlayerType.Nation) return null;
  return rosterCountry(owner.name()) === undefined ? null : owner;
}

/** Rank by troops among living nations, 1 being the strongest. */
export function strengthRank(
  players: readonly PlayerView[],
  target: PlayerView,
): { rank: number; total: number } {
  const nations = players.filter(
    (p) => p.type() === PlayerType.Nation && p.isAlive(),
  );
  const troops = target.troops();
  const stronger = nations.filter((p) => p.troops() > troops).length;
  return { rank: stronger + 1, total: nations.length };
}

export function countryProfile(country: RealismCountry): CountryProfile {
  const names = roster().map((c) => c.name);

  const allies = startingAlliancePairs(new Set(names))
    .filter(([a, b]) => a === country.name || b === country.name)
    .map(([a, b]) => (a === country.name ? b : a))
    .sort();

  const rivals = names
    .filter((other) => other !== country.name)
    .map((other) => ({
      other,
      score: Math.min(
        REALISTIC_RELATIONS[country.name]?.[other] ?? 0,
        REALISTIC_RELATIONS[other]?.[country.name] ?? 0,
      ),
    }))
    .filter((r) => r.score <= RIVAL_SCORE)
    .sort((a, b) => a.score - b.score || a.other.localeCompare(b.other))
    .map((r) => r.other);

  const neighbours = countryNeighbors(country.index).flatMap((index) => {
    const neighbour = roster().find((c) => c.index === index);
    return neighbour === undefined ? [] : [neighbour.name];
  });

  return { allies, rivals, neighbours };
}
