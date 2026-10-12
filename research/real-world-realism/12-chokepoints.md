# 12 — Chokepoint Toll & Interdiction (Design for §8.8a)

**Title:** Strategic chokepoint toll/interdiction — OpenFront "Realistic World" mode
**Status:** needs-design (mechanic known-how; strait-tag data is provided by `Chokepoints.ts`)
**Version:** v1 (Oct 2026)
**Companion data file:** `packages/engine-api/src/resources/Chokepoints.ts`
**Design discipline (matches repo rules + `08-game-dynamics-notes.md`):** hangs off named engine systems (`TradeShipExecution`, `gold`, `Relation`, `AttackExecution`, `EngineConfig`), gated behind `isRealisticWorld`, deterministic (no hidden randomness), covered by engine tests, and dampened against snowball.

---

## 1. Objective & scope

**Fact (from `10-economics-and-diplomacy.md` §6.1):** a chokepoint is a narrow strait/canal through which a disproportionate share of trade must pass, so whoever controls it has leverage over everyone who uses it. Hormuz carries ~20%+ of global oil/LNG; Malacca ~24% of seaborne trade, ~45% of seaborne crude, ~80% of China's oil; Suez/Bab-el-Mandeb ~10-12% of seaborne trade and ~30% of containers. Real interdiction (Houthi Red Sea attacks 2023-26) cut Red Sea oil from 9.3→4.1M bpd and spiked Shanghai–Europe rates ~256%; Egypt lost ~$6B in canal revenue in 2024 [Britannica; The Conversation; AITimeline; CFR].

**Goal:** add a *deterministic, `isRealisticWorld`-gated* mechanic where a nation that controls one of the World map's ~17 tagged straits earns **passive toll income** from trade that transits it and can **interdict** enemy trade passing through (a near-hostile act). This creates the "why is that strait worth fighting over" strategic objective explicitly desired by `08-game-dynamics-notes.md` ("cutting an enemy's oil via controlling a strait").

**What this is not:** this is NOT full strategic-resource terrain (§8.8b — staged last, complex). This is geographic, pre-weighted, additive value on existing trade — the cheap path to map-control value the research endorses (§6.4: "specific straits are pre-weighted as high-strategic-value").

---

## 2. The strait-tagging data pass

### 2.1 The data
`Chokepoints.ts` is a **standalone, dependency-light TypeScript data module** (plain arrays/numbers/booleans; no engine imports — safe to import from engine, server, client, tests, or tooling). It exports:
- Projection helpers `lonToX` / `latToY` and world constants (2000×1000).
- The `Chokepoint` type and a `CHOKEPOINTS` array of 17 straits.
- Pure helpers `getChokepoint(id)` and `chokepointContains(cp, x, y)`.
- `TIER_BASE_TOLL` and `CHOKEPOINT_TIERS` (Global / Major / Minor) constants.

The type of each entry:

```ts
type Chokepoint = {
  id: string;                      // stable, never changes (used in saves)
  name: string;                    // display name
  connects: [string, string];      // two bodies of water (docs/UI)
  lat: number; lon: number;        // reference WGS84 (docs)
  bbox: { x0, y0, x1, y1 };        // GENEROUS pixel search region
  tier: "Global" | "Major" | "Minor";
  suggestedTollPerShip: number;    // fixed per-transit toll (gold)
  suggestedTollFraction: number;   // %-of-voyage toll (0..1)
  suggestedInterdictionFraction: number; // % of transiting value a controller can tax/destroy
};
```

### 2.2 The tag table (computed from §6 lat/long, projected)

Projection: `x = (lon+180)/360*2000`, `y = (90-lat)/180*1000`. Boxes are widened margins around the actual strait (a strait is only ~1-3 px at 2000-wide) so a resolver can honour the real DEM. Values below are **defaults/tuned targets** — the source of truth is the file.

