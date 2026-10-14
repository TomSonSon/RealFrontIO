# Skill Tree v2 — Six Strategic Directions (Design)

> **Status: design.** Supersedes the v1 slice (2 branches × 3 tiers) described in
> `11-leveling-and-tech-tree.md` and implemented in `packages/engine/src/realism/TechTree.ts`.
> This document proposes a **much more sophisticated** tree: 6 branches × 4 tiers, **cross-branch
> prerequisites** (a real tech DAG, not independent columns), enriched effects mapped to distinct
> deterministic engine hooks, a global anti-snowball rank cap, and a deterministic nation
> default-spend policy.
>
> All numbers are starting points for playtests. Everything remains **gated behind
> `isRealisticWorld`** and bit-identical on every client (per-player multipliers threaded through
> `EngineConfig`), so classic mode is untouched.

---

## 1. Design goals

1. **6 distinct strategic directions.** Each branch answers a different strategic question and
   owns a *different* game axis, so there is real "what am I building toward?" tension.
2. **A real tree, not columns.** Cross-branch prerequisites make the graph a **DAG**. To get the
   deepest tech you must invest in a *supporting* branch first — mirroring how real doctrines
   require enabling capabilities (you can't run a motorized fleet without motorization).
3. **Meta / economy interplay.** One branch (Education) is the "research" branch: it discounts
   all tech costs, so investment feeds further investment — a deliberate feedback loop that is
   deterministic (it only reads owned nodes).
4. **Distinct, non-overlapping hooks.** No two branches pump the same stat (the old tree lumped
   everything into 4 hooks). Nine per-player effects, each mapped to a named engine system.
5. **Dampened + capped.** Per-hook ceilings stay ~1.3×–1.6×, and a global **rank cap** prevents
   snowballing. Completing a 4-tier branch costs 4 of the cap's ~8 points.
6. **Deterministic + snapshot-safe.** State stays game-level (`Map<smallID, string[]>`), effects
   are pure functions of owned nodes, and everything is extended from the existing
   `TechMultipliers` pattern.

---

## 2. The six directions (at a glance)

| # | Branch | Strategic question | Engine axis (effects) | "Feels like" |
|---|---|---|---|---|
| 1 | **Military** | Smash harder, keep fighting | Offense combat power, troop regen | The war machine |
| 2 | **Economy** | Earn more, out-scale | Passive gold income, trade yield | Money printer |
| 3 | **Logistics** | Move faster, field more | Army/conquest speed, naval fleet capacity | Reach & throughput |
| 4 | **Industry** | Build cheaper & faster | Structure cost, construction speed | Production base |
| 5 | **Education** | Out-research everyone | Research cost discount (all branches), small income | The academy |
| 6 | **Defense** | Make your land hell to take | Defender combat power, fortification resilience | Fortress doctrine |

---

## 3. Effects → engine hooks

Each effect is a per-player multiplier/value threaded through `EngineConfig.techMultipliersFor`
(identity = 1 / classic). The additions beyond v1 are `defensePower`, `tradeYield`, `attackSpeed`,
`buildTime`, `fleetCapacity`, and `techCost`.

| Effect | Semantics | Engine hook (existing → new) |
|---|---|---|
| `attackPower` | Offense combat strength | `attackAmount`, `boatAttackAmount`, `attackerCombatPower` (exists) |
| `defensePower` | Defender combat strength | **new** `input.defenderCombatPower` in `attackLogic` (mirror of the attacker field) |
| `troopRegen` | Troop regeneration rate | `troopIncreaseRate` (exists) |
| `goldIncome` | Passive worker gold | `goldAdditionRate` (exists) |
| `tradeYield` | Trade-ship & train payout | **new** multiplier in `tradeShipGold` / `trainGold` |
| `structureCost` | Structure unit cost (<1 = cheaper) | `costWrapper` (exists) |
| `buildTime` | Construction duration (<1 = faster) | **new** multiplier on structure construction completion ticks |
| `attackSpeed` | Conquest throughput (>1 = faster) | **new** multiplier dividing `tickFraction` in `attackLogic` (faster offensive push) |
| `fleetCapacity` | Naval fleet size bonus | **new** ceil on `boatMaxNumber` (base 3 + bonus) |
| `techCost` | All tech purchase cost (<1 = cheaper) | **new** discount applied in `spendTech` / `canPurchaseTech` / nation policy |

Same-hook effects **sum within and across branches** onto a base of 1 (transparent, bounded); the
global rank cap keeps the totals in check.

---

## 4. The full tree (24 nodes)

Cost curve: tier 1 = 25k, tier 2 = 50k, tier 3 = 100k, tier 4 = 200k (doubling), except the
Education branch which is ~20% more expensive per tier (30k/60k/120k/240k) because it discounts
everything else.

Legend — **prereq** shows same-branch (tier above) and **cross-branch** (other branch) gates.
Effect values are addends onto 1.

### 1) MILITARY — *the war machine*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| m1 | 1 | Conscript Drill | 25k | troopRegen +0.15, attackPower +0.10 | — |
| m2 | 2 | Modern Infantry | 50k | attackPower +0.20 | m1 |
| m3 | 3 | Combined Arms | 100k | attackPower +0.15, troopRegen +0.10 | m2 |
| m4 | 4 | Military Revolution | 200k | attackPower +0.20 | m3 **+ l3 (Logistics)** |

*Max attackPower from this branch alone: 0.65 → 1.65×. Max troopRegen 0.25 → 1.25×.*

### 2) ECONOMY — *the money printer*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| e1 | 1 | Treasury Reforms | 25k | goldIncome +0.15 | — |
| e2 | 2 | Commercial Law | 50k | tradeYield +0.15 | e1 |
| e3 | 3 | Trade Liberalization | 100k | goldIncome +0.15, tradeYield +0.10 | e2 |
| e4 | 4 | Global Markets | 200k | tradeYield +0.20 | e3 **+ l2 (Logistics)** |

*Max goldIncome 0.30 → 1.30×; max tradeYield 0.45 → 1.45×.*

### 3) LOGISTICS — *reach & throughput*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| l1 | 1 | Supply Lines | 25k | attackSpeed +0.20 | — |
| l2 | 2 | Motorization | 50k | attackSpeed +0.20, troopRegen +0.05 | l1 |
| l3 | 3 | Fleet Auxiliary | 100k | fleetCapacity +1 | l2 **+ m1 (Military)** |
| l4 | 4 | Rapid Deployment | 200k | attackSpeed +0.25 | l3 **+ m2 (Military)** |

*Max attackSpeed 0.65 → 1.65×; fleetCapacity +1 (base 3 → 4 transports).*

### 4) INDUSTRY — *the production base*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| i1 | 1 | Standardized Parts | 25k | structureCost -0.08 | — |
| i2 | 2 | Assembly Methods | 50k | structureCost -0.08, buildTime -0.10 | i1 |
| i3 | 3 | Heavy Industry | 100k | buildTime -0.10, structureCost -0.04 | i2 |
| i4 | 4 | Megafactory | 200k | structureCost -0.10 | i3 **+ e2 (Economy)** |

*Max structureCost -0.30 → 0.70×; max buildTime -0.20 → 0.80×.*

### 5) EDUCATION — *the academy (meta)*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| r1 | 1 | Education Reforms | 30k | techCost -0.10 | — |
| r2 | 2 | Universities | 60k | techCost -0.10 | r1 |
| r3 | 3 | Applied Research | 120k | techCost -0.10, goldIncome +0.05 | r2 |
| r4 | 4 | Think Tank | 240k | techCost -0.10 | r3 **+ e1 (Economy)** |

*Max techCost -0.40 → 0.60× (40% off all research — the big meta payoff).*

### 6) DEFENSE — *the fortress doctrine*
| id | Tier | Name | Cost | Effects | Prereq |
|---|---|---|---|---|---|
| d1 | 1 | Fortification Doctrine | 25k | defensePower +0.15 | — |
| d2 | 2 | Garrison Training | 50k | defensePower +0.15, troopRegen +0.05 | d1 |
| d3 | 3 | Citadel Networks | 100k | defensePower +0.10 | d2 **+ i1 (Industry)** |
| d4 | 4 | Total Defense | 200k | defensePower +0.20 | d3 **+ i1 (Industry)** |

*Max defensePower 0.60 → 1.60×.*

---

## 5. Rules & anti-snowball

- **Prereqs:** a node needs its same-branch tier−(n−1) **and** any listed cross-branch node
  (DAG). `isUnlocked(owned, id)` checks the full set.
- **Rank cap:** `CAP_TOTAL_RANKS = 8` owned nodes per player. Completing one 4-tier branch uses
  half the cap; completing two is exactly the max (and usually impossible due to cross prereqs).
- **Determinism:** `computeMultipliers(owned)` is pure; the DAG order is a fixed declaration
  order; `PseudoRandom` is never used in effects.
- **No persistence:** per-game only, exactly as v1.

---

## 6. Nation default-spend policy (deterministic)

Replace the v1 two-branch heuristic with a branch **preference** computed from deterministic state,
one purchase per policy tick (`TECH_POLICY_INTERVAL = 100`):

| Situation (read-only state) | Preferred branch order |
|---|---|
| `gold ≥ RICH_GOLD_THRESHOLD (200k)` | Economy → Education → Industry → Military → Logistics → Defense |
| At war / hostile neighbors (avg relation < -30) | Military → Logistics → Defense → Economy → Industry → Education |
| Otherwise (peacetime builder) | Industry → Economy → Defense → Education → Military → Logistics |

Within the chosen order it buys the cheapest **affordable, unlocked** node; the cross-branch
prereqs naturally produce the supporting investments. Ties broken by fixed declaration order.

---

## 7. Implementation plan (build order)

1. **Extend `TechMultipliers`** in `TechTree.ts` with `defensePower`, `tradeYield`, `attackSpeed`,
   `buildTime`, `fleetCapacity`, `techCost` (identity values: 1 / 1 / 1 / 1 / 0 / 1).
2. **Replace `TECH_NODES`** with the 24-node DAG + a cross-branch prereq table + cost curve;
   bump `CAP_TOTAL_RANKS` to 8; keep the versioned snapshot schema (add `version` migration if
   the entries shape changes — it already stores `[smallID, string[]]`, so it can stay v1).
3. **Add the deterministic prunes in `EngineConfig`:** read the new effects in `attackLogic`
   (`defenderCombatPower`), `tradeShipGold`/`trainGold` (`tradeYield`), structure construction time
   (`buildTime`), `boatMaxNumber` (`fleetCapacity`), and `spendTech`/`canPurchaseTech`
   (`techCost`).
4. **Update the nation policy** to the branch-preference table above.
5. **Tests:** rework `tests/TechTree.test.ts` for 24 nodes (cost curve, prereq DAG incl. cross
   branches, cap, pure multiplier math, snapshot round-trip) + new focused tests for each new hook
   (defender combat, attack speed, fleet capacity, build time, trade yield, tech discount).
6. Full suite + typecheck + lint + Prettier, commit on `feat/real-world-realism`.

---

## 8. Balance notes / open questions

- **Education can self-fund.** Its `techCost` discount applies to its own future tiers, so an
  Education player pays 30k → 54k → 108k → 216k (with 3 prior Education nodes discounted).
  Verified deterministic; playtest whether the -0.40 total is too strong (could drop to -0.30).
- **`attackSpeed` on `tickFraction`** makes deep-Logistics attackers dramatically faster at
  conquest; pair with the existing focus system (§7 wiki) for a true Blitz build.
- **`fleetCapacity +1`** is chunky; consider a fractional model (`boatMaxNumber = ceil(3×factor)`)
  if +1 is too strong.
- **Defense + Industry cross-gate** means fortress nations must also industrialize — intended.
- **Cross-branch prereqs** should be surfaced in the client UI as "requires X" on locked nodes.

---

*Proprietary work of SanoLabs GmbH — see `SANOLABS-LEGAL-NOTICE.md`. Sources/methodology of the
underlying realism research: `research/real-world-realism/11-leveling-and-tech-tree.md`.*
