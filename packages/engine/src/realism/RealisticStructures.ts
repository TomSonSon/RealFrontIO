import { Structures, UnitType } from "@openfront/engine-api/game/GameTypes";
import { rosterNameOf } from "@openfront/engine-api/resources/RealismCountries";
import type { RealismStructure } from "@openfront/engine-api/resources/RealismStructures";
import { CityExecution } from "../execution/CityExecution";
import { DefensePostExecution } from "../execution/DefensePostExecution";
import { FactoryExecution } from "../execution/FactoryExecution";
import { MissileSiloExecution } from "../execution/MissileSiloExecution";
import { PortExecution } from "../execution/PortExecution";
import { SAMLauncherExecution } from "../execution/SAMLauncherExecution";
import type { Execution, Game, Player, Unit } from "../game/Game";

/**
 * Real borders: places one real-world structure for its country's owner at
 * game start. The unit is built free and runs the same type-specific execution
 * a finished construction gets. Returns false (nothing placed) when the owner
 * is absent, the type is disabled, or the tile is not valid for it.
 */
export function placeStartingStructure(
  game: Game,
  owners: ReadonlyMap<string, Player>,
  structure: RealismStructure,
): boolean {
  const country = rosterNameOf(structure.country);
  const owner = country === undefined ? undefined : owners.get(country);
  if (owner === undefined) return false;

  return placeStartingUnit(
    game,
    owner,
    structure.kind,
    structure.x,
    structure.y,
  );
}

/**
 * Places a starting structure of `kind` for `owner` at map coordinates (x, y),
 * after the same validation as placeStartingStructure.
 */
export function placeStartingUnit(
  game: Game,
  owner: Player,
  kind: RealismStructure["kind"],
  x: number,
  y: number,
): boolean {
  const type = unitTypeOf(kind);
  if (game.config().isUnitDisabled(type)) return false;
  if (!game.isValidCoord(x, y)) return false;

  const tile = game.ref(x, y);
  if (game.owner(tile) !== owner || !game.isLand(tile)) return false;
  if (game.isImpassable(tile)) return false;
  if (type === UnitType.Port && !game.isShore(tile)) return false;
  if (
    game
      .nearbyUnits(tile, 1, Structures.types)
      .some(({ unit }) => unit.tile() === tile)
  ) {
    return false;
  }

  const unit = owner.buildStartingUnit(type, tile);
  game.addExecution(executionFor(kind, owner, unit));
  return true;
}

function unitTypeOf(kind: RealismStructure["kind"]): UnitType {
  switch (kind) {
    case "city":
      return UnitType.City;
    case "port":
      return UnitType.Port;
    case "factory":
      return UnitType.Factory;
    case "silo":
      return UnitType.MissileSilo;
    case "sam":
      return UnitType.SAMLauncher;
    case "post":
      return UnitType.DefensePost;
  }
}

function executionFor(
  kind: RealismStructure["kind"],
  owner: Player,
  unit: Unit,
): Execution {
  switch (kind) {
    case "city":
      return new CityExecution(unit);
    case "port":
      return new PortExecution(unit);
    case "factory":
      return new FactoryExecution(unit);
    case "silo":
      return new MissileSiloExecution(unit);
    case "sam":
      return new SAMLauncherExecution(owner, null, unit);
    case "post":
      return new DefensePostExecution(unit);
  }
}