| id | name | pixel bbox (x0,y0,x1,y1) | tier | toll/ship | toll frac | interdict frac |
|---|---|---|---|---|---|---|
| `hormuz` | Strait of Hormuz | (1308,348,1318,356) | Global | 5000 | 0.05 | 0.5 |
| `malacca` | Strait of Malacca | (1526,458,1578,494) | Global | 6000 | 0.06 | 0.5 |
| `bab_el_mandeb` | Bab-el-Mandeb | (1220,420,1260,438) | Global | 4000 | 0.05 | 0.5 |
| `suez` | Suez Canal | (1175,326,1185,338) | Global | 5000 | 0.05 | 0.4 |
| `turkish_straits` | Bosporus & Dardanelles | (1144,269,1163,285) | Major | 3000 | 0.03 | 0.4 |
| `gibraltar` | Strait of Gibraltar | (964,296,977,304) | Major | 3000 | 0.03 | 0.3 |
| `panama` | Panama Canal | (553,440,563,452) | Major | 3500 | 0.035 | 0.4 |
| `dover` | Strait of Dover | (1002,213,1013,220) | Major | 2500 | 0.025 | 0.3 |
| `taiwan` | Taiwan Strait | (1656,355,1676,375) | Major | 3500 | 0.035 | 0.4 |
| `luzon` | Luzon Strait | (1664,374,1684,388) | Major | 3000 | 0.03 | 0.35 |
| `tsushima` | Korea / Tsushima | (1714,303,1724,314) | Minor | 1800 | 0.02 | 0.3 |
| `danish_straits` | Danish Straits | (1044,179,1066,197) | Minor | 1500 | 0.015 | 0.3 |
| `lombok` | Lombok Strait | (1638,543,1648,553) | Minor | 1500 | 0.015 | 0.25 |
| `sunda` | Sunda Strait | (1578,526,1592,538) | Minor | 1500 | 0.015 | 0.25 |
| `mozambique` | Mozambique Channel | (1225,567,1242,600) | Minor | 1000 | 0.01 | 0.2 |
| `bering` | Bering Strait | (58,130,72,140) | Minor | 800 | 0.01 | 0.2 |
| `drake` | Drake Passage | (600,806,644,833) | Minor | 800 | 0.008 | 0.15 |

**Why these 17 and these tiers:** they are exactly the chokepoints the research lists in `05-terrain-and-geography.md §6` as "trade-concentration and blockade points." They are tagged proactively (cheap, geographic) and the tier drives the toll/leverage scale, so a small poor controller (Houthis-on-Bab-el-Mandeb, Iran-on-Hormuz) can impose outsized cost on larger powers — the asymmetric force multiplier the research stresses (§6.2).

> **Note on artificial straits:** Panama and Suez are canals. They are included (they are real toll chokepoints — Suez is Egypt's largest single earner) but see §7 for the nuke-void edge case.

---

## 3. How "control" of a chokepoint is determined

Control must be derived purely from existing, determinate world state — tile ownership — so it is trivially deterministic and needs no stored authority value.

### 3.1 The water band
The **water band** of a strait is the subset of its `bbox` that is actually `TerrainType.Ocean` on the loaded World map:

```
waterBand(cp) = { tiles t : t in cp.bbox ∧ terrain(t) === OCEAN }
```

Because the boxes are generous, this resolution step honours the real DEM and degrades gracefully if a strait happens to be land-locked or over-widened at this resolution. Water-band tiles are resolved **once at game load** (they depend only on the static map, not on ownership) and cached.

### 3.2 The coastal influence window (the "two shores")
Define the chokepoint's **coastal window** as every non-ocean land tile within Chebyshev radius `r` of a water-band tile. `r` is a per-chokepoint `shoreRadius`; recommended default **2** (needed because a 1-px strait like Hormuz's water band sits between land pixels that may be 1-2 px away at 2000-wide scale). The window tiles split into two **shore groups** by their dominant bearing from the water band (north+east vs south+west) so the "owns both shores" determination is well-defined.

### 3.3 The control rule (deterministic, tie-broken)
A chokepoint has exactly one **controller** (or `null` when terra nullius occupies the whole window), recomputed each tick from tile ownership:

1. Tally owned coastal-window land tiles per player.
2. **Controller = the player owning the plurality** of coastal-window tiles.
3. **Tie-breaks (deterministic precedence):**
   a. **Owns both shores** — of the tied leaders, the player who owns ≥1 land tile in *both* shore groups wins (a physical foothold on both sides of the strait).
   b. **Larger empire** — the tied player owning more total land tiles wins.
   c. **Lowest `smallID`** — final stable lexicographic tiebreak (players always have a distinct smallID).

Result type: `chokepointControl(playerOwnership, cp) → PlayerID | null` — a pure function.

> **Design note.** "Owning both shores" is a *tie-breaker*, not a gate. One power holding all of a single coast (a "dominant riparian") therefore still gets control deterministically — matching Egypt on Suez, which holds one side strongly — while a power that physically straddles a strait (Turkey on the Bosporus) wins contested ties, which is exactly the real strategic nuance we want.

