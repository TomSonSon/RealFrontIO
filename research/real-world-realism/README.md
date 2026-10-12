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
| [`08-game-dynamics-notes.md`](08-game-dynamics-notes.md) | Economic & diplomatic dynamics (brief) | Open-questions brief (starting money/people, alliance-scoped trade, boycotts↔alliances, coalition attacks, right-of-passage) mapped to what the engine does today — the running brief for `10`. |
| [`09-war-dynamics.md`](09-war-dynamics.md) | How wars are actually fought | Concentration of force (Schwerpunkt/main effort), fronts & axes, interior lines, attrition/exhaustion, logistics, defense-in-depth, surprise/morale — and a **prioritized, engine-grounded design for region/front-focused attacks** (the "push this region harder" feature). |
| [`10-economics-and-diplomacy.md`](10-economics-and-diplomacy.md) | Deep economy & diplomacy dynamics | Who trades with whom, sanctions & boycotts (real cases), alliances & reputation/betrayal, coalitions & joint action, right-of-passage/basing, strategic resources & chokepoints — each mapped to the engine with a prioritized design. |

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

## 3. Implementation status & roadmap

**Shipped (on `feat/real-world-realism`), all gated behind `isRealisticWorld`:**
- ✅ **Mode + relations + strength** — `publicGameModifiers.isRealisticWorld` wired end-to-end (`EngineConfig`, `MapPlaylist`, zod schema, client badge); nations seed realistic starting troops/gold (`02`) and starting relations (`01`).
- ✅ **Starting capital city** — nations open with a capital at their map spawn (`placeNationCapital`).
- ✅ **Terrain combat rules** — Realistic World mountains are a real barrier (slow/bloody to take, armies route around) per `05`.
- ✅ **region/front-focused attacks** — player-push-a-region harder (`09` §7: focus-tile weighted conquest heap + per-region troop sub-budget).
- ✅ **Economy & diplomacy core** — relation-scaled trade, sanctions/boycotts that strain alliances (auto-sanction), per-game reputation/betrayal, coalition war declarations (bot votes via `NationCoalitionBehavior`), and **right-of-passage / basing** (single-hop then **multi-hop** through ally chains). See `10` §8.4–8.7.
- ✅ **Chokepoint toll & interdiction (§8.8)** — `Chokepoints.ts` strait-tag data pass (17 real maritime chokepoints with World-map pixel bboxes) + engine mechanic: controller detection (coastal plurality), passive per-transit toll, opt-in interdiction that cuts the voyage payout. See `12-chokepoints.md`.
- ✅ **Per-game skill/tech tree** — MILITARY + ECONOMY branches × 3 tiers, gold-spendable, hard rank cap, deterministic nation default-spend policy applying multipliers to troop regen, gold income, structure cost, and attack/defense power. See `11-leveling-and-tech-tree.md`.
- ✅ **Coalition-declaration client UI** — `declare_coalition_war` intent (target + candidates) through the wire, Transport event, player-panel trigger (Realistic World only), en.json keys.

**Next (design in `09` / `10`, implement after):**
- 🔲 **Structures at real hubs** — place cities/factories/bases at `04`/`03` coordinates (capital is a first slice).
- 🔲 **Terrain map regeneration** — regenerate `image.png` from a real DEM (SRTM/GLO-30) so ranges match reality and peaks become impassable walls (remote tooling task; Go-based generator).

## 4. Data vintage & verification caveat

- **Geopolitics is fast-moving.** The `01-power-dynamics` file reflects conditions reported as of **late 2026** (e.g., a 2026 US/Israel–Iran war and ceasefire, Maduro's removal, Russia–Ukraine attrition, Sahel juntas). OpenFront is a *game*: you may not want to hardcode the most volatile present-tense events (or you may want a "current-day" mode toggle). **Re-verify any time-sensitive claim at implementation time** before shipping it.
- **Military numbers change yearly** (SIPRI/IISS/FAS publish annually). Re-harvest `02` each year if you want forza data to track reality.
- Exact figures differ by source definition (metro population, operational-vs-stock tanks, GW/GFP). Each file flags which definition it used.

## 5. Licensing note

For a shipped product: SIPRI public Fact Sheets, FAS/Bulletin, Arms Control Association, World Bank, and the geographic datasets (SRTM/GLO-30/Sentinel) are freely usable with attribution. **IISS Military Balance and Global Firepower are not freely republishable** — use only derived summaries / cross-checks (see `07-data-sources.md`). All base/city/hub coordinates are factual locations, not copyrighted creative content.
