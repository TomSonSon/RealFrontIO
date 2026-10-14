# 11 — Levelling, Skill Trees & Tech Trees: How Nations Get Stronger (for OpenFront "Realistic World" mode)

> **Status:** Research + concrete design proposals. This is the reference the engine
> implementation reads. **Research only — no game code.** Every real-world claim is inline-cited;
> every design proposal names the exact engine hook it plugs into, verified against
> `packages/engine/src/configuration/EngineConfig.ts` and `packages/engine/src/realism/RealisticWorld.ts`.
>
> **One-sentence thesis:** real nations get stronger over time through *institutions and
> technology* (R&D, weapons generations, defense-industry, training, mobilization, doctrine) —
> not through raw territory alone. OpenFront currently gives every nation identical capability
> (differentiated only by starting troops/gold). This document adds a **per-game, deterministic,
> gated-behind-`isRealisticWorld` tech/skill tree** so nations can *specialize* and *climb* during a
> match, grounded in how real militaries actually upgrade — while keeping classic mode untouched.

---

## Table of contents

1. [The real-world question this answers](#1-the-real-world-question-this-answers)
2. [How real nations actually improve military capability over time](#2-how-real-nations-actually-improve-military-capability-over-time)
3. [Design goals & guardrails for an RTS skill/tech tree](#3-design-goals--guardrails-for-an-rts-skilltech-tree)
4. [Per-game tech tree vs. long-term account levelling (recommendation)](#4-per-game-tech-tree-vs-long-term-account-levelling-recommendation)
5. [Concrete tech/skill tree design for OpenFront](#5-concrete-techskill-tree-design-for-openfront)
6. [Balance & implementation notes](#6-balance--implementation-notes)
7. [Sources](#sources)

---

# 1. The real-world question this answers

OpenFront's Realistic World mode already seeds each nation with *different* starting troops and
gold scaled to real military power and budget (see `02-military-capacity.md` §5 = the MPI/starting
formulas, implemented in `RealisticWorld.ts` `REALISTIC_SEEDS`). But once the match starts, every
nation is **on a flat capability plateau**: the only way to get "stronger" is to build more
`City`/`Factory`/`Port`/`Warship`/`MissileSilo` and hold more territory. Nations do not get
*qualitatively* better at fighting, trading, or defending over time — a 1945 US plays exactly like
a 1991 US, which plays like a 2026 US.

That is a real gap. **No real military improves solely by adding more of the same unit.** Militaries
improve through **technology, training, doctrine, and institutions** — and that improvement is
*generationally lumpy*, *expensive*, *uneven* (different nations specialise in different things), and
*directional* (you commit to a path and can't instantly undo it). That is precisely the texture a tech
tree adds, and precisely what is missing.

**Why it matters for gameplay (not just realism):**
- **Strategic choice / trade-offs.** Currently the only choice is "how much of what structure." A tech
  tree adds "do I invest in army lethality, naval reach, economy, or the bomb?" — choices that
  specialise a nation and make matches feel different from each other.
- **Meaningful progression over the match.** Right now the interesting decisions front-load at the
  start (seed) and then flatten. A tree gives a mid-game and late-game arc: "I teched economy early,
  now I out-produce him; he teched army, now he edges me on the border."
- **Comebacks.** A loser that has been pushed to the wall can pivot into an economic or nuclear-tech
  comeback rather than being purely snowballed — *if* the tree is budget-limited and not
  position-limited (see §3).
- **Asymmetry.** Real nations are *uneven* (Japan: high-tech navy, small army; India: mass + nuclear
  backstop; Israel: high-tech, small; §2.5). A tree lets nations and players *choose* to be uneven.
- **Escalation ladder.** A per-game tech tree is the natural home for the game's escalation arc from
  conventional → navy → nukes/MIRV (the existing pre/post-nuclear phases), letting the "race to the
  bomb" be a *deliberate doctrine choice*, not just "who can afford the 5M-gold HydrogenBomb."

---

# 2. How real nations actually improve military capability over time

## 2.1 Technology & R&D — the master driver

The dominant and most durable source of military improvement is **technology and research**. State
investment in R&D and the defense-industrial base converts money into qualitative superiority that
raw numbers alone cannot match [SIPRI; IISS Military Balance].

- **R&D is expensive and lumpy.** Real defense budgets funnel a share into R&D (US RDT&E is
  consistently the single largest US DoD budget category, ~$140–170B/yr of a ~$850–950B budget in
  recent years [CRS DoD budget overview][SIPRI Milex]). A technology is not bought incrementally; it
  arrives as a *generation* — "we funded the fighter program for a decade and now the fleet is 4th-gen
  instead of 3rd-gen." The game translation: techs are discrete purchases with a real gold cost, not
  passive creep.
- **Technology compounds across everything.** A radar is not one unit; it upgrades *every* air-defense
  engagement. Precision munitions are not a unit; they change the *exchange ratio* of every strike.
  Ground-truth for the tree: **a tech should be a global multiplier on a named existing system**, not
  a single new unit (matches `EngineConfig.goldMultiplierFor`, `attackLogic` `mag`, etc.).

The single most instructive historical anchor for "one generation overturns everything" is **WW2
radar, tanks, and aircraft** — a case where *technology*, not manpower, decided the war [history of
tech: radar]:

- **Radar.** Britain's Chain Home radar + integrated command (Dowding system) turned the Battle of
  Britain (1940) into a *force-multiplier victory*: the RAF could intercept Luftwaffe raids
  efficiently and run the battle from the ground, letting a numerically smaller air force win
  [history of tech: Chain Home][Enigma/radar history]. Radar is the canonical "defense/air tech" —
  exactly a "SAM / anti-air / detection" node in a tree.
- **Tanks.** The tank generational story — 1939's thin-skinned light tanks → 1944's heavy/medium
  combined-arms giants (T-34, Panther, Sherman with proper stabilizers) — is the canonical "troop
  strength / armor" node: you don't just add more tanks, the *same* number of tanks is worth
  qualitatively more [history of tech: tanks].
- **Aircraft / precision.** The F-111/Paveway-era precision guided munitions of Vietnam onward and
  the stealth revolution (F-117, 1991 Gulf War "invisible" first night) showed that *each platform
  doing more per sortie* — accuracy, not volume — is the lever [history of precision munitions]. This
  is the "doctrine / force-multiplier" argument: a smaller, better-equipped force beats a larger
  obsolete one — the US destroyed 41 Iraqi divisions in ~100 hours in 1991 with a coalition that was
  *locally* decisive rather than globally overwhelming [09 §1.7].

**Design lesson:** ground-tech nodes should be *global multipliers with generational jumps*
(e.g., tier-1 to tier-5 "infantry weapons/T-34→Abrams" line) rather than unit-by-unit upgrades.

## 2.2 Combat experience, veterancy & training

Raw capability also improves through **training and combat experience** [history of tech; standard
military-effectiveness literature]. Real examples:

- **WW2 jet/air combat and the USMC/Nazi divisions' experience curves** — units fresh vs. combat-hardened
  fight differently; "veterancy" is a real, documented force multiplier [veterancy military history].
- **Ukraine 2022–present** is the modern poster child: a force considered small on paper repeatedly
  punched above its weight because of **initiative, adaptation, and combat-learned experience**
  (drone warfare, decentralized command), giving "war-hardened" nations a qualitative edge that raw
  manpower counts miss [09 §3.2][CEPA/RUSI].
- **The 02 file flags Ukraine explicitly** as "war-hardened — give a high 'experience' bonus in-game"
  [02 §5.3], and Japan/Germany as "rich but rebuild slowly" — so a **veterancy/experience mechanic is
  already a named open loop** in the realism series.

**Design lesson:** a per-game "veterancy" node that rises with *tiles conquered / battles won* and
boosts troop damage is cheap to implement and directly matches an already-requested realism target.
But guard it: it must be a *power-dampened* bonus so it can't snowball a winner into an untouchable
wall (§3).

## 2.3 Defense-industrial base & economies of scale

Nations improve not just by buying tech but by **building the industry to make it cheaper and
faster** [04-cities-and-industry.md; SIPRI arms industry]:

- **Economies of scale / learning curve.** Real defense production enjoys a **learning curve** — each
  doubling of cumulative production typically cuts unit cost ~10–20% (the "experience curve", well
  documented in aerospace/shipbuilding) [learning curve defense cost; 04 file on arms hubs]. More
  factories not only produce more, they produce *cheaper per unit*.
- **Defense-industrial base as an institution.** Nations with a broad domestic arms industry (US,
  China, Russia, France, Israel, South Korea, Türkiye — the hubs in `04`) can sustain production under
  attrition, maintain and *mod* existing platforms, and re-tool; nations that import everything
  (many small states) are brittle under sanctions [04; SIPRI arms transfers]. The 04 file already maps
  these hubs to **factor/`Factory` structure placement**.
- **The engine already has a `pow2`-based cost curve** (`EngineConfig.unitCost` via `costWrapper`
  uses `pow2` so "City/Factory cost escalates with count"). Economies of scale is the *inverse*:
  a tech that **flattens the escalation curve** (build the N-th factory at a discount) is a clean,
  deterministic economy node.

**Design lesson:** an ECONOMY branch with "industrial-scale / cost-curve flattening" nodes maps
directly onto the existing `pow2` city/factory cost curve and on `goldMultiplierFor`/`goldAdditionRate`.

## 2.4 Mobilization & manpower

A nation's *capacity to generate* forces over time is itself improvable through **mobilization** —
conscription, reserves, industrial surge [08 file flags mobilization as a gap][mobilization history]:

- **WW1/WW2 mass mobilization** transformed peacetime professional armies (hundreds of thousands) into
  multi-million national armies within months — the "total war" mobilization [mobilization history].
  Russia's 2022 partial mobilization (~300k) and Ukraine's general mobilization (730k–1M in arms, per
  02 §2.5) show both the power and the cost of this dial [IISS; 02].
- The 08 file explicitly asked: *"Should 'people' (manpower pool) affect troop regeneration rate over
  time (`troopIncreaseRate`)?"* — today regen is difficulty-based and equal. A **mobilization /
  manpower node that raises `troopIncreaseRate`** is exactly the requested mechanic, and it is the
  natural "will to fight / staying power" lever.

**Design lesson:** a node that scales **troop regeneration** (`troopIncreaseRate`) is a "manpower /
mobilization" branch — the *comeback* lever (see §3).

## 2.5 Doctrine — the invisible multiplier

**Doctrine** (how a military *fights* — maneuver vs. attrition, offense vs. defense) is a force
multiplier with no new hardware at all. From `09-war-dynamics.md`:

- **Maneuver / blitzkrieg doctrine** (German 1940, Soviet deep battle) = speed, concentration on a
  main axis (Schwerpunkt), *local* superiority even when globally outnumbered — "concentrate where it
  counts, economize elsewhere" [09 §1–§2][Clausewitz][history of blitzkrieg/deep operation].
- **Attrition doctrine** (Verdun, WW2 Eastern Front, Ukraine's "meatgrinder") = durability, trading
  space for time, absorbing losses and outlasting — "bleed the enemy white" [09 §3][military strategy].
- **Modern joint doctrine** treats *main effort vs. supporting effort* and defense-in-depth as
  organization choices that change outcomes for the *same* equipment [09 §2, §5][ATP 5-0/FM 3-0].

**Design lesson:** a "DOCTRINE" fork (e.g., **Blitzkrieg**: speed + attack strength vs. **Attrition**:
durability/defense + lower losses) gives high-value *strategic trade-off* with essentially no new
systems — it's a set of numeric multipliers on the existing `attackLogic` inputs (`mag`, `tileCost`,
`attackTroopLoss`) [09 §7.1]. This is the *cheapest* way to add real strategic depth.

## 2.6 The defense-industrial / generation pattern summed up

Across §2.1–§2.5, the recurring structure is:

> **A nation's power = f(starting mass, and the technologies/doctrines/institutions it invests in).**
> Investment is expensive, directional, generational, and uneven across nations. Improvement comes in
> *bounded* quanta (a generation), not continuous creep, and is *dampened* by real constraints (cost,
> time, attrition, doctrine lock-in).

This is almost a definition of an RTS tech tree. The design in §5 turns each of these real dynamics
into a deterministic, gated node.

---

# 3. Design goals & guardrails for an RTS skill/tech tree

## 3.1 What a tech tree should accomplish (the goals)

Synthesizing from standard RTS design and from *why* the user asked for this (deeper, more realistic,
more strategic):

1. **Meaningful progression.** There is a clear mid/late-game arc — nations go from "flat equal" to
   "specialized and stronger" in a way that is *visible and felt* (numbers tick up; tooltips change;
   effects compound).
2. **Comebacks.** A losing nation must be able to pivot into a *reachable* strength (economy, defense,
   nuclear) rather than being deterministically snowballed. This means tech must cost **budget (gold),
   not position (territory/cities)** — a capped, small nation with a big gold stockpile can still tech.
3. **Strategic choices / trade-offs.** Gold is finite and tech is directional; you cannot buy every
   branch. Investing in X *is* not investing in Y. This is the core of "choosing a doctrine."
4. **Asymmetry.** Different nations/players make different picks and therefore play differently — even
   on identical start seeds, two players with different trees fight differently (mirrors the real
   unevenness of §2.5).
5. **No pay-to-win, no cross-game persistence burden.** Everything is earned *in-match* with in-match
   gold. There is no real-money or account-level advantage, and no cross-game carryover (see §4).
6. **Power-dampened.** The tree must not turn a mid-game leader into an unbeatable wall. Total
   achievable multiplier should be bounded (a "cap" on total points or a soft-cost curve), so the gap
   between "no tech" and "max tech" is meaningful but not 10x.
7. **Deterministic & testable.** All tech effects are numeric multipliers in engine Config / a pure
   state object, so replays stay bit-identical and the whole tree is unit-testable (repo rule).

## 3.2 Guardrails (hard constraints from the project)

These come from the repo rules, `08-game-dynamics-notes.md`, and the realism-series discipline:

- **Gated behind `isRealisticWorld`.** Classic mode is untouched. The gate is `EngineConfig.isRealisticWorld()`
  and `RealisticWorld.ts` (the existing flags). *(Non-negotiable.)*
- **Deterministic, bit-identical simulation.** Tech is *state* (which nodes a player owns) and all
  effects are *pure functions of that state*, computed identically on every client. No wall-clock,
  no RNG beyond the existing `PseudoRandom`. *(Non-negotiable.)*
- **Covered by engine tests.** Every multiplier and gating rule gets unit tests.
- **"One option among many."** The realism mode (and within it the tech tree) must remain an *option*,
  toggle-able, never forced on classic play. The tree should also be *optional within realism* — a
  lobby flag ("tech tree: on/off") so even realism purists can play without it.
- **No snowballing past fun.** Explicit hard caps on cumulative multipliers (below).
- **Numbers are starting points, not gospel.** Every value is a *suggested* tuning seed for playtests
  (same caveat as every file in this folder).

---

# 4. Per-game tech tree vs. long-term account levelling (recommendation)

## 4.1 The two distinct things

The task explicitly distinguishes them:

- **Per-game tech tree ("research as you play")** — during a single match you spend gold to unlock
  nodes that affect *that match*. Resets when the match ends. This is the classic RTS tech tree
  (StarCraft/Age of Empires style: build order + research mid-match).
- **Long-term account levelling ("XP / war-time experience across games")** — an account accumulates
  points across many matches and unlocks *persistent* upgrades or cosmetics that carry between games
  (CoD prestige, LOL runes, MMO talent trees).

## 4.2 The user's stated constraint + the project philosophy

The user said earlier: **"reputation should be per game only, nothing long term"** — i.e., the project
has already committed to *no cross-game persistence* for a social/normative system (reputation/traitor
status, `10` §8.5/e). The philosophy repeats across `08` and `10`: keep changes gated, deterministic,
"one option among many," and don't burden the player with meta-systems.

**Account levelling directly contradicts that philosophy.** It would:
- Add a **meta-game treadmill** (grind for power) — exactly the "pay-to-win / no-lifer advantage" the
  project avoids, and a persistent unfairness across matches.
- Create **cross-game balance drift** (my level-50 account vs. your level-1 account is not a fair
  game), which undermines the clean per-match deterministic model.
- **Undermine the "reputation per-game-only" precedent** — once one system persists, the guardrail
  erodes.

A per-game tech tree, by contrast, **reinforces** the philosophy: everything is earned and spent
*inside* one deterministic, testable match, resets cleanly at the end, and gives every player an equal
edge-to-shirt start each game.

## 4.3 Recommendation

> **Ship a PER-GAME tech tree. Do NOT build long-term account XP/levelling.**

**Justification:**
1. **Philosophy alignment** — no cross-game persistence (matches the user's reputation stance).
2. **Fairness & determinism** — every match is a level playing field; no meta-grind; fully testable.
3. **Gameplay fit** — OpenFront is a *real-time territorial strategy round-based* game (each match is
   a self-contained world conquest on the World map). The escalation arc *within* a match (conventional
   → navy → nukes) is exactly what a per-game tree structures. Account XP adds nothing the match
   already provides.
4. **Cost** — account levelling requires a persistence layer (DB/save of XP, matching of levels,
   anti-cheat, cross-session determinism breaks). Per-game tech is a pure engine state object. Far
   cheaper, far safer.

**Caveat / graceful middle-ground (optional, later):** if the team ever *wants* a long-term hook for
engagement (retention/co-op metagame), make it **cosmetic and prestige-only** (flags, titles, map
skins, a "war record" ledger) — *never* power. But that is out of scope for this design and should not
gate the per-game tree. (Flagged as a deliberate non-goal to keep scope tight.)

---

# 5. Concrete tech/skill tree design for OpenFront

## 5.0 Design skeleton & economy

**Resource:** nodes cost **gold, paid from the nation's gold** (the existing resource, already 5–6
figure in Realistic World starts — `REALISTIC_SEEDS` puts the US at 500k gold, mid powers ~140–320k).
No new resource type (keeps it simple, deterministic, and earns the "spend gold, not position" comeback
property of §3.1). *Optionally later:* a token **"research" income** (a small `goldAdditionRate`
surcharge) — but the simplest v1 is plain gold.

**Structure — the "Choose N of M" build model:**
- **6 branches** (Military-Ground, Navy, Air, Nuclear, Economy, Diplomacy), each with **5 tiers** of
  cost + a top-tier **ultimate** (a doctrine/commitment pick).
- **Point budget (the dampener):** give each nation a **hard cap of total tier-ranks** (e.g., **cap
  total ranks = 25** over a whole match) and make costs **escalate multiplicatively per tier**, so a
  nation *cannot* max every branch — it must **choose**. This is the "choose N of M" variety: with 6
  branches × 5 tiers + 6 ultimates, a capped player picks maybe 2 full branches (10 ranks) + a few
  half-branches, or spreads thin.
- **Tier cost curve (escalating):** suggested `cost(tier) = BASE_TECH * 2^(tier-1)` — tiers get
  exponentially more expensive, so the first few points are cheap (early progression), the top tiers
  are expensive and rare (late-game commitment). Example with `BASE_TECH = 25,000` gold: T1 25k, T2
  50k, T3 100k, T4 200k, T5 400k. (Scale to lobby gold settings; tune in playtests. Classic mode
  unaffected — gated.)
- **Ultimate (doctrine fork):** at the top of a branch, the player picks **one of two mutually
  exclusive doctrine ultimates** (and can't take both) — this is the *strategic identity* moment and
  creates clean asymmetry (mirrors §2.5 doctrine).
- **Prereqs:** tiers are purchases *in order* within a branch (must buy T1 to buy T2), so tech is
  directional and can't bottom-fish the powerful T5 first. Cross-branch prereqs are *optional* and
  avoided in v1 to keep it simple.

**Power dampening rules (guardrails, must hold):**
- Hard **rank cap** (e.g., 25 total ranks) means no full blanket.
- **No effect may exceed ~1.5–2.0×** on any single system (a nation with everything relevant caps at
  ~2× a baseline nation, not 10×).
- **Economies-of-scale nodes flatten, never invert**, the `pow2` cost curve (you get a discount on
  the later units, but never free).
- **All multipliers multiply in a bounded, deterministic order** (see §6 for the "square" ordering
  problem and how to serialize it).

The engine hook for the whole tree: a **`TechTree` state object per player** (list of owned node ids),
plus **pure virtual functions** consulted by every existing engine path — the multiplier getters
already exist as a pattern (`goldMultiplierFor`, `defensePostDefenseBonus`, `attackLogic` `mag`,
etc.). Each tech node contributes a named delta to one of these; the final multiplier is the
deterministic product/select in a fixed order.

---

## 5.1 BRANCH A — MILITARY / GROUND

Real-world anchors: WW2 tank generations, small-arms/vehicle tech, **veterancy** (§2.2), **doctrine**
(§2.5, §5). Base engine hooks: `attackLogic` `mag` (attacker troop loss), `tileCost` (speed), the
defender's `troops/numTiles` loss ratio, `troopIncreaseRate` (regen), `maxTroops` (cap).

### Tier table (5 tiers)

| Tier | Node name | Intended effect (deterministic delta) | Engine hook | Suggested cost |
|---|---|---|---|---|
| 1 | **Conscript Drill** | +5% troop damage (attack strength) | attacker-loss reduction / damage multiplier | 25,000 |
| 2 | **Modern Small Arms** | +5% troop damage (compounds) | same | 50,000 |
| 3 | **Armored Division (T-34→Abrams)** | +8% troop damage; +5% attack speed (÷tileCost) | damage + `tileCost` | 100,000 |
| 4 | **Combined Arms** | +8% troop damage; **veterancy passive** (+2% per 50 tiles conquered, caps +10%) | damage + a veterancy counter read into damage | 200,000 |
| 5 | **Precision Firepower** | +10% troop damage (final; total ground line ≈ +36–45%) | damage | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off it creates |
|---|---|---|
| **Blitzkrieg (Maneuver)** | +25% attack speed, +15% attacker damage, −15% attacker durability (higher `mag`) | Fast, decisive, fragile — pushes the §2.5 maneuver line; bleeds more per tile |
| **Attrition Doctrine** | +30% defender durability, −25% attacker-loss (you absorb), +10% regen | Slow, survivable — the Verdun/Ukraine line; wins by outlasting, traded for speed and edge-damage |

> Both are pure multipliers into `attackLogic` inputs (`mag`, `tileCost`, `attackTroopLoss`) exactly as
> `09` §7.1 proposes to parameterize fronts. This is the cheapest high-value depth in the whole tree
> because it reuses the existing loss/speed math.

---

## 5.2 BRANCH B — NAVY

Real-world anchors: blue-water power projection, carrier generations, fleet survivability —
US 11 supercarriers vs. smaller fleets [02 §2, §4]; port efficiency and trade ([04]; current
`Port`/`TradeShip` and `Warship`). Engine hooks: `Warship` strength/range, `Port` spawn/income
(`tradeShipGold`, `goldMultiplierFor`), fleet capacity.

| Tier | Node name | Intended effect | Engine hook | Cost |
|---|---|---|---|---|
| 1 | **Shipwright Guilds** | +10% warship damage | warship damage multiplier | 25,000 |
| 2 | **Modern Frigates** | +10% warship damage; +10% warship range | damage + range | 50,000 |
| 3 | **Maritime Interdiction** | **Blockade:** enemy ports in-range of your warships yield −15% trade gold | per-port income penalty when intercepted | 100,000 |
| 4 | **Fleet Capacity / Dreadnoughts** | +15% warship damage; +25% port trade gold | damage + `tradeShipGold`/`goldMultiplierFor` | 200,000 |
| 5 | **Carrier Battle Group** | +15% warship damage; +15% amphibious (`TransportShip` invasion) strength | damage + boat-invasion strength | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off |
|---|---|---|
| **Sea Denial** | +25% warship damage, near-going concealment (enemy can't see your fleet until engaged), blockade is +50% effective | Focuses on killing enemy sea trade/projection; weaker at landing invasions |
| **Power Projection** | +40% amphibious/TransportShip strength & beachhead speed; +20% port income | Focuses on taking distant land; its fleet is a support arm, not a killer |

---

## 5.3 BRANCH C — AIR (the design decision)

**Ground-truth:** the game currently has **no air units** except nukes (atom/hydro/MIRV) and
anti-air (`SAMLauncher`, `SAMMissile`). There is no fighter/bomber object. The task explicitly asks:
*propose whether to add a lightweight air system or steer around it.*

**Recommendation: STEER AROUND a full air system in v1.** Reasons:
- Adding air units (fighters, bombers, interceptors) is a **large, risky feature** (new unit types,
  new combat model, new AI, new UI, new balancing) that would violate the "power-dampened, low-risk,
  deterministic" mandate for a first slice and multiply test surface dramatically.
- **The air niche is already ~covered** thematically by the **existing SAM/nuke axis**: air *defense*
  already exists as `SAMLauncher`, and air *strike* already exists as the nuclear delivery (which
  overflies land by trajectory regardless of ownership — `08` §4 notes "nuclear overflight/trajectory
  already ignores land ownership"). A lightweight AIR branch can therefore be expressed as **modifiers
  on the existing SAM and nuke-delivery systems**, not new units.

### Tier table (5 tiers — all express air power through existing systems)

| Tier | Node name | Intended effect | Engine hook | Cost |
|---|---|---|---|---|
| 1 | **Air Defense Net** | +10% SAM anti-nuke effectiveness (defensive A2/AD) | `SAMLauncher`/`SAMMissile` intercept bonus | 25,000 |
| 2 | **Early-Warning Radar** | +15% SAM pre-emption (nukes intercepted earlier/at higher range) | SAM range/cooldown | 50,000 |
| 3 | **Integrated Air Defense (A2/AD)** | +10% SAM effectiveness; +5% defense-post bonus (flavor) | SAM + `defensePostDefenseBonus` | 100,000 |
| 4 | **Air Supremacy** (still via SAM/enemy-trade disruption) | raiding: enemy trade ships/trains in your air umbrella yield −15% | `tradeShipGold`/`trainGold` penalty when in your umbrella | 200,000 |
| 5 | **Strategic Air Offensive** | +15% nuke delivery success / +10% nuclear death factor (air-dropped munitions) | `nukeDeathFactor`, nuke intercept | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off |
|---|---|---|
| **Shield of the Skies** | +30% SAM intercept rate; +15% defense | Pure defensive/deterrent focus; gives the air-strike edge away |
| **First Strike** | +25% nuke delivery success; nukes launched while you have air supremacy deploy +10% faster | Offensive nuclear posture — better at landing the first bomb, weaker on defense |

> **This keeps v1 honest:** no new air units, but a real, decision-rich "air & air-defense game"
> through SAM + nuclear delivery modifiers. If a *physical* air system is ever wanted, it's a separate
> future doc; this tree's nodes can then remap onto real aircraft instead of SAM proxies.

---

## 5.4 BRANCH D — NUCLEAR

Real-world anchors: delivery range/ICBM generations, **MIRV** proliferation (US/Russia/UK/France MIRVed
SLBMs/ICBMs; India/Pakistan largely single-RV — [02 §3]), silo survivability, ballistic-missile defense
(ABM/SAM), **deterrence posture** [02 §3; FAS; ACA]. Engine hooks: `MissileSilo`, atom/hydro/MIRV,
`nukeSpeed`, `nukeDeathFactor`, `SAMCooldown`, silo/unit costs.

| Tier | Node name | Intended effect | Engine hook | Cost |
|---|---|---|---|---|
| 1 | **Missile Rehearsal** | +10% nuke range | nuke range multiplier | 25,000 |
| 2 | **Solid-Fuel Rocketry** | +10% nuke range; +10% nuke speed | range + `nukeSpeed` | 50,000 |
| 3 | **Silo Hardening** | +20% silo defense (harder to destroy by counterstrike) | silo armor/defense | 100,000 |
| 4 | **MIRV Engineering** | +15% MIRV efficiency (targets stay effective / payload count effective) | MIRV warhead factor | 200,000 |
| 5 | **Thermonuclear Compactness** | +15% nuclear death factor | `nukeDeathFactor` | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off |
|---|---|---|
| **MAD / Second Strike** (deterrence) | +40% nuclear survivability; +20% chance a nuked nation's retaliation fires (deterrence tax on first-strikers) | Purely defensive/counter — signals "striking me is mutually ruinous" |
| **Prompt First Strike** | +30% nuke speed/range; −15% silo armor (you built offense, not hardening) | Fast, aggressive; you are more exposed to counterstrike |

> Grounding: deterrence ("mutually-assured-destruction prevents escalation") is flagged in `08` §5 as a
> real missing mechanic ("the game has nukes but no 'deterrent prevents escalation' mechanic"). The
> MAD ultimate is a minimal, deterministic seed of that concept.

---

## 5.5 BRANCH E — ECONOMY

Real-world anchors: defense-industrial base & economies of scale / learning curve (§2.3), trade &
tariffs (`10`: relation-scaled trade, tariffs), central-bank/reserves, budget → capability (02 §5
"budget should control gold"). Engine hooks: `goldMultiplierFor`, `goldAdditionRate`, `tradeMultiplier(rel)`,
`unitCost`/`pow2` cost curve, `City` population caps, `maxTroops`-adjacent economy.

| Tier | Node name | Intended effect | Engine hook | Cost |
|---|---|---|---|---|
| 1 | **Treasury Reforms** | +10% passive gold income | `goldAdditionRate` | 25,000 |
| 2 | **Trade Liberalization** | +15% trade gold; −10% tariff penalty on neutral/rival trade | `tradeShipGold`/`trainGold` + `tradeMultiplier` | 50,000 |
| 3 | **Industrial Base** | −10% city/factory cost (flatten the `pow2` curve by one step for the N-th unit) | `unitCost`/`costWrapper` | 100,000 |
| 4 | **Economies of Scale** | ×0.85 cost multiplier on later cities/factories (learning curve — each doubling of count is cheaper) | unit cost curve | 200,000 |
| 5 | **National Bank / Gold Reserves** | +15% gold income; +5% cap on gold held (hurts less on gold drain) | `goldAdditionRate` + a soft gold-reserve factor | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off |
|---|---|---|
| **Planned Economy** (state-industry) | +30% factory/train gold and +15% industrial-cost reduction; −10% trade gold (inward) | Self-reliant industrial juggernaut; weaker at foreign trade |
| **Market / Mercantile Ledger** | +30% trade gold & tariffs eased; +15% passive gold; −10% industrial-cost reduction | Trade-first, deeper-global; weaker at domestic industry |

> These map directly onto the already-named 08 questions (`goldAdditionRate` as throughput, economies
> of scale) and 10's trade/tariff work. The cost-curve flattening is the pure deterministic expression
> of §2.3's learning curve against the existing `pow2` curve.

---

## 5.6 BRANCH F — DIPLOMACY

Real-world anchors: alliance reliability/reputation, sanctions efficacy ([10]: boycott/sanction tables,
reputation/traitor), international leverage [10 §2, §3, §8]. Engine hooks: `Relation` tiers, alliance
stability, embargo/sanction effect, traitor debuff (`traitorDefenseDebuff`/`traitorSpeedDebuff`),
reputation bonuses.

> **Guardrail against philosophy conflict:** the user wants **reputation per-game only**. This branch
> therefore operates **strictly within a match** — there is *no* cross-game reputation here. A
> "reliability bonus" means in-match diplomatic reputation, which resets each game.

| Tier | Node name | Intended effect | Engine hook | Cost |
|---|---|---|---|---|
| 1 | **Diplomatic Corps** | +1 relation toward all (faster path to Neutral→Friendly). Nations you're Friendly with send better trade. | relation-seeding / trade | 25,000 |
| 2 | **Trade Treaties** | +10% ally trade gold (alliance bonus in `tradeMultiplier`) | `tradeMultiplier(rel)` | 50,000 |
| 3 | **Sanction Authority** | embargoes/boycotts you impose are +30% more damaging to the target (trade loss & relation malus) | embargo effect | 100,000 |
| 4 | **Alliance Stability** | alliances you hold are harder to break (both for you and for a would-be traitor — higher betrayal cost) | alliance-break debuff | 200,000 |
| 5 | **International Standing** | −25% traitor debuff (if you must betray, it costs you less); +10% ally reliability | traitor debuffs | 400,000 |

### Doctrine ultimate (pick ONE)

| Ultimate | Effect | Trade-off |
|---|---|---|
| **Hegemon's Coercion** | sanctions +50% effective; relation pressure stronger; steeper traitor penalty on *others* who betray you | Coercive, sticks-heavy; weakens your own soft-trade bonus |
| **Trusted Ally** | +25% alliance trade, +25% reliability, −50% traitor debuff; sanctions −30% effective on you | Soft-power, carrot-heavy; you trade-soft and are harder to sanction but less coercive |

---

## 5.7 Assembled cost table & budget math (worked example)

Suggested global constants (tune in playtests):
- `CAP_TOTAL_RANKS = 25` (total tier-ranks a nation can own in a match). This is the primary dampener:
  it forces "choose N of M."
- `BASE_TECH = 25,000` gold; `tierCost(t) = BASE_TECH * 2^(t-1)` → T1 25k, T2 50k, T3 100k, T4 200k, T5 400k. Each ultimate costs ~500k.

**Budget example — a mid-power nation (say 200k starting gold) with a booming economy:**
- A **balanced "army + economy" build**: Army T1–T3 (25+50+100=175k) + Economy T1–T2 (25+50=75k) =
  250k across the early-mid game; then a cost-curve discount (Economy T3, −10%) makes the next buys
  cheaper. Ranks spent = 5. Leaves 20 ranks of runway for navy/nuclear/late techs.
- A **"race to the bomb" build**: spend everything on Nuclear T1–T4 (25+50+100+200=375k) + a bit of
  Defense — you get there fast but have *no* economy or navy tech, so you're gold-starved and
  sea-vulnerable. That *is* the trade-off you want.
- A **scattershot** player spreads 2 ranks in each of 6 branches (12 ranks, ~= 25+50 ×6 = 450k) and is
  "jack of all trades, master of none" — deliberately weak at every top tier. Good for testing the
  budget pressure.

The **rank cap + escalating costs together** guarantee the anti-snowball property: nobody can get close
to "max everything," so no single leader becomes untouchable through tech, and a rich but cornered
nation can still *spend* its gold on a reachable comeback branch (Economy regen → re-arm, or Nuclear).

---

# 6. Balance & implementation notes

## 6.1 Determinism — how to keep it bit-identical

The tree must be **pure state + pure functions**, exactly like the rest of the realism series:

- **State:** a per-player `Set<techNodeId>` (or a `Record<nodeId, tier>`), serialized in the game
  state like any other player field. It enters the sim deterministically.
- **Effects:** a single **`techMultipliers(state)` pure function** (mirroring how `goldMultiplierFor`,
  `defensePostDefenseBonus`, `tradeMultiplier` are already pure methods on `EngineConfig`). Every
  existing engine path that should be affected calls the relevant multiplier: attack damage/speed,
  nuke range/speed/death-factor, trade/income, unit costs, regen, SAM intercept, relation/embargo —
  each is a **named numeric delta** multiplied in a **fixed, documented order**.
- **Fixed ordering / "the squaring problem."** Because many nodes touch the *same* hook (e.g., Army T1
  + T2 + T3 + T5 all touch damage), you must decide whether they **add** (0.05+0.05+0.08+0.10) or
  **multiply** (1.05×1.05×1.08×1.10). Any order-dependent multiplicative chain must be fixed
  (e.g., always multiply tier-order) so all clients compute identically. **Recommendation:** *sum*
  same-hook bonuses within a branch (simple, transparent, bounded — the total ground line ≈ +38%, not
  compounding to an unbounded value), and *multiply* across *different* hooks. Document the convention
  in the code comment so all four clients agree.
- **No wall-clock, no RNG.** Tech grants no timing randomness; effects are pure talent-state → scalar.
  Replays stay bit-identical because nothing reads `Date.now()` or a per-client process clock.

## 6.2 Gating behind the realism option

- Wrap the whole tree behind **`EngineConfig.isRealisticWorld()`** (and optionally a nested
  `techTree: boolean` lobby flag inside Realistic World) — matching the established pattern used by
  `tradeMultiplier` (returns 1 in classic) and `isRealisticWorld()`-gated terrain rules [09 §9; 08].
- In classic mode, every `techMultipliers()` call returns **identity** (no multipliers), so classic
  balance is untouched by construction, and the tree UI simply doesn't render.
- The seed/`REALISTIC_SEEDS` and the tree are independent: the tree is *earned in-match*, so it layers
  cleanly on top of the starting-strength seed without double-counting (a strong-seed nation is strong
  *and* can still pick — but it pays the same escalating gold costs, so it can't bank a free tech lead).

## 6.3 Anti-snowball & economy-of-fun rules (must hold)

1. **Rank cap 25** — hard ceiling on total picks.
2. **Escalating costs** — top tiers are prohibitively expensive for a struggling economy.
3. **Same-hook bonuses SUM** — no compounding blow-up; soft ceiling ≈ 1.5–2.0× per system.
4. **Tech costs gold, not territory** — a cornered nation can still pivot (comeback property, §3.1).
5. **Doctrines are mutually exclusive** picks — clean identity, no "take both" optimization.
6. **Everything optional** — a lobby can disable the tree even within realism.

## 6.4 Early design decisions to make up front

1. **Resource** — plain gold (recommended) vs. a new "research points" resource. Pick gold for v1.
2. **Sum vs. multiply** convention per hook (above) — decide early, document, test.
3. **Which hooks are tech-gated at all.** Start *minimal*: only attack damage/speed/loss, nuke
   range/speed/death, SAM intercept, trade/income, unit-cost curve, regen, relation/embargo. Adding
   more hooks later (e.g., into `trainGold`) is easy once the multiplier contract exists.
4. **AI/bot behavior** — do bots pick techs? Recommendation: yes, a simple deterministic heuristic
   (bots take the highest-priority branch for their situation: rich-bot → Economy, besieged-bot →
   Defense/Attrition, nuke-race-bot → Nuclear). Deterministic and testable; avoids "AI never techs."
5. **UI** — a per-nation side panel showing owned tiers + tooltip deltas + rank budget. Read-only for
   other players (you can see what each nation has invested = scouting value, itself a strategic layer).
6. **Whether techs are spent/refundable.** Recommendation: **permanent once bought** within the match
   (no refunds) — that's what makes them directional commitments. (A "sell structure" reset is a later
   option, not v1.)

## 6.5 Prioritized build order (value-per-effort)

| # | Slice | What it delivers | Effort | Why first |
|---|---|---|---|---|
| 1 | **The `TechTree` state + `techMultipliers()` contract only (no nodes yet)** | The deterministic skeleton: per-player state, fixed-order multiplier harness, `isRealisticWorld` + lobby gate, identity in classic | Small | Everything hangs off this; proves determinism *before* any balance work |
| 2 | **Military-Ground branch (5 tiers + doctrine), wired into `attackLogic`** | The highest-value, cheapest depth: both ultimates reuse `mag`/`tileCost`/loss math from `09` §7.1 | Small–medium | Best gameplay-per-effort; reuses existing loss/speed inputs; no new systems |
| 3 | **Economy branch (tiers + doctrine), wired into `goldMultiplierFor`/`goldAdditionRate`/`unitCost`** | The comeback + strategy lever; powers every other branch via budget | Small–medium | Creates the trade-offs that make the rest meaningful (budget pressure) |
| 4 | **Nuclear + Navy branches (SAM/nuke + warship/port hooks)** | Mid-to-late escalation & sea game | Medium | Enriches the endgame; reuses existing nuke/SAM/warship/port systems |
| 5 | **Air branch (SAM/nuke proxies) + Diplomacy branch** | Full 6-branch tree | Medium | Completes coverage; air is cheap because it proxies existing systems |
| 6 | **Bot tech heuristics + UI panel + scouting display** | Playability & depth | Medium | Makes the tree matter vs. AI and in MP scouting |
| 7 | *(Later, optional)* **Physical air system; tech refunds; cosmetic non-persistent prestige** | Expansion & retention | Large | Out of scope for v1; only after the tree is proven |

> **Recommended v1 cut:** items 1–3 (skeleton + Military + Economy). That single cut already delivers
> meaningful progression, comeback economy, strategic trade-offs, and doctrine asymmetry — the core of
> what the user asked for — at the minimum risk, fully deterministic and gated. Navy/Nuclear/Air/Diplo
> are clean, independent additions afterward.

---

# 7. Sources

**Military capability & technology:**
- IISS, *The Military Balance* (2024–26) — personnel, equipment, doctrine-relevant force structure [via 02].
- SIPRI Military Expenditure Database & *SIPRI Yearbook* (2024–26) — defense budgets, arms industry/transfers [via 02, 04, 10].
- FAS *Status of World Nuclear Forces* / *Nuclear Notebook* & Arms Control Association — nuclear warheads, delivery, MIRV (the entire NUCLEAR branch grounding) [02 §3].
- CRS (Congressional Research Service) DoD budget overviews — R&D/ROT&E share of US budget (§2.1).
- *History of technology*: radar — Battle of Britain Chain Home; tank generations (T-34/Panther); Precision-Guided Munitions (Vietnam→Gulf 1991) — the "generation overturns everything" examples [standard tech-history literature; §2.1].
- Military-effectiveness / veterancy literature; Ukraine-war reporting (CEPA, RUSI, CSIS) for "war-hardened" experience [09 §3.2; §2.2].
- Learning-curve / defense-procurement economics for economies of scale [§2.3; aerospace/shipbuilding experience curve].

**Doctrine / war dynamics (from 09):**
- Clausewitz, *On War* (center of gravity / Schwerpunkt); German `Truppenführung` doctrine; Soviet deep battle (Triandafillov, Tukhachevsky); modern ATP 5-0/FM 5-0, MCPP — "main effort vs. supporting effort," defense-in-depth [09 §1–§5].
- *Military Strategy Magazine / DTIC* on attrition vs. maneuver, and the will-to-fight/morale component [09 §3, §6].

**In-repo realism series (grounding, all args mapped to):**
- `02-military-capacity.md` — MPI, starting-strength formulas, Ukraine "war-hardened" flag, nuclear states/MIRV.
- `09-war-dynamics.md` — concentration of force, attrition, `attackLogic` inputs (`mag`/`tileCost`/loss) that the MILITARY/NAVY branches reuse.
- `10-economics-and-diplomacy.md` — relation-scaled trade, sanctions, alliances/reputation (per-game), the `tradeMultiplier(rel)` hook for the DIPLOMACY/ECONOMY branches.
- `08-game-dynamics-notes.md` — open questions (gold-throughput = `goldAdditionRate`, manpower → regen, deterrence) that §5 turns into closed design answers.
- `04-cities-and-industry.md` — defense-industrial hubs, factory/city economies-of-scale targets.

**Data vintage & caveat:** Every number in §5 is a *proposed starting point for playtests*, exactly as
the folder README and each sibling file warn. Balance the values against real lobbies; do not ship them
as gospel.

**Licensing note:** the tree references only *derived* insights from IISS/SIPRI/FAS/ACA (already
sanitized in `02`/`07`); no IISS tables are reproduced here. Cite "SIPRI, FAS/Bulletin, ACA" in the game's
About screen per `02` §6.2.
