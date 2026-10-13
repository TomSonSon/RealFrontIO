# OpenFront — Real-World Realism Mode (Implementation Wiki)

> A **wiki-style** operator's reference for every system added on the
> `feat/real-world-realism` branch. It explains *what* each system does, *how it
> interacts* with the rest of the engine, and the *exact weightings/constants*
> used at the time of writing. All numbers live in the code and are tuned in
> playtests; this document is the human-readable map of them.
>
> Everything in this document is **gated behind the optional `isRealisticWorld`
> game modifier**. With the modifier off, classic OpenFront behaves exactly as
> it always has (bit-identical simulation, no balance change).

---

## Table of contents

1. [How to enable it](#1-how-to-enable-it)
2. [Design pillars & the determinism contract](#2-design-pillars--the-determinism-contract)
3. [Realistic nation strength (starting troops & gold)](#3-realistic-nation-strength)
4. [Realistic starting relations (diplomacy seed)](#4-realistic-starting-relations)
5. [Starting capitals](#5-starting-capitals)
6. [Terrain as a real barrier](#6-terrain-as-a-real-barrier)
7. [Region / front-focused attacks](#7-region--front-focused-attacks)
8. [Relation-scaled trade](#8-relation-scaled-trade)
9. [Sanctions & coalition pressure](#9-sanctions--coalition-pressure)
10. [Reputation & betrayal](#10-reputation--betrayal)
11. [Coalition war declarations](#11-coalition-war-declarations)
12. [Attacks are contiguous (no implicit passage)](#12-attacks-are-contiguous-no-implicit-right-of-passage)
13. [Chokepoint toll & interdiction](#13-chokepoint-toll--interdiction)
14. [Per-game skill / tech tree](#14-per-game-skill--tech-tree)
15. [Client UI wiring](#15-client-ui-wiring)
16. [How systems interact (worked examples)](#16-how-systems-interact)
17. [Testing & determinism coverage](#17-testing--determinism-coverage)
18. [Status & roadmap](#18-status--roadmap)

---

## 1. How to enable it

Realism is a **single lobby modifier**: `publicGameModifiers.isRealisticWorld = true`.

- It is an **optional play mode**. All other modes and games are completely unchanged.
- It is read by `EngineConfig.isRealisticWorld()` (in `packages/engine/src/configuration/EngineConfig.ts`).
- Every balance-affecting change in this feature is **gated behind this flag** — the realism
  code paths are *only* reached when it is on, so classic mode stays byte-for-byte identical.
- The client shows a **"Realistic World" badge** on the lobby when the modifier is active, and the
  in-game player-panel buttons that depend on realism (e.g. "Declare coalition war") are hidden
  unless it is on.

Because the modifier only seeds starting values and switches a few deterministic formulas, the
simulation is still a fully deterministic, lock-step countdown sim on every client.

---

## 2. Design pillars & the determinism contract

Every realism system follows the same five rules:

1. **Deterministic.** No `Math.random()`, no wall-clock, no host-only reads. Anything that varies
   is derived from existing game state (tile ownership, gold, troops, relations, difficulty).
2. **Bit-identical on every client.** All clients run the same engine and must agree on every
   value — so the math is pure and order-stable (fixed iteration orders, count-then-tiebreak).
3. **Gated.** Any change that could alter balance is behind `isRealisticWorld()`.
4. **No cross-game persistence.** All state (reputation, tech, relations) is **per-game only**;
   nothing survives into the next match.
5. **Dampened.** Bonuses are deliberately modest (the tech tree caps out around ~1.5× per hook)
   so a "superpower" is strong but never a foregone victor. Anti-snowball clamps exist throughout.

---

## 3. Realistic nation strength

**File:** `packages/engine/src/realism/RealisticWorld.ts` → `REALISTIC_SEEDS` (+
`EngineConfig.startManpower` / `startingGoldFor`).

When the mode is on, **nation** players start with troops and gold scaled to their real-world
military power instead of the flat default (which is otherwise: Nation Easy 12.5k / Medium 18.75k /
Hard 25k / Impossible 31.25k troops; humans & bots unchanged).

Representative seed values:

| Tier | Nation | Starting troops | Starting gold |
|---|---|---|---|
| Superpower | United States | 100,000 | 500,000 |
| Superpower | China | 85,000 | 420,000 |
| Superpower | Russia | 75,000 | 380,000 |
| Major | India | 62,000 | 280,000 |
| Major | UK / France / Japan | 46,000 | 240k–280k |
| Major | Germany | 40,000 | 320,000 |
| Strong regional | Iran | 32,000 | 140,000 |
| Middle power | Israel | 28,000 | 160,000 |
| Small | Iceland / Greenland | 8,000 | 20,000 |

- The full table covers ~60+ World-map nations (`REALISTIC_SEEDS`). Names must match the nation
  `name`s in `resources/maps/world/info.json`.
- **Sub-regions** on the World map (California, Texas, Siberia, Quebec, Alaska, Nunavut, Yukon)
  are *not* listed; they resolve to their parent nation's seed scaled by a fraction
  (`subRegionFraction`): Siberia 0.4, California/Texas 0.45, Quebec 0.5, Alaska 0.3, Nunavut/Yukon
  0.25, default 0.33.
- **Interaction:** bigger starting gold means faster access to high-tier structures and, in
  Realism mode, faster access to the high-cost **tech tree** (below) — so a rich nation
  "develops" faster, which is the intended line.

---

## 4. Realistic starting relations

**File:** `REALISTIC_RELATIONS` in `RealisticWorld.ts`; applied by `GameImpl.seedRealisticRelations()`.

When the mode is on, nations start with a seeded **relation score** (a raw `[-100, 100]` value)
toward other nations. The `Relation` buckets are:

| Bucket | Raw score range |
|---|---|
| Hostile | < -50 |
| Distrustful | -50 … -1 |
| Neutral | 0 … 49 (the default for unlisted pairs) |
| Friendly | ≥ 50 |

**Seeding convention used in the data:**

| Meaning | Score |
|---|---|
| Allied / close friend | +80 |
| Strong partner | +60 |
| Cooperation / hedge | +30 … +40 |
| Tense rivalry | -40 |
| Hostile / adversary | -60 … -80 |

Examples baked in: US–UK **+80**, US–Russia **-80**, US–Iran **-80**, China–Taiwan **-80**,
Russia–Ukraine **-100**, Russia–Belarus **+100**, India–Pakistan **-70**, UK–France **+80**.
Unlisted pairs default to **0 (neutral)**.

- Relations **decay back toward 0** over time (`decayRelations`, 0.05 per tick toward the sign
  of the value, snapping to 0 when within noise) — so the seed is a *starting* shape, not a
  permanent script.
- **Interaction with trade (§8):** relation drives the trade multiplier bucket; **interaction
  with coalitions (§11):** a nation is far more likely to vote to join a coalition against an
  already-hostile target.

---

## 5. Starting capitals

**File:** `placeNationCapital` in `RealisticWorld.ts`.

In Realism mode each nation opens with a **capital city** at its map-defined spawn/preferred tile
(falling back to any owned buildable land tile). The city is built through the normal build path,
so it persists in game state like any other unit (no extra snapshot state).

- **Interaction:** a capital anchors the nation's early troop/gold income and gives it a
  defensive foothold to hold its realistic starting territory — reinforcing the "start from
  reality" goal.

---

## 6. Terrain as a real barrier

**File:** `terrainAttackBase()` + `attackLogic()` in `EngineConfig.ts`.

In Realism mode the **terrain attack bases change** so mountains become genuinely costly and
bloody (per research `05`):

| Terrain | Realism `mag` / `tileCost` | Classic `mag` / `tileCost` |
|---|---|---|
| Plains | 75 / 14 | 80 / 16.5 |
| Highland | 110 / 26 | 100 / 20 |
| Mountain | **170 / 42** | 120 / 25 |
| Impassable | (not attackable) | (not attackable) |

- `mag` scales attacker troop **loss**; `tileCost` scales **time** to take the tile.
- **Interaction with §7:** in Realism mode the conquest search *deprioritises* mountains
  (`AttackExecution.addNeighbors`), so armies naturally route **around** mountain ranges rather
  than over them — turning peaks into defensive lines and natural strategic chokepoints.

---

## 7. Region / front-focused attacks

**File:** `packages/engine/src/execution/AttackExecution.ts`.

Players can pick a **focus tile** (from the clicked tile in the client → `SendAttackIntentEvent.tile`)
so the attack pushes a specific region harder — "concentrate the main effort" (Schwerpunkt).

Weightings (constants in `AttackExecution.ts`):

| Constant | Value | Meaning |
|---|---|---|
| `FOCUS_RADIUS` | 40 | Tiles from the focus treated as the "main effort" |
| `FOCUS_PRIORITY_BONUS` | 60 | Min-heap priority offset so focus tiles dequeue first |
| `FOCUS_SPEED_MIN` | 0.5 | Budget-cost multiplier at the focus ⇒ **2× throughput** |
| `FOCUS_SPEED_MAX` | 2.0 | Budget-cost multiplier far away ⇒ 0.5× throughput |

- The conquest heap is a **min-heap** (lower priority dequeues first), so near the focus a tile's
  priority is *lowered* by up to `-FOCUS_PRIORITY_BONUS`, weighted linearly by
  `(1 - distance/FOCUS_RADIUS)`.
- Speed cost interpolates linearly from `FOCUS_SPEED_MIN` at `distance ≤ FOCUS_RADIUS` to
  `FOCUS_SPEED_MAX` at `distance ≥ FOCUS_RADIUS * 2`.
- **Interaction with §12:** even with a focus, the attack can only push through tiles it can
  legally reach (ground bordering the attacker's own land).

---

## 8. Relation-scaled trade

**File:** `tradeMultiplier(rel)` in `EngineConfig.ts`; consumed by trade-ship / train gold.

Everyone still trades (rivals trade in reality too), but the **bloc alignment adjusts the payout**:

| Relationship | Trade multiplier |
|---|---|
| Ally | **1.2×** (intra-bloc alignment bonus) |
| Self / Team | 1× |
| Other (neutral/rival) | **0.7×** (tariffed) |

- Classic mode always returns 1.
- **Interaction with §13:** a trade ship passing a chokepoint owned by an **ally** is exempt from
  the toll (right of passage); a ship passing one owned by a rival pays the toll. Sanctions (§9)
  and embargos can further cut a target's trade income.

---

## 9. Sanctions & coalition pressure

**Files:** `coalitionSanctionFactor()` in `EngineConfig.ts`; `coalitionSanctionedGold()` in
`PlayerExecution.ts`.

A nation's **passive worker-gold income** is reduced for every other player currently embargoing
it; coordinated (multi-sender) isolation hurts more:

```
coalitionSanctionFactor(senders) = max(0.5, 1 - 0.25 * senders)
```

| # embargo senders | Income factor |
|---|---|
| 0 | 1.0 (no sanction) |
| 1 | 0.75 |
| 2 | 0.50 |
| 3+ | 0.50 (capped floor) |

- The floor `0.5` means a sanctioned economy keeps at least half its passive income (no total
  collapse).
- **Interaction:** coalition war declarations (§11) **auto-sanction** the target by having each
  joined member add an embargo, immediately stacking the sanction. Trade embargos also block the
  embargoed pair from trading (`canTrade`).

---

## 10. Reputation & betrayal

**File:** `PlayerImpl.reputation()` / `betrayals()` / `canSendAllianceRequest()`, `Game.breakAlliance`.

Reputation is a **derived, per-game** value — there is deliberately **no cross-game persistence**
and no extra snapshot field; it's computed from the already-tracked betrayal count:

```
reputation() = -40 * betrayals
```

| Betrayals this game | Reputation |
|---|---|
| 0 | 0 |
| 1 | -40 |
| 2 | -80 |
| 3 | -120 |

- A betrayal (`markTraitor`) also flags the traitor briefly and records stats.
- **Interaction:** in Realism mode a player whose reputation drops below **-30**
  (`reputation() < -30`) — i.e. after the **first** betrayal — **can no longer send new alliance
  requests** for the rest of the game. Nobody will ally a proven traitor.
- The break itself carries the classic speed/defense debuffs (`traitorSpeedDebuff` 0.8, etc.).

---

## 11. Coalition war declarations

**Files:** `GameImpl.declareCoalitionWar`; bot votes via
`packages/engine/src/execution/nation/NationCoalitionBehavior.ts`; client in §15.

An initiator proposes a war on a **target** to a set of **candidate members**. Each candidate that
**votes YES** (via the nation AI below) commits: it becomes **Hostile** to the target
(`updateRelation(target, -100)`) and **auto-sanctions** it (adds an embargo, → §9).

### The bot vote heuristic (`NationCoalitionBehavior.voteYes`)

- **Never** join a war against an ally/teammate.
- Only tag along if the initiator is **friendly** — *or* the target is already **Hostile**.
- A **score** of shared interest accumulates:

| Condition | Score |
|---|---|
| Target is Hostile | +3 |
| Target is Distrustful | +1 |
| Bandwagon: `us > them × 1.5` (easy pickings) | +1 |
| Threat: `them > us × 2` (must stop a rival) | +1 |

  where `us = voter troops + initiator troops`, `them = target troops`.

- The vote is **YES if score ≥ threshold**, by difficulty:

| Difficulty | Threshold |
|---|---|
| Easy | 5 |
| Medium | 3 |
| Hard | 2 |
| Impossible | 1 |

So an Easy nation is reluctant to volunteer for wars; an Impossible nation joins eagerly. The
`PseudoRandom` is deterministic and deliberately **unused** inside the vote — the decision is a
pure function of relations/troops/difficulty, hence bit-identical everywhere.

- **Interaction with spoils:** multiple hostile co-attackers against one target (classic allied
  conquest spoils logic) means a coalition that declares war shares the conquest of the target.
- A full coalition declaration is a near-hostile act (sanctions + Hostile), so it strains the
  target's economy while the coalition concentrates military force.

---

## 12. Attacks are contiguous (no implicit right of passage)

**File:** `AttackExecution.ts`. Realism attacks seed and check borders exactly like classic mode.

Right of passage is **not implicit**. An attack starts only from the attacker's own border and
conquers only target tiles that are adjacent to that frontier. So:

- An attack never launches from an ally's border, and never jumps across a third country or into
  a disconnected part of the target.
- An ally that borders the target does not open a route. The attacker gains no target tiles
  unless it borders the target itself.
- Attacked land stays one connected piece with the attacker's original land.

A future explicit diplomatic grant (the `passage` design in `10-economics-and-diplomacy.md` section 8.7)
is the intended way to route through allied land. It is not implemented.

- **Interaction with §7 (§focus):** the focus only biases *which* reachable tiles are taken first;
  borders decide *whether* they're reachable at all.

---

## 13. Chokepoint toll & interdiction

**Files (data):** `packages/engine-api/src/resources/Chokepoints.ts` (read-only strait-tag pass).
**Files (mechanic):** `packages/engine/src/realism/ChokepointToll.ts` + `TradeShipExecution.ts`.

### The data pass

17 real maritime chokepoints are tagged with pixel bounding boxes on the 2000×1000 World map
(equirectangular, `x = (lon+180)/360*2000`, `y = (90-lat)/180*1000`): Hormuz, Malacca,
Bab-el-Mandeb, Suez, Turkish Straits, Gibraltar, Panama, Dover, Danish Straits, Bering, Taiwan,
Luzon, Tsushima, Lombok, Sunda, Mozambique, Drake.

Each has a **tier** and suggested toll/interdiction values:

| Tier | `TIER_BASE_TOLL` (per-transit gold) | Examples |
|---|---|---|
| Global | 5,000 | Hormuz (5k), Malacca (6k), Suez (5k), Bab-el-Mandeb (4k) |
| Major | 3,000 | Gibraltar, Panama, Taiwan (3.5k), Dover (2.5k), Turkish (3k) |
| Minor | 1,500 | Tsushima (1.8k), Lombok/Sunda (1.5k), Bering (0.8k), Mozambique (1k), Drake (0.8k) |

Each strait also carries `suggestedInterdictionFraction` (Hormuz/Malacca 0.5, Suez 0.4, down to
Drake 0.15).

### The mechanic (`ChokepointToll.ts`, all pure/deterministic)

- **Control** — `chokepointController(game, cp): Player | null` walks the strait's water bbox,
  finds Ocean tiles, and tallies adjacent land **by owner** (8-directional). The **plurality**
  owner controls it; ties break to the **smaller `smallID`**. Terra-nullius-only window ⇒
  `null` (free transit). Since control is *derived from current tile ownership* each call,
  capturing the coasts **flips control automatically** (no stored claim).
- **Passive toll** — `tollForTier(tier, goldMultiplier)` = `round(TIER_BASE_TOLL[tier] ×
  goldMultiplier)`, credited once per strait per voyage when a trade ship crosses the strait's
  water band. So the controller earns real gold from everyone who uses "their" strait.
- **Toll exemption** — `isTollExempt(shipOwner, controller)`: the controller's own ships,
  teammates, and **allies** transit toll-free (right of passage, ties §12).
- **Interdiction** — `interdictMultiplier(cp)` = `1 - suggestedInterdictionFraction`; a
  controller that interdicts cuts a passing (non-exempt) enemy ship's arrival payout by that
  fraction. E.g. closing Hormuz trims a voyage's value by 50%.
- All gated behind `isRealisticWorld()` (the caller short-circuits; classic sim untouched).

- **Interaction:** chokepoints reward controlling strategic coasts (bases/cities on a strait
  become economically valuable), and stack with §8/§9 — an interdicted, sanctioned rival bleeds
  trade gold from multiple directions.

---

## 14. Per-game skill / tech tree

**Files:** `packages/engine/src/realism/TechTree.ts` (data + pure math), `EngineConfig.ts`
(hooks), `GameImpl.ts` (state + spend + nation policy).

A per-game tech tree, **MILITARY + ECONOMY** branches × **3 tiers**, spendable with gold. Effects
are **additive multipliers** onto a base of **1**; each hook only ever sums *same-branch* nodes
(no compounding "squaring" between hooks). No single system exceeds ~1.5×.

### Node table

| id | Branch | Tier | Name | Cost | Effects |
|---|---|---|---|---|---|
| `military_1` | Military | 1 | Conscript Drill | 25,000 | troopRegen **+0.25** |
| `military_2` | Military | 2 | Modern Small Arms | 50,000 | attackPower **+0.20** |
| `military_3` | Military | 3 | Armored Division | 100,000 | troopRegen +0.15, attackPower +0.20 |
| `economy_1` | Economy | 1 | Treasury Reforms | 25,000 | goldIncome **+0.20** |
| `economy_2` | Economy | 2 | Trade Liberalization | 50,000 | goldIncome **+0.25** |
| `economy_3` | Economy | 3 | Industrial Base | 100,000 | structureCost **-0.15** |

Costs escalate as `BASE_TECH_COST × 2^(tier-1)` = 25k / 50k / 100k. A mid-power nation
(~140–320k starting gold) can afford a couple of early tiers → a real "choose your doctrine"
choice.

### Rules

- **Prequisites:** within a branch, tier N needs tier N−1 (`isUnlocked`).
- **Rank cap:** `CAP_TOTAL_RANKS = 5` owned nodes per player (hard anti-snowball ceiling).
- `computeMultipliers(owned)` sums the relevant per-hook addends onto 1 for each of
  `troopRegen`, `attackPower`, `goldIncome`, `structureCost`.

### Where the multipliers are applied (`EngineConfig`)

| Hook | Applied to |
|---|---|
| `goldIncome` | passive `goldAdditionRate` (100/tick base for non-bots) — also the train/trade-ship base incomes |
| `troopRegen` | `troopIncreaseRate` (scales the base regen) |
| `structureCost` | cost curve reduction in `costWrapper` (cheaper ports/cities/factories/etc.) |
| `attackPower` | `attackAmount` / `boatAttackAmount` and the attacker's `attackerCombatPower` in `attackLogic` (fewer losses dealt, more inflicted) |

All return identity (1) outside Realism or with no provider wired, so classic mode is unchanged.

### State, spend, and nation AI

- State is **game-level** (`_techRanks: Map<smallID, string[]>`), snapshot-safe via a versioned
  `TechTreeSnapshot` (kept out of the per-player schemas so snapshot round-trips / `diffGraphs`
  stay green). Per-game only — no persistence.
- `spendTech(player, nodeId)` checks realism, unlock, cap, and affordability, then deducts gold
  and records the node.
- **Nation default-spend policy** (`applyNationTechPolicy`, every `TECH_POLICY_INTERVAL = 100`
  ticks ≈ 10s): deterministic, reads only gold + owned ranks. A rich nation
  (`gold ≥ RICH_GOLD_THRESHOLD = 200_000`) builds **ECONOMY first** (it funds the rest);
  otherwise it builds **MILITARY first**. Within a branch it buys the cheapest affordable
  unlocked node, one purchase per nation per policy tick, so spending trickles rather than
  dumping. (Humans buy on demand via the UI/client action.)

- **Interaction:** starting gold (§3) and economy nodes compound — a rich nation invests in
  Treasury/Liberalization to snowball income, while a poorer one must spend on staying-power
  (Conscript Drill/Armored Division) first. The rank cap prevents runaway dominance.

---

## 15. Client UI wiring

**Coalition declaration** (client side of §11):

- New intent `declare_coalition_war` (`{ type, target: MappedID, candidates: MappedID[] }`) in
  `packages/engine-api/src/Schemas.ts`.
- `ExecutionManager` dispatches it to a one-shot execution that resolves the ids and calls the
  engine's `game.declareCoalitionWar(...)`; the execution runs once and never crosses a tick
  boundary (reuses the `NoOpExecutionSnapshot`, so no registry/snapshot change).
- `Transport` exposes `SendDeclareCoalitionWarIntentEvent(target, candidates)` → `sendIntent`.
- A **player-panel trigger** ("Declare coalition war") appears only when Realistic World is on,
  letting the player pick a target and invite allied candidates.
- `en.json` carries the UI strings.
- A client test asserts the framework round-trips the intent to the engine input shape.

---

## 16. How systems interact (worked examples)

A few end-to-end chains, because no system sits alone:

- **Superpower start:** US opens with 100k troops / 500k gold (§3), a capital (§5), and +80
  relations with NATO allies / -80 with Russia–Iran (§4). It can immediately afford Treasury +
  Liberalization (§14) to snowball income, while its +80 allies give it 1.2× trade (§8).
- **A Gulf blow-up:** Iran (Hostile to US, -80) and Saudi Arabia are on opposite sides of a
  **Global** chokepoint — Hormuz (§13). Whoever owns more Hormuz coastal land controls the strait
  and earns up to 5k gold per passing foreign ship; allies transit free (§12). A coalition war
  (§11) can auto-sanction the strait's owner, cutting its passive income (§9), while the 
  controller interdicts rival ships to trim their voyage value (§13).
- **The traitor:** A betrays B → reputation -40 (§10) → below the -30 line → can no longer send
  alliance requests; other nations' coalition votes treat it by its (now deteriorated) relations.
  If a coalition forms against A, its income is sanctioned from several senders at once (§9/§11).
- **Doctrine choice:** a mid-power (32k troops / 140k gold, e.g. Iran) must choose: 2 early
  Military nodes (Conscript + Small Arms ≈ +25% regen, +20% attack) or spend into the Economy
  tree to fund later Military tiers — exactly the "war now vs. grow" tension (§14). Meanwhile its
  focus-tile attacks (§7) punch through mountain-defended fronts (§6) only via reachable/allied
  ground (§12).

---

## 17. Testing & determinism coverage

Every system ships with focused tests, plus the full engine suite stays green:

- `tests/RealisticWorld.test.ts` — strength seeds, relations, capital, terrain.
- `tests/EconomyAndDiplomacy.test.ts` — trade tiers, sanctions, reputation.
- `tests/FocusedAttack.test.ts` — focus weighting.
- `tests/CoalitionAndPassage.test.ts` - bot votes, no implicit passage through allies, declaration.
- `tests/RealismContiguousAttack.test.ts` - attacks stay contiguous from the attacker's own border.
- `tests/client/RealisticWorldModifierBadge.test.ts` + `tests/client/CoalitionDeclaration.test.ts` — client wiring.
- `tests/ChokepointToll.test.ts` — control/tie-break, one-toll-per-voyage, exemption, interdiction, classic no-op.
- `tests/TechTree.test.ts` — costs, preqs, cap, multiplier math, nation policy, snapshot round-trip.
- Snapshot round-trips (`diffGraphs`) verify every new field/state is serialized bit-identically;
  the full suite (8,5xx tests) passes with the branch merged, and Prettier + oxlint + `tsc`
  are clean.

---

## 18. Status & roadmap

**Implemented (all gated behind `isRealisticWorld`):**

- ✅ Mode + client badge + realistic strength & relations
- ✅ Starting capitals
- ✅ Terrain combat rules (mountains as barriers)
- ✅ Region/front-focused (focus) attacks
- ✅ Relation-scaled trade, sanctions, per-game reputation/betrayal
- ✅ Coalition war declarations (bot votes + auto-sanction + client UI)
- ✅ Attacks are contiguous from the attacker's own border (no implicit passage)
- ✅ Chokepoint data pass + toll/interdiction mechanic
- ✅ Per-game skill/tech tree (Military + Economy)

**Planned next (from the research):**

- 🔲 Structures at real-world hubs (cities/factories/bases per `03`/`04` coordinates; capital is the first slice).
- 🔲 Terrain map regeneration from a real DEM (SRTM/GLO-30) so ranges match reality.

---

*This wiki is generated from the implementation on `feat/real-world-realism`. Figures are
starting points to be tuned in playtests, not gospel. See `research/real-world-realism/README.md`
for the source-of-truth research index and status. Proprietary work of SanoLabs GmbH — see
`SANOLABS-LEGAL-NOTICE.md`.*
