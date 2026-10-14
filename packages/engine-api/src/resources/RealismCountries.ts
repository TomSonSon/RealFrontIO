import manifest from "resources/maps/world/manifest.json";
import type { RealisticNationSeed } from "./RealismData";
import { REALISTIC_SEEDS } from "./RealismData";
import type { RealWorldCountry } from "./RealWorldCountries";
import {
  decodeRealWorldCountryRaster,
  REAL_WORLD_COUNTRIES,
  REAL_WORLD_WIDTH,
} from "./RealWorldCountries";

export interface RealismCountry {
  /** 1-based roster index; the value of this country's tiles in countryIndexRemap(). */
  readonly index: number;
  readonly iso3: string;
  readonly name: string;
  /** Two-letter code of a file in resources/flags, or "" when none exists. */
  readonly flag: string;
  readonly continent: string;
  readonly population: number;
  readonly gdpMd: number;
  /** Land tiles after merging dependencies into their sovereign. */
  readonly tiles: number;
  readonly spawn: readonly [number, number] | null;
  readonly anchor: readonly [number, number];
  /** Owned and conquerable, but gets no AI. */
  readonly passive: boolean;
  /** Owned and conquerable, but its AI acts slowly. */
  readonly slow: boolean;
}

/** Land of no state in real borders (Antarctic Treaty): stays neutral, has no roster entry. */
const NEUTRAL_ISO3: ReadonlySet<string> = new Set(["ATA"]);

/** Dependencies (under 250 tiles) folded into their sovereign. */
const MERGE_INTO: Readonly<Record<string, string>> = {
  ALA: "FIN",
  ATF: "FRA",
  FRO: "DNK",
  GIB: "GBR",
  HKG: "CHN",
  MAC: "CHN",
  SGS: "GBR",
};

const PASSIVE_TILES = 156;
const SLOW_TILES = 625;

const ISO3_TO_FLAG: Readonly<Record<string, string>> = {
  AFG: "af",
  AGO: "ao",
  ALB: "al",
  AND: "ad",
  ARE: "ae",
  ARM: "am",
  AUT: "at",
  AZE: "az",
  BDI: "bi",
  BEL: "be",
  BFA: "bf",
  BGD: "bd",
  BGR: "bg",
  BHR: "bh",
  BHS: "bs",
  BIH: "ba",
  BLZ: "bz",
  BRN: "bn",
  BWA: "bw",
  CAF: "cf",
  CHE: "ch",
  CHL: "cl",
  CIV: "ci",
  CMR: "cm",
  COG: "cg",
  CRI: "cr",
  CYP: "cy",
  CZE: "cz",
  DJI: "dj",
  DNK: "dk",
  DOM: "do",
  ECU: "ec",
  ERI: "er",
  ESH: "eh",
  EST: "ee",
  FJI: "fj",
  FLK: "fk",
  GAB: "ga",
  GEO: "ge",
  GHA: "gh",
  GIN: "gn",
  GMB: "gm",
  GNB: "gw",
  GNQ: "gq",
  GRC: "gr",
  GTM: "gt",
  GUY: "gy",
  HND: "hn",
  HRV: "hr",
  HTI: "ht",
  HUN: "hu",
  IRQ: "iq",
  ISR: "il",
  JAM: "jm",
  JOR: "jo",
  KGZ: "kg",
  KHM: "kh",
  KOR: "kr",
  KOS: "xk",
  KWT: "kw",
  LAO: "la",
  LBN: "lb",
  LBR: "lr",
  LIE: "li",
  LSO: "ls",
  LTU: "lt",
  LUX: "lu",
  MCO: "mc",
  MDA: "md",
  MKD: "mk",
  MLI: "ml",
  MMR: "mm",
  MNE: "me",
  MOZ: "mz",
  MRT: "mr",
  MUS: "mu",
  MWI: "mw",
  MYS: "my",
  NCL: "nc",
  NGA: "ng",
  NIC: "ni",
  NLD: "nl",
  NPL: "np",
  PAN: "pa",
  PNG: "pg",
  PRI: "pr",
  PRK: "kp",
  PRT: "pt",
  PRY: "py",
  PSE: "ps",
  QAT: "qa",
  RWA: "rw",
  SGP: "sg",
  SLB: "sb",
  SLE: "sl",
  SLV: "sv",
  SMR: "sm",
  SOM: "so",
  SRB: "rs",
  SSD: "ss",
  SUR: "sr",
  SVK: "sk",
  SVN: "si",
  SWZ: "sz",
  SYR: "sy",
  TGO: "tg",
  TJK: "tj",
  TKM: "tm",
  TLS: "tl",
  TTO: "tt",
  TUN: "tn",
  TZA: "tz",
  UGA: "ug",
  UZB: "uz",
  VNM: "vn",
  VUT: "vu",
  WSM: "ws",
  YEM: "ye",
  ZWE: "zw",
};

const MANIFEST_FLAGS: ReadonlyMap<string, string> = new Map(
  (manifest.nations as { name: string; flag: string }[]).map((n) => [
    n.name,
    n.flag,
  ]),
);

interface Built {
  readonly roster: readonly RealismCountry[];
  readonly remap: Uint16Array;
}