### 3.4 Control change semantics
Control is **recomputed every tick** from ownership; it is not a decreed claim. Capturing coastal tiles (or losing them to conquest) automatically flips control — no separate capture mechanic, no new inventory, no manual "declare control" action. Cost is trivial: ~17 straits × small windows. Expose the current controller per chokepoint in the game snapshot so the client can draw "who owns this strait" and gate the interdiction UI on being the controller.

---

## 4. Passive toll income

### 4.1 When a transit triggers a toll
`TradeShipExecution.tick()` already moves trade ships tile-by-tile via `WaterPathFinder`, tracking `tilesTraveled`. The toll hooks this loop: **each tick that a trade ship's current tile lies in a chokepoint's cached water band, and that chokepoint has a controller who is not the ship's owner / not an ally / not a teammate, a toll is paid to that controller.**

- The controller's own ships, allied ships (`rel === "ally"`), and team ships transit **toll-free** (right-of-passage for friends).
- **Exactly one toll per strait per voyage.** Record `chokepointsTolledThisVoyage: Set<chokepointId>` on the execution (deterministic; snapshot-serialized like `tilesTraveled`), so a long band (e.g. Malacca's ~50 px) does not charge per step. This mirrors real canal tolls — one Sound Due per passage, not per kilometre.

### 4.2 Toll amount (deterministic)
Implement **one** of two models; config-gate the other so they never stack on the same transit:

**Model A — Fixed per-transit toll (recommended v1 default).**
```
toll = round( tollBase(tier) * goldMultiplier() )
```
`tollBase` = `TIER_BASE_TOLL` (Global 5000 / Major 3000 / Minor 1500) or the chokepoint's `suggestedTollPerShip`. Multiplying by `goldMultiplier()` keeps the fixed toll meaningful in high-gold games.

**Model B — % of voyage value (the literal §8.8a "a % of passing trade gold").**
```
toll = floor( voyageGold * cp.suggestedTollFraction )
```
`voyageGold` = the resolved payout computed in `TradeShipExecution.complete()` (`tradeShipGold × tradeMultiplier(rel)`). Fraction ~0.05 / 0.03 / 0.015. Auto-scales with route length and relation-tier tariffs (§8.1).

**Calibration vs. the real economy**
- `tradeShipGold(dist) = 75_000/(1+e^-0.03(dist-300)) + 50*dist` ⇒ a typical voyage pays **~75K–120K gold**.
- A Port costs ~125K; passive `goldAdditionRate` ≈ **100/tick**.
- A Global toll of ~5K (A) or ~5% (B) is therefore **~4-6% of one voyage** — real income if you control a busy route, yet not a wipe-out. The trader pays (deducted from their eventual payout); the two port owners and the controller see the delta in deterministic `bigint` gold. This sits comfortably inside what real trans-ocean toll regimes extract.

**Pure + testable:** `applyToll(controller, shipOwner, cp, voyageGold?) → { toll: Gold, controller: PlayerID }`. Tests: controller earns `toll`; no toll when ship owner = controller/ally/team; `isRealisticWorld` off ⇒ 0; one toll per strait per voyage.

---

## 5. Interdiction (block / reduce transit)

Interdiction is a **declared, near-hostile act** that degrades a targeted nation's trade routed through a chokepoint you control — the OPEC-1973, 2026-Hormuz, and Houthi dynamic: a small controller imposes big costs on much larger trade powers (§6.2, "asymmetric force multiplier").

### 5.1 Declaring interdiction
A current controller sets, per chokepoint, an **interdiction target** (`interdictTarget: PlayerID | null`, default null = none). This is plain stored state — deterministic. It is **reset to null** on control change so a new controller must explicitly choose. (Minimal v1: one global target per strait; see §7 for a per-target list as an extension.)

### 5.2 Effect — reduced trade gold
While the controller interdicts player `P`:
- Every `P`-owned trade ship that would transit the strait loses a **fraction** of its voyage value: `suggestedInterdictionFraction` (Global 0.5, Major 0.3–0.4, Minor 0.15–0.25). Applied as a multiplier on the final payout in `complete()`:
  ```
  gold = floor( gold * (1 - interdictionFraction) )
  ```
  Deterministic and exact.
- The controller earns a smaller **"blockade spoils"** share for actually denying/enforcing:
  ```
  spoils = floor( gold * interdictionFraction * escapeRate )
  ```
  with `escapeRate = 0.3` default, modelling partial rerouting. Real-world anchor: Hormuz 2026 saw ~90–95% disruption but the UAE diverted some via Fujairah; Suez lost ~50% after Houthi attacks, not 100% (§6.2). So interdiction is powerful but **not a hard wall**, and the controller does not capture the full value (a ship is delayed/lost, not looted in full), which damps the snowball.

### 5.3 Diplomatic byproduct — a genuine hostile act (§2.3/§2.4 economics doc)
- **Interdicting an ally** is treated as a hostile economic act: it **breaks the alliance** (the interaction immediately drops relations and flags the aggressor), with the same "hostile-by-economic-war" reputational weight as a sanctions betrayal (§8.3).
- **Interdicting a neutral/rival** applies a strong one-way relation malus — recommended `-40` (matching §2.3's "a blockade is near-war... huge relation drop").
- Optionally, and staged later, it can **trigger alliance-defense support** for the target (allies of the target consider response). Marked optional/needs-design; v1 is the relation hit + alliance break.

Unlike passive tolling (routine sovereign taxation), interdiction is a deliberate escalation players will weigh against its diplomatic cost — this is the OPEC-1973 coercive-leverage knot the research wants.

### 5.4 Deterministic + testable
`interdictRole(controller, target, cp, shipGold) → { shipGold, spoils, relDelta, allianceBroken }`. Tests: (a) rival gold reduced by configured %; (b) controller gains only `escapeRate`-scaled spoils; (c) allied interdiction breaks the alliance + relation hit; (d) lifting interdiction restores target gold but not the ruptured alliance/reputation (asymmetric, per §8.3).

---

## 6. Gating, determinism, and unit-test coverage

### 6.1 `isRealisticWorld` gate
Every behaviour in §4–§5 is short-circuited by `EngineConfig.isRealisticWorld()`:
- Toll: skipped → traders pay nothing, controllers earn nothing.
- Interdiction: the field is ignored → no relation side-effects.
- **Classic mode is bit-for-bit unchanged** — the only new executable path is a control-resolution pass that is inert unless the flag is on. (The data module itself is always safe to load.)

### 6.2 Determinism guarantees
- `chokepointControl`, `applyToll`, `interdictRole` are pure over (ownership, config, tick) — no `Math.random()`.
- Fixed iteration order: chokepoint array order + stable player ordering (by `smallID`).
- `gold` stays `bigint`; every fraction goes through `Math.floor` at a defined step; multipliers applied in a fixed order.
- New execution state (`chokepointsTolledThisVoyage`, `interdictTarget`) is **snapshot-serialized** like `wasCaptured`/`tilesTraveled` in `TradeShipExecution` so replays and archives reproduce exactly.

### 6.3 Required tests (mirror `10-economics-and-diplomacy.md §8.8a`)
1. `chokepointControl`: plurality owner controls; tie → both-shores owner wins; still-tie → larger empire, then lower smallID; terra-nullius-only → null.
2. `applyToll`: owner earns toll; ally/team/self free; one toll per strait per voyage; classic mode ⇒ 0.
3. `interdictRole`: rival gold reduced by configured %; controller spoils = `escapeRate`-scaled; allied interdiction breaks alliance + relation hit; classic mode inert.
4. Control flips when coastal tiles are captured (conquer Suez shore → control changes deterministically).
5. Snapshot round-trip: `TradeShipExecution` with tolled/chokepoints state restores identically.

---

## 7. Interdiction severity taxonomy & relations matrix

Real escalations are not binary (economics doc §2.1: sanctions → embargo → **blockade**(near-war)). To keep the mechanic tunable and to give the UI discrete buttons, model interdiction as **two severity levels** (v1 ships level 1; level 2 is an easy later add):

| Level | Name | Effect on target transit | Diplomatic cost | Real-world analogue |
|---|---|---|---|---|
| 1 | **Harassment / toll-war** | Target ships lose `interdictionFraction` × 0.5 of transit value; no spoils to controller | Strong relation malus (recommend `-25`) | Iran harassing tankers in Hormuz (2019, 2024-26) short of closure |
| 2 | **Blockade** | Target loses full `interdictionFraction` of value; controller takes `escapeRate`-scaled spoils | **Near-war**: `-40` relation, breaks alliance with the target, may trigger the target's alliance-defense support (optional, §5.3) | OPEC 1973 embargo; a naval blockade (physically prevents movement) |

**Relations / interaction matrix** (deterministic responses given relation tier + action):

| Controller vs Transiting owner | Toll applies? | Can interdict? | If interdict level 2 applied |
|---|---|---|---|
| Same player | No | No | — |
| Team | No | No | — |
| Ally | No | No | — (interdicting a teammate/ally is disallowed in v1) |
| Friendly | Yes | No (v1) | — |
| Neutral | Yes | Yes | `-40`, maybe allied-defense trigger |
| Hostile | Yes | Yes | `-40` (already hostile), spoils |

This makes **toll** a low-cost sovereign instrument usable even against neighbours, while **interdiction** is reserved for the escalation a player is willing to pay diplomatically for — exactly the "near-war" framing of §2.3.

---

## 8. Snapshot & schema sketch (for the wiring agent)

Nothing here is final engine code; it is the shape the state should take so it serializes like existing executions.

```ts
// Per chokepoint, runtime (derived from ownership; not a claim):
type ChokepointState = {
  id: string;
  controller: PlayerID | null;      // recomputed each tick
  interdictTarget: PlayerID | null; // reset on control change
  blockadedSinceTick?: Tick;        // for anti-snowball decay (optional)
};

// Added to TradeShipExecution state (mirrors wasCaptured/tilesTraveled):
//   chokepointsTolledThisVoyage: ChokepointId[]   // one toll per strait per voyage
//
// Functions (pure, testable, in an engine-lib module like DetMath):
//   chokepointControl(ownership, cp) => PlayerID | null
//   applyToll(controller, shipOwner, cp, voyageGold?) => { toll: Gold, controller }
//   interdictRole(controller, target, cp, shipGold) =>
//     { shipGold: Gold, spoils: Gold, relDelta: number, allianceBroken: boolean }
```

Concurrency/ordering invariants: control and tolls read the **same tick's ownership** (no mid-tick capture races — ownership only changes in the tick's attack/execution phase, and control is resolved from the post-phase ownership, so behaviour is reproducible). Water-band caches are comptuted from static terrain once. All new functions live in a dependency-free module so they can be unit-tested without spinning up a game.

---

## 9. Anti-snowball guardrails & gameplay interactions

- **Self-limiting income:** toll + spoils scale with *transiting* trade. If a controller blockades a route, fewer ships pay the toll, so the aggressive play chokes its own passive income — a natural brake, mirroring how real blockades starve the blockader's customs revenue too.
- **Conquerable, never permanent:** control is ownership-derived, so capturing coasts flips it and resets interdiction. No wall is permanent.
- **No double-dipping:** exactly one toll per strait per voyage; Model A/B never stack; spoils ≠ full value (escapeRate).
- **Relation asymmetry persistence:** lifting interdiction restores the target's gold but does *not* restore a broken alliance or the lost reputation (per §8.3 "asymmetric — you can't undo a betrayal"). This is the real deterrent keeping interdiction from being cheap and spammy.
- **Interactions with neighbours (§5 passage/basing):** a `passage`/transit grant (the design in `10-economics-and-diplomacy.md §8.7`) maps naturally onto the toll waiver — a nation granted passage across your strait should be treated like a toll-exempt friend. Wire that when §8.7 lands.
- **Interaction with §8.1 relation-scaled trade:** because toll/Model B ride on `voyageGold` which already applies `tradeMultiplier(rel)`, intra-bloc (ally) trade routes are worth more and therefore toll more in absolute terms — but allies are toll-exempt, so the two systems compose cleanly (you only profit tolling *non-allied* traffic).

---

## 10. Value-to-effort build order

Ranked so each step ships independently, deterministically, and reuses prior work:

1. **★ (cheap, high value) Data + control only** — import `CHOKEPOINTS`, resolve water bands, compute `chokepointControl` each tick, expose controllers in the snapshot/UI. Delivers the "who owns this strait" strategic layer with zero economy change.
2. **★★ Passive toll (Model A fixed)** — hook `TradeShipExecution.tick()`; add `chokepointsTolledThisVoyage`; pay the controller `TIER_BASE_TOLL × goldMultiplier`. This is the headline income and the first playable value.
3. **★★★ Interdiction (v1 = severity 1)** — `interdictTarget` state, payout multiplier, relation hit + ally break. Adds the coercive/fun lever.
4. **★★★★ %-of-value toll + economy scaling (Model B) + severity-level-2 blockade + spoils** — optional refinement coupling toll to route value and relation tiers; the main balance knob, not required for v1.
5. **★★★★★ Alliance-defense trigger + coalition reactions to interdiction + UI/notification polish + passage-grant toll waivers** — real diplomatic depth; stage last.

**Guardrails recap:** gated behind `isRealisticWorld`; deterministic & tested (pure functions over existing state); dampen power (escapeRate on interdiction, per-voyage toll caps, control flips by conquest — nothing permanent); don't snowball (a controller's toll income tracks *transiting trade*, which vanishes if trade dries up or the route is blockaded — self-limiting, like real chokepoints); off-ramps everywhere (interdiction is revocable; control is conquerable).

