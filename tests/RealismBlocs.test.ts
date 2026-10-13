import {
  blocPairs,
  friendlyBlocPairs,
  REALISTIC_BLOCS,
  startingAlliancePairs,
} from "@openfront/engine-api/resources/RealismBlocs";
import { WORLD_COUNTRIES } from "@openfront/engine-api/resources/WorldCountries";
import { describe, expect, test } from "vitest";

const PLAYER_NAMES = new Set(
  WORLD_COUNTRIES.map((c) => c.manifestName ?? c.name),
);
const NATO = REALISTIC_BLOCS.find((b) => b.id === "nato")!.members;

function isSorted(pairs: readonly (readonly [string, string])[]): boolean {
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    if (!(a < b)) return false;
    if (i === 0) continue;
    const [pa, pb] = pairs[i - 1];
    if (pa > a || (pa === a && pb >= b)) return false;
  }
  return true;
}

describe("RealismBlocs data", () => {
  test("every bloc member exists as a player name in WORLD_COUNTRIES", () => {
    const missing = REALISTIC_BLOCS.flatMap((bloc) =>
      bloc.members
        .filter((name) => !PLAYER_NAMES.has(name))
        .map((name) => `${bloc.id}: ${name}`),
    );
    expect(missing).toEqual([]);
  });

  test("no bloc lists the same member twice", () => {
    for (const bloc of REALISTIC_BLOCS) {
      expect(new Set(bloc.members).size, bloc.id).toBe(bloc.members.length);
    }
  });
});

describe("blocPairs", () => {
  const all = new Set(PLAYER_NAMES);

  test("NATO yields n*(n-1)/2 pairs among its present members", () => {
    const natoPresent = NATO.filter((name) => all.has(name));
    const n = natoPresent.length;
    const natoSet = new Set(natoPresent);
    const pairs = startingAlliancePairs(all).filter(
      ([a, b]) => natoSet.has(a) && natoSet.has(b),
    );
    expect(n).toBe(32);
    expect(pairs.length).toBe((n * (n - 1)) / 2);
  });

  test("output is sorted ascending and deterministic", () => {
    const first = startingAlliancePairs(all);
    const second = startingAlliancePairs(new Set([...all].reverse()));
    expect(isSorted(first)).toBe(true);
    expect(second).toEqual(first);
    expect(isSorted(friendlyBlocPairs(all))).toBe(true);
  });

  test("no pair contains a name twice and every pair is ordered a < b", () => {
    for (const [a, b] of [
      ...startingAlliancePairs(all),
      ...friendlyBlocPairs(all),
    ]) {
      expect(a).not.toBe(b);
      expect(a < b).toBe(true);
    }
  });

  test("friendly pairs exclude treaty pairs", () => {
    const treaty = new Set(
      startingAlliancePairs(all).map(([a, b]) => `${a}|${b}`),
    );
    const friendly = friendlyBlocPairs(all);
    expect(friendly.length).toBeGreaterThan(0);
    for (const [a, b] of friendly) {
      expect(treaty.has(`${a}|${b}`)).toBe(false);
    }
  });

  test("with a restricted present set only pairs of present names appear", () => {
    const present = new Set(["United States", "Japan", "Russia", "Belarus"]);
    expect(blocPairs("treaty", present)).toEqual([
      ["Belarus", "Russia"],
      ["Japan", "United States"],
    ]);
    for (const [a, b] of [
      ...blocPairs("treaty", present),
      ...blocPairs("friendly", present),
    ]) {
      expect(present.has(a)).toBe(true);
      expect(present.has(b)).toBe(true);
    }
  });

  test("ANZUS is a treaty pair of Australia and New Zealand only", () => {
    const anzus = REALISTIC_BLOCS.find((b) => b.id === "anzus");
    expect(anzus?.kind).toBe("treaty");
    expect(anzus?.members).toEqual(["Australia", "New Zealand"]);
    expect(startingAlliancePairs(all)).toContainEqual([
      "Australia",
      "New Zealand",
    ]);
    expect(friendlyBlocPairs(all)).not.toContainEqual([
      "Australia",
      "New Zealand",
    ]);
  });

  test("US-NZ is friendly, not a treaty, after ANZUS obligations were suspended", () => {
    const usNz = REALISTIC_BLOCS.find((b) => b.id === "us-nz");
    expect(usNz?.kind).toBe("friendly");
    expect(startingAlliancePairs(all)).not.toContainEqual([
      "New Zealand",
      "United States",
    ]);
    expect(friendlyBlocPairs(all)).toContainEqual([
      "New Zealand",
      "United States",
    ]);
  });

  test("Pacific treaty and friendly pairs for a restricted present set", () => {
    const present = new Set([
      "Australia",
      "New Zealand",
      "United States",
      "United Kingdom",
    ]);
    expect(startingAlliancePairs(present)).toEqual([
      ["Australia", "New Zealand"],
      ["Australia", "United Kingdom"],
      ["Australia", "United States"],
      ["United Kingdom", "United States"],
    ]);
    expect(friendlyBlocPairs(present)).toEqual([
      ["New Zealand", "United States"],
    ]);
  });

  test("an empty present set yields no pairs", () => {
    expect(startingAlliancePairs(new Set())).toEqual([]);
    expect(friendlyBlocPairs(new Set())).toEqual([]);
  });
});
