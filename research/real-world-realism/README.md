# Real-World Realism Research Folder

**Goal:** Make OpenFront's nation simulation dramatically more realistic by starting from the *current real world* — real power dynamics (who likes who), real military capacity per country, real military bases / cities / industrial hubs, and geographically accurate terrain — and by making terrain *meaningfully* shape combat (mountain passes, deserts, rivers, chokepoints).

> This folder is **research only — no game code.** It is the reference the engine implementation reads. Each file cites its sources. Treat every number as a starting point to be tuned in playtests, not gospel.

---

## 1. What's in here

| File | Topic | Key output |
|---|---|---|
| [`01-power-dynamics-and-alliances.md`](01-power-dynamics-and-alliances.md) | Who likes who | Alliance blocs (NATO, CSTO, BRICS, GCC…), active/frozen conflicts (2025–26), a per-pair **relationship matrix** (ally/friendly/neutral/tense/hostile) covering ~65 pairs, and game starting-relation defaults per nation. |
| [`02-military-capacity.md`](02-military-capacity.md) | How strong is each country | Per-nation tables for all ~72 World-map nations (personnel, MBTs, combat aircraft, surface/carriers, subs, budget, warheads), a normalized **Military Power Index (US=100)**, the 9 nuclear powers in detail, and a concrete **starting-troops / starting-gold scaling formula**. |
| [`03-military-bases.md`](03-military-bases.md) | Where the bases are | Catalog of US/Russian/Chinese/UK/French/Indian/other bases **with decimal lat/long**, overseas basing networks, nuclear/strategic sites, and per-power suggestions for starting `Port`/`DefensePost`/`MissileSilo` structures. |
| [`04-cities-and-industry.md`](04-cities-and-industry.md) | Where the cities & factories are | Major cities by region (with 2025 metro population **+ lat/long**), the world's arms-industry/defense-industrial hubs **+ lat/long**, strategic trade ports/chokepoints, and city/factory → game-structure scaling. |
| [`05-terrain-and-geography.md`](05-terrain-and-geography.md) | What the ground is like | All major mountain ranges (with **lat/long bounding boxes**), deserts, rivers, straits/chokepoints, forests/steppe; how terrain humanly shapes warfare; and **Movement/attack-cost + impassable-wall implementation guidance** so mountains become real barriers with passes. |
| [`06-coordinate-mapping.md`](06-coordinate-mapping.md) | How lat/long → game pixels | The World map projection, the conversion formulas, a calibration table vs existing nation spawns, and the snap-to-land workflow. |
| [`07-data-sources.md`](07-data-sources.md) | Where the data comes from | Primary sources (IISS, SIPRI, FAS, ACA, World Bank) with licensing, and the **freely downloadable geographic datasets** (NASA SRTM/NASADEM, Copernicus GLO-30, ESA Sentinel-2) for rebuilding terrain. |

---

## 2. How this maps onto OpenFront's existing systems

OpenFront already has most of the *machinery* — it just starts from a flat, equal-strength, neutral world. This research tells you how to seed it with reality:

| Game concept (existing) | Real-world input from this folder | Where it's consumed today |
|---|---|---|
| **`info.json` `nations`** (name, spawn coords, flag) | Already holds the ~72 nations on the World map; keep as the nation roster | `map-generator/assets/maps/<map>/info.json` → `Maps.gen.ts` |
| **Nation starting troops / gold** | `02-military-capacity.md` §5 formula (MPI → troops, budget → gold) | `EngineConfig.startManpower()` / `startingGoldFor()` in `packages/engine/src/configuration/EngineConfig.ts` |
| **`Relation` enum** (Hostile/Distrustful/Neutral/Friendly) and alliances | `01-power-dynamics-and-alliances.md` relationship matrix → seed starting relations | `GameTypes.ts` `Relation`; `NationExecution.ts` |
| **Terrain `TerrainType`** (Plains/Highland/Mountain/Ocean/Impassable) | `05-terrain-and-geography.md` → rebuild map so peaks are impassable walls, ranges match reality, add movement/attrition costs | Blue channel of `map-generator/assets/maps/<map>/image.png`; `terrainAttackBase()` + `AttackExecution` decompose priority |
| **`City` / `Factory` structures** | `04-cities-and-industry.md` → place starting cities at capitals/major metro, factories at arms hubs | `UnitType.City` / `UnitType.Factory` placements at game start |
| **`Port` / `MissileSilo` / `SAMLauncher` / `DefensePost`** starts | `03-military-bases.md` → place strategic forward bases & silos | Same unit enums, placed in the spawn/start state |

## 3. Recommended implementation roadmap

1. **Terrain first** (biggest visual + gameplay lever): use a public DEM (SRTM/GLO-30 — see `07-data-sources.md`) to regenerate `image.png` so real ranges appear, make peaks >~5000 m **impassable** (forcing passes), and add the movement/attack terrain multipliers from `05-terrain-and-geography.md` §9. This requires extending `terrainAttackBase()` + pathfinding with a `moveCost` per terrain.
2. **Power dynamics**: seed starting `Relation`s from `01-power-dynamics-and-alliances.md` (e.g., US & UK/France/Japan start Friendly-allied; Russia & China Friendly; India–Pakistan & US–China Hostile/Tense; everyone else Neutral).
3. **Military strength**: apply `02-military-capacity.md` formula in `EngineConfig` so the US/China/Russia start strong and Chad/Niger start weak (dampened via a log/power curve so it stays playable).
4. **Structures**: place starting `City`/`Factory`/`Port`/`MissileSilo` from `04` + `03` at each nation's real hubs and foreign bases.

## 4. Data vintage & verification caveat

- **Geopolitics is fast-moving.** The `01-power-dynamics` file reflects conditions reported as of **late 2026** (e.g., a 2026 US/Israel–Iran war and ceasefire, Maduro's removal, Russia–Ukraine attrition, Sahel juntas). OpenFront is a *game*: you may not want to hardcode the most volatile present-tense events (or you may want a "current-day" mode toggle). **Re-verify any time-sensitive claim at implementation time** before shipping it.
- **Military numbers change yearly** (SIPRI/IISS/FAS publish annually). Re-harvest `02` each year if you want forza data to track reality.
- Exact figures differ by source definition (metro population, operational-vs-stock tanks, GW/GFP). Each file flags which definition it used.

## 5. Licensing note

For a shipped product: SIPRI public Fact Sheets, FAS/Bulletin, Arms Control Association, World Bank, and the geographic datasets (SRTM/GLO-30/Sentinel) are freely usable with attribution. **IISS Military Balance and Global Firepower are not freely republishable** — use only derived summaries / cross-checks (see `07-data-sources.md`). All base/city/hub coordinates are factual locations, not copyrighted creative content.