---

## 11. Worked example (deterministic trace)

State: `Suez` (Global tier), controller **Egypt** (owns the plurality of Suez coastal-window tiles, holding one shore strongly — no tie → tie-breaks unused). `goldMultiplier = 1`.

- **India** sends a TradeShip from its Red Sea port to a Mediterranean port. The ship's path crosses Suez's water band.
  - `rel = "other"` (non-allied) → toll applies.
  - Model A: `toll = round(5000 * 1) = 5000`. Deducted from India's eventual payout; **Egypt +5000 gold**, India's two port owners split the reduced payout.
  - `chokepointsTolledThisVoyage` gains `"suez"` → no second charge on re-entry within the same voyage.
- Egypt then sets `interdictTarget = India`.
  - India's next Suez-crossing ship: `interdictionFraction = 0.4` (Suez's value) → payout × (1 − 0.4) = ×0.6. `escapeRate = 0.3` → spoils to Egypt = `floor(gold × 0.4 × 0.3) = floor(gold × 0.12)`.
  - Relation: `relDelta` applies; if India had been allied, the alliance breaks and relations drop to Hostile. India trades 12% less through Suez with Egypt capturing 4-6% — a real economic fight, not a wipe-out.
- **US captures** Egypt's Suez-shore tiles → next tick `chokepointControl` flips to the US; `interdictTarget` resets to null; tolls now pay the US.

