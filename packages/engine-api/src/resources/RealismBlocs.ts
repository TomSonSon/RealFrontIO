export type RealismBlocKind = "treaty" | "friendly";

export interface RealismBloc {
  readonly id: string;
  readonly kind: RealismBlocKind;
  /** Player names: WorldCountry.manifestName ?? WorldCountry.name. */
  readonly members: readonly string[];
}

// Friendly blocs only seed starting relations; they never create alliances.
export const REALISTIC_BLOCS: readonly RealismBloc[] = [
  {
    id: "nato",
    kind: "treaty",
    members: [
      "Albania",
      "Belgium",
      "Bulgaria",
      "Canada",
      "Croatia",
      "Czechia",
      "Denmark",
      "Estonia",
      "Finland",
      "France",
      "Germany",
      "Greece",
      "Hungary",
      "Iceland",
      "Italy",
      "Latvia",
      "Lithuania",
      "Luxembourg",
      "Montenegro",
      "Netherlands",
      "North Macedonia",
      "Norway",
      "Poland",
      "Portugal",
      "Romania",
      "Slovakia",
      "Slovenia",
      "Spain",
      "Sweden",
      "Türkiye",
      "United Kingdom",
      "United States",
    ],
  },
  {
    id: "russia-belarus",
    kind: "treaty",
    members: ["Russia", "Belarus"],
  },
  {
    id: "us-japan",
    kind: "treaty",
    members: ["United States", "Japan"],
  },
  {
    id: "us-south-korea",
    kind: "treaty",
    members: ["United States", "South Korea"],
  },
  {
    id: "us-australia",
    kind: "treaty",
    members: ["United States", "Australia"],
  },
  {
    id: "us-philippines",
    kind: "treaty",
    members: ["United States", "Philippines"],
  },
  {
    id: "us-taiwan",
    kind: "treaty",
    members: ["United States", "Taiwan"],
  },
  {
    id: "aukus-anzus",
    kind: "treaty",
    members: ["United States", "United Kingdom", "Australia"],
  },
  {
    id: "anzus",
    kind: "treaty",
    members: ["Australia", "New Zealand"],
  },
  {
    id: "aes",
    kind: "treaty",
    members: ["Mali", "Niger", "Burkina Faso"],
  },
  {
    id: "gcc",
    kind: "treaty",
    members: [
      "Saudi Arabia",
      "United Arab Emirates",
      "Qatar",
      "Kuwait",
      "Bahrain",
      "Oman",
    ],
  },
  {
    id: "eu",
    kind: "friendly",
    members: [
      "Austria",
      "Belgium",
      "Bulgaria",
      "Croatia",
      "Cyprus",
      "Czechia",
      "Denmark",
      "Estonia",
      "Finland",
      "France",
      "Germany",
      "Greece",
      "Hungary",
      "Ireland",
      "Italy",
      "Latvia",
      "Lithuania",
      "Luxembourg",
      "Netherlands",
      "Poland",
      "Portugal",
      "Romania",
      "Slovakia",
      "Slovenia",
      "Spain",
      "Sweden",
    ],
  },
  {
    id: "sco",
    kind: "friendly",
    members: [
      "China",
      "Russia",
      "India",
      "Pakistan",
      "Kazakhstan",
      "Kyrgyzstan",
      "Tajikistan",
      "Uzbekistan",
      "Iran",
      "Belarus",
    ],
  },
  {
    id: "brics",
    kind: "friendly",
    members: [
      "Brazil",
      "China",
      "Egypt",
      "Ethiopia",
      "India",
      "Indonesia",
      "Iran",
      "Russia",
      "Saudi Arabia",
      "South Africa",
      "United Arab Emirates",
    ],
  },
  {
    id: "quad",
    kind: "friendly",
    members: ["United States", "Japan", "India", "Australia"],
  },
  {
    id: "us-nz",
    kind: "friendly",
    members: ["United States", "New Zealand"],
  },
  {
    id: "jef",
    kind: "friendly",
    members: [
      "Denmark",
      "Estonia",
      "Finland",
      "Iceland",
      "Latvia",
      "Lithuania",
      "Netherlands",
      "Norway",
      "Sweden",
      "United Kingdom",
    ],
  },
  {
    id: "ecowas",
    kind: "friendly",
    members: [
      "Benin",
      "Côte d'Ivoire",
      "Gambia",
      "Ghana",
      "Guinea",
      "Guinea-Bissau",
      "Liberia",
      "Nigeria",
      "Senegal",
      "Sierra Leone",
      "Togo",
    ],
  },
];

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function comparePairs(
  x: readonly [string, string],
  y: readonly [string, string],
): number {
  if (x[0] !== y[0]) return x[0] < y[0] ? -1 : 1;
  if (x[1] !== y[1]) return x[1] < y[1] ? -1 : 1;
  return 0;
}

export function blocPairs(
  kind: RealismBlocKind,
  presentNames: ReadonlySet<string>,
): readonly (readonly [string, string])[] {
  const seen = new Map<string, readonly [string, string]>();
  for (const bloc of REALISTIC_BLOCS) {
    if (bloc.kind !== kind) continue;
    const members = [...new Set(bloc.members)]
      .filter((name) => presentNames.has(name))
      .sort();
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const pair: readonly [string, string] = [members[i], members[j]];
        seen.set(pairKey(pair[0], pair[1]), pair);
      }
    }
  }
  return [...seen.values()].sort(comparePairs);
}

export function startingAlliancePairs(
  presentNames: ReadonlySet<string>,
): readonly (readonly [string, string])[] {
  return blocPairs("treaty", presentNames);
}

export function friendlyBlocPairs(
  presentNames: ReadonlySet<string>,
): readonly (readonly [string, string])[] {
  const treaty = new Set(
    startingAlliancePairs(presentNames).map((p) => pairKey(p[0], p[1])),
  );
  return blocPairs("friendly", presentNames).filter(
    (p) => !treaty.has(pairKey(p[0], p[1])),
  );
}

export const TREATY_BLOC_RELATION = 70;
export const FRIENDLY_BLOC_RELATION = 60;

// Treaty defaults are added first, so a pair in both kinds keeps the treaty score.
const BLOC_RELATION_DEFAULTS = new Map<string, number>();
for (const kind of ["treaty", "friendly"] as const) {
  const score =
    kind === "treaty" ? TREATY_BLOC_RELATION : FRIENDLY_BLOC_RELATION;
  for (const bloc of REALISTIC_BLOCS) {
    if (bloc.kind !== kind) continue;
    const members = [...new Set(bloc.members)];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = pairKey(members[i], members[j]);
        if (!BLOC_RELATION_DEFAULTS.has(key)) {
          BLOC_RELATION_DEFAULTS.set(key, score);
        }
      }
    }
  }
}

/** Bloc default relation for a pair of country names, or undefined outside every bloc. */
export function blocRelationDefault(a: string, b: string): number | undefined {
  return BLOC_RELATION_DEFAULTS.get(pairKey(a, b));
}
