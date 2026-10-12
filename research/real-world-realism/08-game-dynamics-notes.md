# Game Dynamics — Economic & Diplomatic Realism (design notes)

> Status: **design notes / open-questions**. These are the dynamics to research and
> implement after the terrain pass (see README roadmap). Each item names what the
> engine does *today* so a later pass knows the current baseline. Deeper research and
> a full design doc are scheduled after the starting-structures and terrain work.

## 0. What a nation starts with (money, people, resources)

**Asked:** how much money / people a country starts with, scaled to reality.

**Current engine:** nations get starting troops via `EngineConfig.startManpower(playerInfo)` and
gold via `startingGoldFor(playerInfo)`. In Realistic World mode these are already scaled to real
military power and budget (see `packages/engine/src/realism/RealisticWorld.ts` — `REALISTIC_SEEDS`).
Max troops are territory-based (`Config.maxTroops`), so a head-start decays toward the (shared) cap.

**Open questions / ideas:**
- Should "money" also drive *income rate* (`goldAdditionRate`) per nation, not just the starting
  lump sum? Real economies differ in throughput, not just stockpile.
- Should "people" (manpower pool) affect troop *regeneration rate* over time (`troopIncreaseRate`),
  so a populous nation replenishes faster? Today regen is difficulty-based and equal.
- Population-based scaling (from `04-cities-and-industry.md` city data) could size a nation's economy
  by its real population/industrial base.
- Tradeoff to preserve: don't let the US/China/russia become unfun unbeatable walls — dampen with the
  log/power curves already in the realism module.

## 1. Who do nations trade with? (alliance-only vs everyone)

**Asked:** do they only trade with their alliance, or with everyone?

**Current engine:** trade is via `TradeShip` (ports → gold) and `Train`/rail (factories → gold).
Both are gated by embargos and relations:
- Trade ships only trade with ports owned by *other players* (`NationStructureBehavior.randCoastalTileArray`
  checks shared water).
- `Player.canTrade(neighbor)` blocks trading with embargoed players and (on Hard/Impossible) with
  non-teammates in team games (`NationExecution.handleEmbargoesToHostileNations`).
- Nations auto-embargo hostile players (`relation <= Hostile`).

**Open questions / ideas:**
- Real world: countries trade broadly (even with rivals — e.g. energy, food) unless sanctioned. Consider:
  - Trade value/tariff gated by **relation tier** (allies trade at full/discounted rate, neutrals at a
    "tariff"ed rate, hostiles embargoed unless a "humanitarian/energy exemption").
  - Trade **volume/intensity** should reward alliance alignment (ally deals yield more).
  - Allow *sanction-sensitive* goods (energy/arms) to be embargoable, broadly hurting both sides.

## 2. Does attacking break an alliance? What about boycotts?

**Asked:** do alliances break when nations attack each other? How do economic boycotts change alliances?

**Current engine:**
- Attacking a **current ally is blocked** (`AttackExecution.init` checks `isFriendly` and cancels).
- You must first break the alliance (which marks the breaker a **traitor** for a debuff — a soft "betrayal
  cost"), then you can attack.
- **Embargos** are one-directional (player A embargoes B; A stops trading with B). `NationExecution`
  adds a relation malus (`-20`) when a nation is embargoed, and reverts it when the embargo lifts —
  so a boycott *does* move relations, but weakly and only via the -20 mechanic.
- Alliance *requests* are rejected when relation < Neutral; nations only ally with `Friendly` nations.

**Open questions / ideas:**
- Real life: a formal mutual-defense pact attacked = the alliance is broken + international standing
  loss. Consider:
  - A **reputation/traitor system that persists between games** (aggression and broken pacts follow you).
  - **Boycotts should weigh heavier** — an embargo toward a friend should strain (or break) the alliance,
    requiring a "why" (e.g. human-rights sanction) vs. a hostile act.
  - **Economic harm of a boycott** — a sanctioned nation should lose trade income and maybe production,
    not just a small relation number; a target vs. coalition-of-the-willing framing (like real sanctions).

## 3. Can allied nations attack together / coordinate?

**Asked:** can they attack together?

**Current engine:** nations and players already coordinate *informally* — `AttackExecution` combines
outgoing attacks on the same target into one stack ("the bigger assault is built by clicking repeatedly"),
and allied nations `NationNukeBehavior`/assist logic target shared adversaries. Alliance requests let
nations jointly pick fights. There is **no explicit "coordinate attack with ally" pact** that guarantees
synchronized overwhelming force.

**Open questions / ideas:**
- A **joint-strike/coalition mechanic**: an ally can accept a "join my attack on X" and their forces
  reinforce, in exchange for a share of conquest gold/tiles. Real world: combined operations.

## 4. Troop passage rights through allied territory

**Asked:** can we pass troops through a country (maybe on special request)?

**Current engine:** **No.** Terrain ownership is exclusive; an ally's land is not traversable
as a passage — your units/attacks cannot route through a non-attacking ally's territory to reach a
far enemy. This is a real, notable gap (real world: basing/transit agreements, overflight rights,
"right of passage").

**Open questions / ideas:**
- **Right-of-passage (`passage`)**: a diplomic grant letting an ally move/attack *through* your territory
  without conquering it. Could be:
  - Granted on alliance (auto) or as a separate "request passage" diplomatic action (your phrasing).
  - Reciprocal or one-way; revocable; a cost (influence/reputation) to grant.
- Interaction with ownership: passage must let *attacks* cross ally land targeting beyond, without
  stealing ally tiles at the border.
- Nuclear overflight/trajectory already ignores land ownership (trajectory passes over anyway) — so
  the gap is mainly conventional ground/boat movement and land attacks.

## 5. What else in real life isn't considered yet? (a checklist for the later research)

- **Strategic resources & economic interdependency** — real countries fight over energy, minerals,
  chokepoints (Strait of Hormuz, Malacca, Suez). Do resources/bottlenecks make some targets uniquely
  valuable (e.g. cutting an enemy's oil via controlling a strait)? The game has no resource terrain.
- **Sanctions regimes & coalitions** — coordinated blockades by a bloc, with enforcement costs.
- **Debt / aid / subsidy** — allies give money to keep a partner afloat (the game *has* donate-gold/troops).
- **Proxy conflict** — nations funding/arming a third party's faction instead of direct war.
- **Non-state actors / insurgencies** — the game has bots as "tribes"; real proxy wars use them.
- **Refugees / population displacement** — territory changes population/economy.
- **War exhaustion / attrition thresholds** — long wars get costlier (the game has doomsday/overtime
  anti-stall, but not "exhaustion").
- **Nuclear proliferation / deterrence posture** — the game has nukes but no "deterrent prevents
  escalation" mechanic (mutually-assured-destruction behavior).
- **International law / legitimacy** — unprovoked aggression could carry a global opinion penalty that
  shifts neutrals.
- **Refueling / basing rights** — forward bases in an ally (ties to §4 passage).

---

### Suggested later research scope (after terrain)
Deep-dive the top-value items with real-world grounding (research/real-world-realism style):
1. Trade & sanctions model (blocs, tariffs, enforcement) — bent around `05` data (trade chokepoints).
2. Alliance-breaking + reputation + betrayal history.
3. Right-of-passage / basing mechanics.
4. Strategic resources (energy/minerals) and why controlling chokepoints matters.

Keep all changes **gated behind `isRealisticWorld`** ("one option among many"), deterministic, and
covered by engine tests per the repo's rules.