This single trace exercises control resolution, tolling, interdiction, allied-break, and the conquest flip — a deterministic script a test harness can run end-to-end.

---

## 12. Open design decisions (for the main agent to confirm)

- **`shoreRadius`** for the coastal window: `2` is generous at 2000-wide scale but may let an inland 2nd-ring owner claim a strait; `1` is stricter/harder. Recommend **2** for discoverability; re-tune after playtest.
- **Model A vs Model B toll:** recommend **A (fixed)** first (simplest; no mid-voyage gold resolution); keep B config-gated for later balance.
- **`escapeRate`** (0.3) and whether spoils get a per-voyage cap: confirm against target income so one strait isn't a permanent kill-switch on a single player.
- **Interdiction on a no-controller chokepoint:** always inert (no controller ⇒ free transit).
- **Artificial canals (Panama, Suez):** included as chokepoints; decide whether nuking their water band voids the tag (the world map terrain is static per game — this is a design choice for the main thread, possibly a per-game flag).
- **Preserve the "one controller" invariant** on maps other than World: the data is tagged for the 2000×1000 World map only; other maps (and compact/4× scales) must scale boxes or skip the mechanic. Recommend: mechanic active only when `gameMap === World` (or its compact/4× scaling is applied to the boxes).

---

## 13. Source citations