let built: Built | undefined;

function targetOf(c: RealWorldCountry): RealWorldCountry {
  const target = MERGE_INTO[c.iso3];
  if (target === undefined) return c;
  const sovereign = REAL_WORLD_COUNTRIES.find((s) => s.iso3 === target);
  if (sovereign === undefined) {
    throw new Error(
      `Realism merge target ${target} is not a real world country`,
    );
  }
  return sovereign;
}

function build(): Built {
  const kept = REAL_WORLD_COUNTRIES.filter(
    (c) => targetOf(c) === c && !NEUTRAL_ISO3.has(c.iso3),
  );
  const remap = new Uint16Array(REAL_WORLD_COUNTRIES.length + 1);
  const roster = kept.map((t, i): RealismCountry => {
    const group = REAL_WORLD_COUNTRIES.filter((c) => targetOf(c) === t);
    for (const c of group) remap[c.index] = i + 1;
    const tiles = group.reduce((sum, c) => sum + c.tiles, 0);
    const name = t.manifestName ?? t.name;
    return {
      index: i + 1,
      iso3: t.iso3,
      name,
      flag: MANIFEST_FLAGS.get(name) ?? ISO3_TO_FLAG[t.iso3] ?? "",
      continent: t.continent,
      population: group.reduce((sum, c) => sum + c.population, 0),
      gdpMd: group.reduce((sum, c) => sum + c.gdpMd, 0),
      tiles,
      spawn: t.spawn,
      anchor: t.anchor,
      passive: tiles < PASSIVE_TILES,
      slow: tiles >= PASSIVE_TILES && tiles < SLOW_TILES,
    };
  });
  return { roster, remap };
}

function realism(): Built {
  built ??= build();
  return built;
}

/** The playable countries after merging, in index order. */
export function roster(): readonly RealismCountry[] {
  return realism().roster;
}

/** REAL_WORLD_COUNTRIES names merged into the roster country `name` (itself included). */
export function realismSourceNames(name: string): readonly string[] {
  const country = roster().find((c) => c.name === name);
  if (country === undefined) return [];
  return REAL_WORLD_COUNTRIES.filter(
    (c) => targetOf(c).iso3 === country.iso3,
  ).map((c) => c.name);
}

/**
 * The roster name of the country a REAL_WORLD_COUNTRIES name merges into, or
 * undefined when that country is neutral land with no roster entry.
 */
export function rosterNameOf(country: string): string | undefined {
  const c = REAL_WORLD_COUNTRIES.find((r) => r.name === country);
  if (c === undefined) return undefined;
  const target = targetOf(c);
  if (NEUTRAL_ISO3.has(target.iso3)) return undefined;
  return target.manifestName ?? target.name;
}

/** Original country index (0 = ocean) to effective roster index. */
export function countryIndexRemap(): Uint16Array {
  return realism().remap;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Starting strength from population and GDP, for countries without a seed row. */
export function deriveSeed(c: {
  population: number;
  gdpMd: number;
}): RealisticNationSeed {
  const popM = c.population / 1e6;
  const gdpBn = c.gdpMd / 1e3;
  return {
    troops: clamp(
      Math.round(9500 + 690 * Math.sqrt(popM) + 500 * Math.sqrt(gdpBn)),
      6000,
      100_000,
    ),
    gold: clamp(
      Math.round(39000 + 1460 * Math.sqrt(popM) + 3330 * Math.sqrt(gdpBn)),
      15_000,
      500_000,
    ),
  };
}

/** The REALISTIC_SEEDS row for `name`, else the derived seed of a roster country. */
export function seedForCountry(name: string): RealisticNationSeed | undefined {
  const row = REALISTIC_SEEDS[name];
  if (row !== undefined) return row;
  const country = roster().find((c) => c.name === name);
  return country === undefined ? undefined : deriveSeed(country);
}

let neighbours: readonly (readonly number[])[] | undefined;

function buildNeighbours(): readonly (readonly number[])[] {
  const raster = decodeRealWorldCountryRaster();
  const remap = countryIndexRemap();
  const sets = Array.from(
    { length: roster().length + 1 },
    () => new Set<number>(),
  );
  const link = (a: number, b: number) => {
    if (a === 0 || b === 0 || b === a) return;
    sets[a].add(b);
    sets[b].add(a);
  };
  for (let i = 0; i < raster.length; i++) {
    const c = raster[i];
    if (c === 0) continue;
    const a = remap[c];
    if (i % REAL_WORLD_WIDTH < REAL_WORLD_WIDTH - 1 && raster[i + 1] !== c) {
      link(a, remap[raster[i + 1]]);
    }
    if (i + REAL_WORLD_WIDTH < raster.length) {
      const below = raster[i + REAL_WORLD_WIDTH];
      if (below !== c) link(a, remap[below]);
    }
  }
  return sets.map((s) => [...s].sort((x, y) => x - y));
}

/** Effective indices of the countries sharing a land border with `index`, ascending. */
export function countryNeighbors(index: number): readonly number[] {
  neighbours ??= buildNeighbours();
  return neighbours[index] ?? [];
}
