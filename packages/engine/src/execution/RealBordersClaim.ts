import { TileRef } from "@openfront/engine-api/game/GameMap";
import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { Game, Player } from "../game/Game";
import { PlayerExecution } from "./PlayerExecution";

/**
 * Real borders: a live roster nation that no client plays. A claimed country
 * keeps no tiles, so it is no longer alive and cannot be claimed twice.
 */
export function isClaimableCountry(player: Player): boolean {
  return (
    player.type() === PlayerType.Nation &&
    player.clientID() === null &&
    player.isAlive() &&
    player.spawnTile() !== undefined
  );
}

/**
 * Real borders: roster nations by name. A human is never matched to a country
 * by its name, even when the names are equal.
 */
export function rosterNationsByName(game: Game): Map<string, Player> {
  const out = new Map<string, Player>();
  for (const p of game.allPlayers()) {
    if (p.type() === PlayerType.Nation && p.clientID() === null) {
      out.set(p.name(), p);
    }
  }
  return out;
}

/** The claimable roster country owning `tile`, or null. */
export function claimableCountryAt(game: Game, tile: TileRef): Player | null {
  if (!game.isLand(tile) || !game.hasOwner(tile)) return null;
  const owner = game.owner(tile);
  if (!owner.isPlayer() || !isClaimableCountry(owner)) return null;
  return owner;
}

/**
 * Real borders: gives an unspawned human a roster country. The human takes its
 * land, name-key (for relations), troops and gold, and spawn tile. The country
 * is left with no tiles, so it is retired.
 */
export function claimCountry(game: Game, human: Player, country: Player): void {
  const spawnTile = country.spawnTile();
  if (spawnTile === undefined) {
    throw new Error(`real borders: ${country.name()} has no spawn tile`);
  }
  for (const tile of Array.from(country.tiles())) {
    human.conquer(tile);
  }
  human.setRealismKey(country.name());
  human.addTroops(country.troops() - human.troops());
  const goldDiff = country.gold() - human.gold();
  if (goldDiff > 0n) human.addGold(goldDiff);
  if (goldDiff < 0n) human.removeGold(-goldDiff);

  human.setSpawnTile(spawnTile);
  game.addExecution(new PlayerExecution(human));
  game.stats().recordSpawnTile(human, spawnTile);
}