- **`10-economics-and-diplomacy.md`** §6 (chokepoint facts: Hormuz 20%+ oil/LNG; Malacca 24% seaborne / 45% crude / 80% China oil; Suez+Bab-el-Mandeb 10–12% seaborne, 30% containers; Houthi 9.3→4.1M bpd, +256% rates, Egypt −$6B) and **§8.8a** (the design proposal this implements) — citing Britannica, The Conversation, AITimeline, CFR, EIA.
- **`05-terrain-and-geography.md`** §6 (the strait lat/long table and "trade-concentration and blockade points" framing) + the world-map coordinate projection used to derive pixel boxes.
- **`08-game-dynamics-notes.md`** — the "cutting an enemy's oil via controlling a strait" checklist item and the repo's deterministic/testable/gated discipline.
- Engine ground-truth used to calibrate numbers: `EngineConfig.tradeShipGold` (~75K–120K/voyage), `Port` cost ~125K, `goldAdditionRate` (~100/tick), `tradeMultiplier` (§8.1 relation tiers), `TradeShipExecution.tick()/complete()` (the hook point), `EngineConfig.isRealisticWorld()` gate, `TerrainType.Ocean`, and the World map manifest (2000×1000).
- Empirical chokepoint economics for the toll scale: ~4–6% per voyage is within the range real canal/transit toll regimes extract (Suez is Egypt's single largest revenue earner), consistent with §6.2's "a small actor imposes measurable but not total costs."
