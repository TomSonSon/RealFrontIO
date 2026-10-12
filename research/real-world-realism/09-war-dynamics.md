# 09 — War Dynamics: Concentration of Force, Fronts, Attrition, Logistics, and Theater-Focused Attacks

> **Status:** Research + concrete design proposals. This is the reference the engine
> implementation reads. **Research only — no game code.** Every doctrinal claim is
> inline-cited; every design proposal says how hard it is to build against the *current*
> engine attack model (verified against `packages/engine/src/execution/AttackExecution.ts`
> and `packages/engine/src/configuration/EngineConfig.ts`).
>
> This is the *heart* paper: everything in real warfare about *where* you apply force.
> OpenFront today attacks **everywhere at once**. Real militaries do the opposite — they
> concentrate on a chosen point and economize elsewhere. That single gap is the highest
> value realism change in this game, and this document is written to land it.

---

## Contents

- [0. The engine attack model, as it exists today (grounding)](#0-the-engine-attack-model-as-it-exists-today-grounding)
- [1. Concentration of force (the heart)](#1-concentration-of-force-the-heart)
- [2. Fronts, axes & operational framework](#2-fronts-axes--operational-framework)
- [3. Attrition & exhaustion](#3-attrition--exhaustion)
- [4. Logistics & sustainment](#4-logistics--sustainment)
- [5. Strategic depth & defense in depth](#5-strategic-depth--defense-in-depth)
- [6. Surprise, disruption & morale](#6-surprise-disruption--morale)
- [7. Game implications — concrete, prioritized design proposals](#7-game-implications--concrete-prioritized-design-proposals)
- [8. Other real war dynamics not yet in the game (checklist)](#8-other-real-war-dynamics-not-yet-in-the-game-checklist)
- [9. Implementation principles & gating](#9-implementation-principles--gating)
- [Sources](#sources)

---

## 0. The engine attack model, as it exists today (grounding)

Before proposing anything, the exact current behavior (verified against the source):

- **An attack is a single, global troop pool.** When a player starts an attack, the engine
  takes `startTroops = attackAmount(attacker, defender)` (a human commits **1/5 of their
  total army**; a bot 1/20) and deducts it once from the owner's world-wide troop count
  (`EngineConfig.attackAmount`). Multiple outgoing attacks against the *same target* are
  merged into one stack (`AttackExecution.init`), so you can build a big assault by
  clicking repeatedly — but it is still **one pool for the whole frontier** against that
  target.
- **The attack pushes the entire border at once.** There is no target region on land. With
  no boat `sourceTile`, `init` calls `refreshToConquer()`, which enumerates the **attacker's
  entire border** (`_owner.borderTiles()`) and enqueues *every* bordering enemy tile into a
  single priority heap (`toConquer`). The attack advances across the whole frontier, not any
  chosen part of it.
- **There is a single per-tick conquest budget.** `tick(){ tickBudget = 1; ... }` and the
  loop keeps dequeueing the highest-priority border tile and conquering it until the tile
  fractions **sum to 1**. `attackLogic()` returns `tickFraction = (speedCost * tileCost *
  ...) / borderSize`, so bigger borders spread the same budget over more tiles — i.e. **as
  you get bigger, each tile gets a smaller share of the same per-tick push.** You can never
  choose to spend "your whole budget this tick on this one region."
- **Terrain already modulates per-tile cost and blood.** `terrainAttackBase` sets `mag`
  (bloodiness → attacker loss) and `tileCost` (speed) by terrain; in Realistic World mode
  mountains cost `mag 170 / tileCost 42` vs Plains `mag 75 / tileCost 14`, and
  `AttackExecution.addNeighbors` deprioritises mountains so armies route around them.
- **The cleanest existing "focused" primitive is the boat invasion.** When `sourceTile !==
  null` (TransportShip), `init` calls `addNeighbors(sourceTile)` only — the attack iterates
  **only the beachhead's neighbors**. This is the only region-targeted attack in the game
  today, and it is the natural template for "region-focused ground attacks."
- **Attacker loss is a *global* ratio.** `attackerTroopLoss = mag * within(defender.troops /
  attackTroops, 0.6, 2) * (...)` — there is **no local front density**, no local force at a
  point, no reinforcement to a front, no encircled-pocket, no supply line. "How outnumbered
  the whole attack is" scales the loss, and the defender's loss is just its average
  `troops/numTiles` per tile conquered.
- **No fronts/axes, no troop movement between regions, no logistics, no morale, no
  encirclement, no surprise, no diversion.**

**The single most important consequence:** because the attack is one pool fighting the whole
border with one budget, the engine *cannot express* the single most universal rule of
warfare — **concentrate where it counts, economize elsewhere.** Everything in §1–§6 is the
real-world "why," and §7 is the "how to build it."

---

## 1. Concentration of force (the heart)

### 1.1 The Clausewitzian core: concentration and the center of gravity

The deepest single idea in western military theory, from Carl von Clausewitz's *Vom Kriege*
(*On War*, 1832), is that **war is won by applying superior force at the decisive point, not
by applying equal force everywhere.** Clausewitz wrote that "the best strategy is in general
to be very strong, first generally and then at the decisive point… there is no higher and
simpler law of strategy than that of keeping one's forces concentrated" and that "no one
starts a war—or rather, no one in his senses ought to do so—without first being clear in his
mind what he intends to achieve by that war and how he intends to conduct it" [Clausewitz].
He needs "the concentration of an overwhelming force" against an enemy's **center of gravity
(Schwerpunkt)** — "the hub of all power and movement, on which everything depends" — because
"the defeat of the enemy consists in overcoming the resistance concentrated in his center of
gravity" [Clausewitz][Echevarria]. *Schwerpunkt* literally means "point of main effort" or
"weight of effort," and appears over fifty times in *On War* [Echevarria, "Clausewitz's
Center of Gravity"].

Doctrine has fought over exact terms, but the operational translation is stable and is what
we need for a game: **identify where the enemy's cohesion (or land) is concentrated, aim an
overwhelming local mass at that point, and pinch everywhere else.** As one Australian defence
analysis puts it, understanding that "Main Effort ≈ Center of Gravity" ties the modern
concept straight back to Clausewitz, and modern joint doctrine still treats identifying the
enemy center of gravity as "the essence of operational art" and key to "all operational
design" [Future Forge][Military Strategy Magazine].

### 1.2 German interwar doctrine: Schwerpunkt, Auftragstaktik, Kesselschlacht

German doctrine between the wars — the intellectual ancestor of "blitzkrieg" and of most
modern maneuver thinking — made **Schwerpunktbildung** (forming the point of main effort) the
master principle of command. In the *Truppenführung* (the 1933–34 field manual written by
Hans von Seeckt's reforms and refined by Ludwig Beck), every level of command was required to
designate a point of main effort and to **support it even at the cost of risk elsewhere**:

> "Every unit from the company to the supreme command must decide, from tactics to strategy,
> its point of main effort (Schwerpunkt). The German army was trained to support the
> Schwerpunkt even when risks had to be taken elsewhere, to achieve superiority at the
> Schwerpunkt whether attacking or defending, to turn local success there into victory."
> [Blitzkrieg, Wikipedia; Schwerpunktprinzip]

Clausewitz had already insisted "a center of gravity is always found where the mass is
concentrated most densely; it presents the most effective target for a blow" [Echevarria].
The German addition was **Auftragstaktik** (mission-type tactics): subordinate commanders were
given a mission and a designated *Schwerpunkt* and trusted to allocate their own forces to
serve it, which is precisely the "main effort / supporting effort" idea modern doctrine
formalizes. The *Kesselschlacht* (cauldron battle) — the wedge-then-pocket
(Keil und Kessel) — operationalized it: a narrow armored concentration breaks the line and
the mobile forces wheel to encircle the cut-off enemy before the surrounding infantry
"liquidates the pocket" [Wray, *Cassino* / CSI "Armored Pockets"; Stalingrad sources].

### 1.3 Soviet operational art / deep battle: the "main axis of attack"

Where the Germans emphasized a single *Schwerpunkt*, Soviet interwar theorists built a
system — **deep battle (glubokii boi) / deep operation**, chiefly from Vladimir Triandafillov
(*The Nature of the Operations of Modern Armies*, 1929) and Mikhail Tukhachevsky, enshrined
in **PU-36**. Deep battle is *not* "attack everywhere"; it is emphatically **selective**:
strike along a chosen **main axis of advance (glavnyi udar)** with a concentrated "shock
army," suppress the enemy across the *whole* depth of their position, and roll up successive
echelons. The deep operation "was not meant to deliver a victory in a single operation;
instead, multiple operations… would induce a catastrophic failure in the enemy's defensive
system," attacking "throughout the depth of the battlefield" with self-contained,
maneuverable forces [Wikipedia: Deep operation][A History of Operational Art][Global Security
Review]. The word that recurs is **simultaneity against depth on one axis**, not breadth on
every axis. Soviet doctrine also institutionalized the **multiple-echelon breakthrough**: a
ratio of superiority (commonly several-to-one) was massed on the chosen breakthrough sector,
not spread along the front [Deep operation; Reddit/WarCollege synopsis].

### 1.4 NATO / US doctrine: main effort, supporting effort, economy of force

Modern U.S. and NATO doctrine formalizes concentration as **"main effort" (ME) vs
"supporting effort" (SE) vs reserve**, embedded in the operational framework of every
planning process — the Military Decision-Making Process (MDMP, ATP 5-0 / FM 5-0) and the
Marine Corps Planning Process (MCPP, MCWP 5-10 / MCDP). ATP 5-0 and FM 5-0 tell planners to
"designate the decisive operation, along with its task and purpose… linked to how it
supports the higher echelon headquarters' concept," and to array forces as "decisive,
shaping, and sustaining" operations, organizing the force as "main effort, supporting
effort, and reserve" [ATP 5-0 / FM 5-0][MCPP / MCWP 5-10]. MCPP explicitly identifies "a
decisive point… that, when acted upon, allows the commander to gain a marked advantage over
the adversary" [Planner's Handbook for Operational Design, JP 5-0]. **Economy of force** is
the reciprocal of mass: "the judicious employment and distribution of forces toward the
primary objective… Economy of force is the reciprocal of mass," deliberately giving
minimum necessary force to secondary tasks [Wikipedia: Economy of force][Principles of War,
Murdock].

So every major doctrinal family — Prussian/German, Soviet, and Western — converges on the
*same operational rule*, which is the single most transferable insight in this paper:

> **Pick a point or a narrow axis; put the bulk of your effort there; give other sectors just
> enough to hold or to fix the enemy; and accept risk on those secondary sectors as the
> price of winning the main one.**

### 1.5 Why it works: local superiority at the point of decision even when globally outnumbered

The strategic payoff is **ratio, not sheer numbers.** Victory at a point is decided by the
ratio of forces *at that point*, not the global balance. A defender or attacker can be
outnumbered overall yet **win by creating a local superiority where decision is sought** —
concentrating more combat power in fewer miles than the enemy can bring to bear there
quickly. This is the entire logic of Napoleon's *corps* system on interior lines (see §2.2),
of German 1940 (below), and of Soviet breakthrough operations.

There is also a ruthless **casualty-rate logic** behind it, and this is the part a deterministic
engine can model directly: *attrition is asymmetric when ratios are asymmetric.* In Lanchester-style
dynamics the stronger side at the point of contact loses *less* per unit of result, both because
attacker loss scales with how outnumbered the attack is (the engine already does this via
`within(defender.troops/attackTroops, 0.6, 2)`) and because the concentrated side overruns
faster, spending less time under fire. Verdun (below) is the negative-image proof: when
Falkenhayn *could not* mass because the French fed reserves into the fight, he still chose to
concentrate firepower on a narrow ~15-km front specifically to make the *battle of attrition*
lopsided in Germany's favor by forcing the French to defend one bloody spot out of range of
their own best counter-concentration [Eter / Attrition sources]. In intuitive terms for the
game: **10,000 troops fighting a 1,000-strong sector win it and take light losses; the same
10,000 spread across five 1,000-strong sectors win nothing and bleed everywhere.** Spreading is
how you turn a winning army into a losing one.

### 1.6 The tradeoffs (what a player should *feel*)

Concentrating is not free — that tension is the gameplay. The real-world costs:

- **Economy of force elsewhere → exposed secondary sectors.** The forces you "save" from the
  non-main efforts are weaker there; a defender who correctly reads your main effort can
  counterattack the thinned spots. Every major doctrine warns secondary sectors are where
  you are vulnerable [ATP 5-0][Economy of force].
- **Salients and vulnerable flanks.** Pushing a narrow wedge deep into the enemy creates a
  **salient** — a bulge with two exposed flanks that can be pinched off (the exact geometry
  of Kursk, Operation Zitadelle, where the Soviets let the Germans push into a salient the
  Red Army was built to pinch) [Stalingrad/Khit sources][ArmyUP: Kursk referenced in Kharkov
  article]. Concentration that marches too far from its supporting mass invites
  encirclement.
- **Exhaustion and culminating point.** A concentrated offensive cannot be sustained
  forever; supply lines lengthen, troops tire, and there is a "culminating point" past which
  the attack stalls — the moment the defender seizes to counterattack. Clausewitz treated
  the *culminating point of the offensive* as a central concept [Clausewitz; Luttwak on
  culminating points is the modern version]. In game terms: a deep push must spend troops at
  a rising rate the deeper it goes (this maps cleanly onto a supply/logistics mechanic, §4, or
  a "momentum" cost, §7).
- **Reading / misreading the enemy.** Concentration only pays if the enemy cannot easily
  shift to match it — hence deception and feints (§2.4) and the value of speed (Ukraine 2022
  showed concentrated mechanized columns racing before the defender could redeploy).

### 1.7 Historical anchors (short)

- **Blitzkrieg 1940 (France):** Germany was *and remained locally* outmatched in overall
  numbers and even in tanks vs. the combined Allies, but massed its armor at the weak
  Ardennes/Sedan sector ("a narrow front… the Schwerpunkt"), routed the weak French
  divisions there, and drove to the Channel — creating the *Kessel* that collapsed France in
  six weeks [Blitzkrieg, Encyclopedia.USHMM][Britannica: Blitzkrieg].
- **Verdun 1916 (attrition by concentration):** Falkenhayn's "bleed France white" — a
  *concentration* (all artillery, one narrow front) explicitly in service of *attrition*
  rather than breakthrough [Eter / DTIC "American Way of Operational Art"].
- **Gulf War 1991 (oneship masquerade + main effort):** the coalition used deception (an
  amphibious feint so the Iraqis withheld forces facing Kuwait's coast) and swung the real
  mass — VII and XVIII Corps — on the "left hook" through empty desert west of Kuwait to
  envelop 41 Iraqi divisions in ~100 hours [Britannica: Persian Gulf War][Marine Corps
  Gazette: Gulf War][Deception in the Desert].

---

## 2. Fronts, axes & operational framework

### 2.1 Decomposing a theater into fronts and axes

Real wars are not fought as one blob-on-blob clash; commanders decompose a theater into
**operational directions / axes (lines of operations)** and sometimes distinct **fronts**,
each with its own objective, its own forces, and its own command. Examples:

- **World War I / II "Eastern Front" and "Western Front,"** and within a side multiple **army
  groups** each assigned an axis (e.g., German *Heeresgruppen* A, B, and Don in 1942 — whose
  failure to support each other under Directive No. 45 was the root of Stalingrad)
  [Stalingrad sources: Directive No. 45].
- **Soviet use of "fronts"**: the Red Army's army-group level was literally called a
  **Front** (e.g., Southwest Front, Don Front, Stalingrad Front in Operation Uranus — the two
  pincers were *separate fronts* coordinated by STAVKA) [Stalingrad, Warfare History].
- **Lines of operations (LOO)** in modern joint doctrine: "a line of operations defines the
  orientation of the force… an LOO may represent subordinate problem sets of an overarching
  problem," and a theater is arrayed along multiple LOOs / multiple axes of advance
  [AFDP 5-0][Planner's Handbook].

The relevant structural fact for a game: **wars are fought on several distinct axes at once,
and the interesting decisions are (a) which axis is the main effort, (b) how many troops each
axis gets, and (c) how fast you can move forces between axes.** OpenFront has none of this —
no axes exist. This is precisely the "focus front" mechanic §7 proposes.

### 2.2 Interior lines vs exterior lines — a huge real concept

**Interior lines** is the strategy of operating *inside* the enemy's arc or between separated
enemy forces, from a central position, so that your lines of communication and movement are
**shorter and safer** than the enemy's, letting you shuttle the *same* concentrated mass
against each enemy in turn and defeat them sequentially. **Exterior lines** is operating on
the *outside*, converging from several directions on a central enemy, with longer, more
exposed lines of communication [Wikipedia: Interior lines][DTIC ADA184730][Rapin, Rethinking
Lines of Operation, Jomini]. Clausewitz's formulation: interior lines are "the stronger form
with the passive purpose" (defensive), exterior lines "the weaker form with the active
purpose" (offensive) — but if the attacker is clearly superior, exterior (encircling) lines
can deliver the decisive convergent blow [DTIC ADA184730 citing FM 100-5].

This matters enormously as a **game mechanic and as a balance lever**, and it is the direct
theoretical home of two requested secondary features:

1. **Troop relocation between fronts** = using short, safe interior lines: transfer your
   stack from a quiet front to the active one faster/cheaper than the enemy can reinforce
   theirs. Whoever can shift reinforcements on tighter/faster arcs wins the local race (see
   §1.5's "local superiority" logic; Ukraine's and Germany's rail-based interior lines are
   the classic cases).
2. **Concentric/enveloping attacks** (exterior lines) as a distinct, riskier but more
   decisive offensive form — the "Cannae" double-envelopment of Stalingrad (Uranus) is a pure
   exterior-lines play [Warfare History: Uranus as "Cannae-style double encirclement"].

### 2.3 Moving/transferring forces between fronts; the operational reserve

Institutionally the link between fronts is the **operational reserve** and the ability to
**displace (rail/road) formations between axes**. Soviet deep battle explicitly required
holding and committing operational reserves along the depth; German doctrine of `Truppenführung`
required an *operative Reserve*; and modern MCPP always designates a reserve *in addition to*
main and supporting efforts [MCPP][ATP 5-0]. The transfer itself has a real cost in time and
logistics — which is why interior-vs-exterior lines is decisive: **moving the same division
ten miles on your own rail network is not the same as moving it a hundred miles around your
enemy's flank.** Any "reinforce this front" mechanic (§7.6) needs this transit cost to mean
anything.

### 2.4 Diversionary attacks, feints, and deception

Real commanders use **demonstrations, feints, and raids** to *fix* enemy forces on the wrong
axis while the main effort strikes elsewhere — the "supporting effort fixes, main effort
decides" pattern of MCPP [MCPP / MCWP 5-10]. Historical anchors:

- The **Gulf War amphibious feint**: a visible Marine amphibious build-up misled the Iraqis
  into keeping forces facing the coast, while the real mass swung through the western
  desert — "the deception worked well and misled the Iraqis" [MCA Gazette: Gulf War][Deception
  in the Desert].
- **D-Day:** Operation Fortitude convinced the Germans the main landing would be at the
  Pas-de-Calais, holding their panzer reserves away from Normandy [widely documented;
  cited by doctrine as the canonical strategic deception].
- **Kharkov 1943:** Manstein's counterstroke snatched back the strategic initiative by
  deceived, concentrated, converging strikes on an overextended Soviet salient
  [Stalingrad/Kharkov sources].

For the game, a **feint** is cheap to implement *because it is literally what a no-focus
attack already is*: a low-intensity push that forces the enemy to respond (spend troops /
attention / defense budget) on a sector you do not intend to win. §7.4 builds feints on top of
the focus mechanic almost for free.

---

## 3. Attrition & exhaustion

### 3.1 Attrition warfare vs maneuver warfare

**Attrition warfare** seeks to **wear an opponent down** by inflicting continuous losses in
personnel, materiel, and morale until their capacity — or their *will* — collapses [Wikipedia:
Attrition warfare][encyclopedia.1914-1918-online]. **Maneuver warfare** seeks to collapse the
enemy's *system* by out-moving and out-cycling them, striking cohesion, command, and
logistics rather than grinding strength-on-strength [Military Strategy Magazine][DTIC
ADA254194]. Modern scholarship increasingly argues these are not opposite "forms" but tactics
on one spectrum — attrition is the *characterization* of a conflict, maneuver and attrition
combine [War on the Rocks: Setting the Record Straight on Attrition][ArmyUP: On Attrition].
Two distinctions matter for the game's vocabulary:

- **Attrition = wastage of physical forces** (men, equipment); **exhaustion = wastage of
  *will*** (the opponent gives up or a nation runs out of the *stomach* to continue)
  [Military Strategy Magazine]. Attrition feeds exhaustion.
- A clean one-liner attributed to Churchill captures the strategic end-state: "The war will
  be ended by the exhaustion of nations rather than the victories of armies" [fs.blog:
  Attrition Warfare].

### 3.2 The cost of sustained pressure — and how a nation "runs out of army"

The brutal lesson of 1914–18, and of every drawn-out conflict since, is that **sustained
pressure exacts a body-count the attacker also pays.** Verdun is again the archetype: Germany
tried to *concentrate* attrition ("bleed France white") but the French held a place "the enemy
had to fight" and could not mass; the result was ~700,000 combined casualties over 303 days
for ~8km of ground — **an attrition balance that favored neither side but exhausted both**
[encyclopedia.1914-1918-online; DTIC ADA254194; fs.blog]. The Somme was the same bargain
worse: a concentrated Anglo-French offensive that traded ~420,000 British casualties for
limited gains — the emblem of "attrition when the math is against you."

The mechanized lesson recurs in Ukraine (2022–present): the war "long since settled into one
of attrition," with tense-mile exchanges of "meatgrinder" positional fighting (Bakhmut,
Avdiivka) [CEPA: One More Day][RUSI: Meatgrinder][PBS: Bakhmut]. By late 2025 casualty
estimates for the two sides ran from ~750,000 (U.S. intelligence community, March 2025) to
~950,000 (CSIS, June 2025) killed or injured for Russia, and ~400,000 killed or injured for
Ukraine (Zelenskyy, Jan 2025) [Russia Matters report card]. Bakhmut was fought *as* an
attrition battle, with Ukrainian commanders explicitly stating "the main idea is to exhaust
them, then to attack" [PBS News: Bakhmut]. The concept that maps to a troop pool game is the
**manpower pool**: a nation's army is finite, reinforcement has a regeneration rate, and a
position can be held "at strategic cost" while the blood-letting depletes the pool. OpenFront
*already has* "we have limited troops, picking where to spend them" — the missing piece is
that you currently cannot *choose where* to spend them unevenly (§7).

### 3.3 War exhaustion and the decision loop

A nation does not merely run out of soldiers; it runs out of the **will/means to keep
producing them** — through economic blockade, social reaction to losses, and the inability to
reach aims (attrition-theory's official definition of exhaustion) [Military Strategy
Magazine][encyclopedia.1914-1918-online]. Mobilization timing (the 08 file already flags
mobilization as a gap) and regeneration curves are the game's hooks. The design principle:
**sustained pressure costs the attacker too, and the deeper/longer the war, the more it costs
both sides** — give players a reason to prefer quick, concentrated, decisive blows over a
grind, exactly as real commanders did.

---

## 4. Logistics & sustainment

### 4.1 "Logistics wins wars" — the quotes

The canonical quotes, worth inlining for the design doc:

- Sun Tzu (attributed): "The line between disorder and order lies in logistics" [Logistics
  Quotes; The Logistics of Logistics]. (Often misquoted as "Leaders win through logistics.")
- Gen. Dwight D. Eisenhower: "You won't find it difficult to prove that battles, campaigns,
  and even wars have been won or lost primarily because of logistics" [Logistics Quotes].
- Gen. George S. Patton: "Gentlemen, the officer who doesn't know his communications and
  supply as well as his tactics is totally useless" [Logistics Quotes].
- Gen. Antoine-Henri Jomini: "Logistics comprises the means and arrangements which work out
  the plans of strategy and tactics. Strategy decides where to act; logistics brings the
  troops to this point" [Jomini, Precis de l'Art de la Guerre, 1838, in Logistics Quotes].
- Attributed to Napoleon (apocryphal but apt): "Amateurs study tactics; professionals study
  logistics" [Reddit/WarCollege & common usage — treat as attributed].

### 4.2 Lines of communication and sustainment

The **line of communication (LOC)** is the physical and organizational chain — roads, rail,
sea, air — that moves food, fuel, ammunition, and replacements to a fighting force; doctrine
defines sustainment as "providing logistics, personnel services, and health services… to
maintain operations until mission accomplishment" [JP 4-0 / ATP 4-0 concept; summarized in
Logistics for planners]. Two facts every war-winner internalizes:

1. **An army advances as fast as (or slower than) its logistics allow.** The longer the LOC,
   the harder it is to sustain forward momentum — the basis of the defender's "make the
   attacker stretch his supply lines" play (§5).
2. **Breaking the enemy's logistics breaks his front even if his combat troops remain.**
   Interdiction (attack on LOC), blockade, and **encirclement** (cutting the LOC entirely)
   starve a force into collapse without directly destroying it. This is exactly why
   encirclement is so decisive: **the pocketed army doesn't die from bullets first; it dies
   from running out of food, fuel and ammunition.**

### 4.3 Rail and nautical sustainment (the game already has trains and boats)

Real logistics is dominated by mode: **rail** moves enormous tonnage cheaply over long land
distances (the strength of interior lines; Germany's and Russia's rail nets were strategic
organs), **sea** moves bulk across oceans (amphibious hook and maritime LOCs), and **road/
truck** is the short, flexible, vulnerable last leg. OpenFront's existing `Train`/rail and
`TransportShip`/port economy is genuinely a sustainment strand — but it is currently an
*economic* system (gold), not a *combat sustainment* system (troops/fuel/ammo reaching a
front). §7 treats "supply to a front" as an optional deep feature.

### 4.4 Cutting logistics collapses a front (the encirclement payoff)

The canonical case is **Stalingrad, November 1942 – February 1943.** Operation Uranus
encircled the German 6th Army (~210–300,000 men) in the *Kessel* ("the cauldron"). Cut off
from ground supply, the pocket needed ~700 tons/day; the Luftwaffe's air bridge delivered
only ~105 tons/day [Warfare History / video on Operation Winter Storm]. Within two weeks the
trapped men were short of food, ammunition, and medical supplies; without breakout they
deteriorated to "conditions reminiscent of World War I trench warfare" — dysentery, starvation,
systemic collapse — and surrendered in February 1943 [Wikipedia: Battle of Stalingrad]. The
German encirclements of 1941 (*Kesselschlacht*) worked the same way, "chopping the Soviet
armies into manageable pockets" [Wray]. The modern example is the same in kind: in Ukraine,
Russian "meatgrinder" tactics and drone-strike interdiction of logistics have repeatedly
degraded positions "not because the defenders died en masse but because their sustainment
collapsed" (analyst framing; [RUSI: Meatgrinder]).

**Design translation:** a pocketed group of tiles whose last connection to its owner (or its
owner's reinforcement/supply source) is severed should *weaken* — lose troops over time, lose
its defense bonus, or stop regenerating — until it's reconnected or conquered. No such
mechanic exists today. It is the single most "logistics-y" high-value addition after the
focus mechanic (§7.7).

---

## 5. Strategic depth & defense in depth

**Defense in depth** (also "deep/elastic defense") is the strategy of **yielding space to buy
time and casualties** rather than relying on one line: the defender "seeks to delay rather
than prevent the advance, buying time and causing additional casualties by yielding space…
the tendency of an attack to lose momentum over time or as it covers a larger area"
[Wikipedia: Defence in depth]. U.S. doctrine (FM 3-0 / FM 3-90-1) frames the same idea as
**"trading space for time":** a force under pressure "yields ground to gain time while
retaining flexibility and freedom of action to inflict the maximum damage on an enemy,"
reducing his momentum and, if his advance stalls, exposing him to envelopment [FM 3-0][FM
3-90-1]. Doctrine stresses depth within the area of operations to allow repositioning:
"employing a defense in depth can conduct an area defense on a wider frontage than a forward
defense because a forward defense has no time or space to reposition forces" [FM 3-90-1].

Why it works — the two compounding effects the game can model:

1. **Attrition of the spearhead.** Every successive fallback position bleeds the attacker;
   his spearhead arrives thinned and tired just as it has to breach the next belt.
2. **Stretched logistics.** The deeper the attacker penetrates, the longer and more exposed
   his LOC (§4), the further his momentum carries him from resupply — the "culminating
   point."
3. **Exposed flanks.** "As they penetrate deeper, their flanks become vulnerable, and should
   the advance stall they risk being enveloped" [Wikipedia: Defence in depth].

Historical anchors: the Soviet defense at **Kursk (1943)** — a depth of entrenchment and
reserves so deep that even the German concentrated assault stalled and was then
counter-attacked (the culmination-point trap) [Deep operation outcome section][Kharkov
article]; and the **Maginot Line** strategy more broadly, where the *philosophy* of a
continuous belt (which the Germans bypassed) is contrasted with elastic defense that trades
space. In a tile game, defense-in-depth naturally arises from **ownership of depth**: the
defender's *territory itself* (retreat distance) *is* their depth, and a "fallback bonus" /
"momentum loss for the invader with distance from home" produces the trading-space effect.

---

## 6. Surprise, disruption & morale

### 6.1 Surprise

Surprise is one of the classic principles of war (it is in FM 3-0's principles and in
blitzkrieg's DNA): "calculate to create psychological shock and resultant disorganization in
enemy forces through the employment of surprise, speed, and superiority in matériel"
[Britannica: Blitzkrieg]. The Shock and Awe ("rapid dominance") doctrine (Ullman & Wade, NDU,
1996) generalizes it: **impose the "desired state of helplessness and lack of will" by direct
force on command-and-control, selective denial of information, overwhelming combat force, and
rapidity of action** [Wikipedia: Shock and awe; Ullman & Wade]. In the game, surprise is
currently impossible to *target* because you cannot secretly mass, and there is no
"disorientation/first-strike" bonus. A cheap, satisfying expression is a **first-strike /
ambush bonus** on a freshly starting attack on a sector, or **hidden troop movement**
(interior-lines maneuver unseen until it lands).

### 6.2 Disruption — destroying command and electronics

Modern doctrine treats the enemy's **sensor–decide–act loop** as the target set, via
**electronic warfare (EW)** — "disrupt, deny, degrade, destroy, or deceive" the adversary's
ability to sense, communicate, decide, and act [JCS JP 3-13.1 Electronic Warfare; Lockheed
Martin EW description] — and via **decapitation of command** (destroying command-and-control
centers, as in the 2003 Iraq opening and Ullman/Wade's prescription). The Shock and Awe text
is explicit that "loss of all communications can have a massively destructive impact even
though physical destruction can be relatively limited" [Ullman & Wade]. For OpenFront, the
existing **nuke/SAM** system is the natural hook for "decapitation," and a *disruption*
mechanic (targeted strike that temporarily halts or slows an enemy's attacks / defense /
reinforcement in an area) is a clean, implementable version (§7.9).

### 6.3 Morale and the will to fight

Morale — the will to fight — sits under every concept above: exhaustion (a will-wastage),
surprise (a will-shock), disruption (a will-paralysis). Doctrine (MCDP 1 / MCDP 1-2) treats
the *moral* component of combat power as equal to the physical [MCDP 1-2]. For a deterministic
engine, morale is best expressed as **a modifier tied to state**: lots of territory lost, long
stalemate, being pocketed, or recent devastation all reduce a nation's effective strength or
its regeneration; a sudden victory or a defended homeland raises it. §7.10 marks morale as a
"needs design" longer-term feature, with encirclement-plus-exhaustion as the achievable first
slice.

---

## 7. Game implications — concrete, prioritized design proposals

This section is the engine-facing payoff. Everything is grounded in the current code paths
described in §0. Each item is tagged:

- **Known-how-to-implement** — maps cleanly onto existing structures/patterns (esp. the boat
  `sourceTile` primitive, the `FreshBinaryHeap`, `engineConfig.attackLogic`).
- **Needs-design** — the mechanic is clear but the exact numbers/interaction need tuning.
- **Complex** — a substantial feature (new data structures / new spatial queries / new UI).

### 7.0 P0 — THE core change: region/theater-focused attacks (the whole point)

**Goal:** let a player "push a specific region more heavily than others" instead of
all-border-or-nothing — the *Schwerpunkt / main effort* of §1, the "focus front / axis of
advance" the task asks for.

**The root cause in code:** `AttackExecution` runs *one* attack = one troop pool (`startTroops`),
one per-tick budget (`tickBudget = 1`), and one heap (`toConquer`) seeded from the **entire
border** (`refreshToConquer()`). There is no way to express "spend my budget on the North
Axis."

**Design: introduce an Axis/Front (region) concept on land, generalized from the boat model.**

The boat attack is *already* region-targeted: `sourceTile !== null` → `init()` calls
`addNeighbors(sourceTile)` and only the beachhead's local neighbors are in the heap.
**Generalize this to a ground "axis."** Concretely, three implementation strategies, in
increasing generality:

**(a) Single-attack, region-weighted heap (smallest change).** Keep one attack/troop pool, but:
- Let the player designate a **focus region R** (a set of contiguous target tiles, or the set
  of the attacker's own border tiles adjacent to a direction / a named front).
- In `addNeighbors`, apply a **priority bonus** to tiles belonging to (or adjacent to) R so
  they always dequeue first within the tick; non-focus tiles only get conquered if budget is
  left (an *economy-of-force* spray).
- Give the attack a **per-region troop sub-budget**: split `startTroops` and `attack.troops()`
  into `{region → troops}`; a tile consumes from its region's sub-pool. Stop conquering on a
  region whose sub-pool is exhausted, even if the global pool has troops — this makes
  "economize elsewhere" real: the non-focused regions stall for lack of allocated troops.
- Known-how-to-implement: `addNeighbors`, the heap priority math, `attackLogicInput`, and the
  tick loop are all already there; the change is *which* tiles get priority + a region→pool
  map. This delivers the requested feature with the least risk.

**(b) Per-front sub-attacks (bigger, more faithful).** Let the player split an attack into
**multiple per-front AttackExecution instances** — each with its own troop pool (like separate
boat attacks), each iterating only its own front's border. Today `init()` *merges* outgoing
attacks to the same target; instead, allow multiple simultaneous, non-merging attacks where
each is scoped to a front, and let the player allocate troops per front (`front → pool`).
This *natively* implements local superiority, interior lines (shift troops between front
attacks), and divergent costs. Needs-design: the UI for defining fronts and the merge-rule
exception; the attack-resolution math per front already exists.

**(c) Persistent "fronts" with local garrisons (furthest from today, richest long-term).**
Give each nation a set of named geographic **fronts/axes** that persist between attacks, each
with its own local troop count (a garrison), its own supply (from §7.8), and its own attack
budget. Attacks within a front use the front's troops; relocating between fronts costs time
and incurs attrition (interior lines). This is the full realism target but it is the biggest
change (new player/territory data, movement, supply). Mark **complex**; treat (a) or (b) as the
v1 landing.

**Recommendation:** ship **(a)** first (smallest, most robust, delivers the exact requested
feature), keep the architecture so **(b)** and **(c)** can be layered on. All variants stay
deterministic (pure functions + explicit state in `attackLogic` / the attack object) and gated
behind `isRealisticWorld`.

### 7.1 P0 — how to allocate the per-tick conquest budget and troop loss unevenly by region

The current budget is global: `tickBudget = 1`, shared by all dequeued tiles, and
`attackerTroopLoss` depends only on the *global* ratio `defender.troops/attackTroops`. To make
a region "push harder," two independent dials, both implementable:

1. **Budget dial (speed/conquest).** Add a per-region weight × the existing `tickFraction`.
   Tiles in the focused region get a reduced effective `tickFraction` (so more of them fit in
   the tick's `tickBudget = 1`), or equivalently keep a per-region budget counter. Outcome:
   the focused region conquers more tiles/tick (faster advance), the rest fewer — the *economy
   of force* spray of option (a). This is a pure, deterministic scalar change to how
   `tickFraction` is applied (could be a `frontWeight` multiplier fed from the attack object,
   or a per-region `budget` field).
2. **Loss dial (bloodiness).** Currently `attackerTroopLoss = mag * within(
   defender.troops/attackTroops, 0.6, 2) * (...)`. Add a **per-front attacker-local density**:
   replace the global `attackTroops` in the ratio with the region's local allocated pool, so a
   heavily-allocated front fights at high **local** superiority (low per-tile attacker loss,
   fast) while a starved front fights at low local ratio (high per-tile loss — it bleeds). This
   is *exactly* the Lanchester/local-ratio logic of §1.5 and is the single most important
   number to get right. **Needs-design** for the numbers; structurally known-how (it's just
   which pool goes into `attackLogicInput.attackTroops`).

**Net effect to feel:** a player with 100k troops can, say, feed 80k to the "invade Poland"
axis (fast, cheap, decisive) while 20k dribble into a quiet "hold the Alps" axis (slow,
cautious). Today that same 100k is forced to attack every border at once — and loses to
nobody because it never wins anywhere.

### 7.2 Secondary feature: troop relocation between fronts (interior lines)

**Concept (§2.2):** let a player move a stack / allocated troops from one front to another
(interior lines), paying a **transit cost and delay** proportional to the distance (by own
territory) — cheap and fast on your own interior, expensive/slow if your territory is
stretched thin (which also models "long LOC, §4.2"). **Needs-design.** In option (a) this is a
re-allocation of sub-pools with a migration animation + delay; in option (c) it's real local
garrison movement. The mechanic rewards compact empires (interior lines) and punishes sprawling
chains that must redeploy the long way around — a natural depth feature.

### 7.3 Secondary feature: a thin-defense / over-concentration penalty (density-based defense)

**Concept (§1.6):** the flip side of mass is exposure. Add a **defender's local-density
(readiness) bonus** and an attacker's over-concentration risk: if the attacker concentrates
everything on one front, the *other* borders are thin — a defender (or human) should be able to
**counterattack the thinned sectors** and create salients to pinch (§1.6's flank geometry;
Kursk). Implement as a **defensive bonus that scales with the defender's local troops-per-tile
on the attacked front**, and let an over-concentrated attacker's perimeter be relatively easier
to break on non-focus fronts. **Needs-design**; builds directly on the per-front pools of §7.1.

### 7.4 Secondary feature: diversionary / feint attacks

**Concept (§2.4):** a cheap, low-commitment attack on a non-main front whose *purpose is to
force the enemy to respond* — to spend troops/defense budget, or to react, on the wrong axis.
Because a no-focus attack *already* sprays the whole border, a feint is nearly free: mark a
front as "feint," give it a small pool and no expectation of conquest, and have it present as
a real attack so the defender (especially a bot / nation AI) allocates a response. **Known-how-
to-implement** (it reuses the front concept; the only new logic is the AI's response heuristic).
Feints are a fantastic low-cost addition that makes *reading your opponent* matter.

### 7.5 Secondary feature: reinforcement to a chosen front

**Concept (§2.3):** beyond relocation, allow **reinforcement of a specific front** from the
national pool up to some rate — i.e. spend regeneration/troops *at a point* rather than only
globally. In the current code, troops regenerate globally and attacks take a flat 1/5 globally;
adding "send 5,000 to the North Axis" is a natural extension of per-front pools (§7.1). This,
plus relocation (§7.2), completes the "operational reserve into the decisive operation" pattern
of MCPP [MCPP]. **Needs-design** (rate + interaction with global regen); structurally easy once
fronts exist.

### 7.6 Secondary feature: encirclement / pocketing

**Concept (§4.4):** if the attacker conquers territory that **severs an enemy region's last
connection to its owner**, that region becomes a pocket: it **stops regenerating**, **loses
troops over time (starvation/supply-cut)**, and **loses its defense bonus**, until reconnected
or overrun. This is the highest-logistics-value addition after concentration. It needs a
**connectivity check** (does the pocket still touch its owner's core / a supply source through
own tiles?) — computable deterministically with a flood-fill from the owner's core per tick
(or on conquest), which is a known, if non-trivial, spatial query (the engine already does
neighbor scans and `handleDeadDefender`'s flood-fill-style passes, so the pattern exists —
this is **known-how-to-implement with moderate work**, mark needs-design for the decay
numbers). Stalingrad (the 6th Army starved in the *Kessel*) is the canonical grounding
[Wikipedia: Battle of Stalingrad][Operation Winter Storm].

### 7.7 Secondary feature: front composition / density display & the "front" as a first-class object

**Concept (§2.1):** surface **fronts** to the player as real objects: each contiguous stretch
of border vs each enemy is a named "front" with an attack weight, a local troop allocation, and
a density readout (defender's local troops/tile). This is partly UI, but it's the prerequisite
for bots/AI to reason in fronts too (a bot that chooses a main effort like a real commander is
a much better opponent). **Needs-design** (front definition algorithm — contiguous border
segments, or per-enemy, or player-drawn; pick one that's deterministic and cheap).

### 7.8 Secondary/deep: supply to a front (logistics)

**Concept (§4):** a front's attack speed and its attacker-loss could key off **supply length** —
distance from the owner's core/ports/factories along owned territory (a "LOC"). Long, thin
extensions attack slower and lose more (culminating point, §5); cutting the LOC (encirclement)
collapses the front (§7.6). OpenFront's `Train`/`TransportShip` economy could be re-read as the
*physical* sustainment network. **Complex** — this is the deepest logistics feature but
interacts with everything and needs the largest data. Worth designing after fronts exist; it is
what turns "stretch your supply lines" from flavor into a real game threat.

### 7.9 Deep: disruption / decapitation (EW & command)

**Concept (§6.2):** a targeted strike (nuke? a new "electronic warfare / comms jammer" unit?)
that **temporarily suppresses an enemy's attacks or defense or reinforcement in an area**. Clean
and implementable as a timed debuff (the engine already has timed unit states like SAM
upgrades). **Known-how / needs-design** — mechanically a status effect; value is high because it
gives the existing nuke/SAM arsenal a *non-destructive themic* use.

### 7.10 Deep: morale / exhaustion

**Concept (§6.3, §3.3):** a nation-wide (or front-wide) **will-to-fight** modifier driven by
state: territory lost, being pocketed, long stalemate, devastation → degraded regeneration /
effective strength; a defended homeland or a win → boost. This is the "war exhaustion" the 08
file flags as a gap. **Complex / needs design** — it's a global stateful modifier; start with
the smallest slice (encirclement-fed decay already from §7.6, plus lost-territory scaling) and
grow from there.

### 7.11 Prioritized value-to-effort summary

| # | Feature | Real-world anchor | Effort | Priority |
|---|---|---|---|---|
| 1 | **Focus-front / axis-of-advance attacks** (7.0a) | Schwerpunkt, main effort | **Known-how** (moderate) | **P0 — do first** |
| 2 | Uneven per-tick budget + per-front troop loss (7.1) | local ratio / Lanchester | **Known-how / needs-design** | **P0 — same change** |
| 3 | Feint / diversionary attacks (7.4) | deception, fixing efforts | **Known-how** | High |
| 4 | Front composition / density + AI main-effort (7.7) | operational framework | Needs-design | High |
| 5 | Reinforcement to a chosen front (7.5) | operational reserve | Needs-design | Medium-high |
| 6 | Troop relocation between fronts / interior lines (7.2) | interior vs exterior lines | Needs-design | Medium |
| 7 | Thin-defense / over-concentration penalty (7.3) | salient, exposed flanks | Needs-design | Medium |
| 8 | **Encirclement / pocketing** (7.6) | Stalingrad, cut LOC | Needs-design (moderate) | Medium-high (biggest depth payoff after 1‑2) |
| 9 | Supply to a front / LOC (7.8) | logistics wins wars | Complex | Later (after fronts) |
| 10 | Disruption / decapitation (7.9) | EW, shock & awe | Known-how / needs-design | Later |
| 11 | Morale / exhaustion (7.10) | will-to-fight, war exhaustion | Complex | Later |

The **first two are one landed change** (region-focused attacks with uneven budget/loss) and
deliver the requested headline feature. Features 3–5 are cheap multipliers on the same front
machinery. Encirclement (8) is the highest *depth* payoff after 1–2 because it finally gives
territory geometry strategic meaning beyond "more land."

---

## 8. Other real war dynamics not yet in the game (checklist)

- **Reinforcement** — channeling new troops to where they're needed (exists only as flat global
  regen + flat attack pools; see §7.5).
- **Reinforcement at a point** — timing and *where* reinforcements arrive; interior-lines racing
  (§2.3, §7.5).
- **Morale** — the will to fight / exhaustion as a modifier (§6.3, §7.10).
- **Logistics / sustainment** — supply to a front, LOCs, rail/sea sustainment as a *combat*
  system, not just economy (§4, §7.8).
- **Encirclement / pocketing** — cutting a region off → starvation/weakening (§4.4, §7.6).
- **Surprise** — first-strike/ambush bonuses, hidden massing, deception (§6.1, §7.4).
- **War exhaustion** — long-war cost that rises for both sides (§3.3, §7.10).
- **Mobilization timing** — ability to raise/regenerate forces on a schedule vs. instantly
  (flagged in the 08 file; links to §3.3).
- **Interior/exterior lines** — movement cost and advantage tradeoffs between fronts (§2.2,
  §7.2).
- **Strategic resources/chokepoints** — economic–strategic leverage (from 08 file; tied to
  cruise/trade chokepoints) — orthogonal to this doc but reinforcing why *where* matters.
- **Right-of-passage / basing** (from 08 file) — moving forces through allied territory, which
  the interior-lines/relocation feature (§7.2) naturally intersects.

---

## 9. Implementation principles & gating

Per the repo's rules (READinherit.md / research README) and the house style of the realism
series:

- **Keep every change gated behind `isRealisticWorld`** ("one option among many"); classic
  mode stays untouched. `EngineConfig.isRealisticWorld()` and `RealisticWorld.ts` are the
  natural gate.
- **Determinism is a hard requirement** and this series respects it: region budgets, focus
  priority weights, pocket-decay, and supply-length must all be pure functions of state +
  the existing `PseudoRandom` — no wall-clock or map-order dependence. `attackLogic` is
  already documented as "pure: depends only on the given input and this config's tunables"
  [EngineConfig.attackLogic comment], so extend *inputs*, don't introduce side effects.
- **Numbers are tuning seeds, not gospel.** Every specific multiplier in §7 is a starting
  point (the folder's standing rule), to be shaped by playtests, then frozen for determinism.
- **Land small:** implement §7.0–7.1 first (one change, the headline feature), then bolt on
  feints and fronts, then encirclement, then the deepers. Re-verify the 2021-era/modern
  historical claims below at implementation time if a specific number becomes load-bearing.

---

## Sources

**Doctrine / theory**
- Carl von Clausewitz, *On War* (ed./trans. Howard & Paret) — concentration, center of gravity
  (Schwerpunkt), culminating point. [Clausewitz]
- A. Echevarria II, *Clausewitz's Center of Gravity: Changing Our Warfighting Doctrine—Again!*
  (USAWC Press, 2002) — Schwerpunkt as "point of main effort," CoG scholarship. [Echevarria]
- U.S. Army, ATP 5-0 / FM 5-0 (MDMP) and FM 3-0 (Operations) — main effort / supporting
  effort, decisive–shaping–sustaining, trade-space-for-time. [ATP 5-0][FM 3-0]
- U.S. Army, FM 3-90-1 (Tactics) — defense in depth, delaying, interior/exterior lines
  summary. [FM 3-90-1]
- U.S. Marine Corps, MCPP / MCWP 5-10 / MCDP 1-2 — main & supporting effort, fix/decide,
  moral component. [MCPP][USMC MCDP]
- JP 5-0 *Planner's Handbook for Operational Design* — decisive point, lines of operations,
  main effort. [JP 5-0][AFDP 5-0]
- JCS JP 3-13.1 *Electronic Warfare* — EW disruption/degradation/denial framework. [JP 3-13.1]
- DTIC ADA184730 (interior lines; cites FM 100-5); A. Rapin, *Rethinking Lines of Operations*
  (Jomini) — interior/exterior lines. [DTIC][Jomini]
- JCS JP 4-0 / ATP 4-0 sustainment concept (summarized) — logistics/LOC. [JP 4-0/ATP 4-0]

**Soviet / deep battle**
- *Deep operation* (Wikipedia) & Triandafillov/Tukhachevsky/PU-36; Global Security Review,
  "The Russian View of Deep Battle"; ArmyUP / Blythe, "A History of Operational Art". [USSR
  deep battle]

**Attrition / exhaustion**
- *Attrition warfare* (Wikipedia); *Attrition Warfare* (International Encyclopedia of the
  First World War); Military Strategy Magazine (attrition vs exhaustion); War on the Rocks,
  "Setting the Record Straight on Attrition"; ArmyUP, "On Attrition: An Ontology"; fs.blog
  (Churchill quote). [Attrition][PBS Bakhmut][RUSI Meatgrinder][CEPA][Reuters]

**Historical cases**
- Blitzkrieg: Wikipedia, USHMM Holocaust Encyclopedia, Britannica, IWM — Sedan 1940,
  Schwerpunktbildung. [Blitzkrieg]
- Verdun 1916: International Encyclopedia of WW1; DTIC ADA254194 ("bleed France white").
  [Verdun]
- Stalingrad / Operation Uranus / air bridge / Directive No. 45: Wikipedia, Naval/Warfare
  History, National WWII Museum, Operation Winter Storm sources. [Stalingrad]
- Gulf War 100-hour / left hook / deception: Britannica (Persian Gulf War), Marine Corps
  Gazette, ArmyUP *Deception in the Desert*. [Gulf War]
- Ukraine attrition & casualties: Russia Matters report card (Oct 2025; Cavoli/IC/CSIS
  estimates), PBS News (Bakhmut), RUSI *Meatgrinder*, Kiev Post 2025. [Reuters 2024-style
  news citations]

**Logistics quotes**
- Sun Tzu, Eisenhower, Patton, Jomini — collected in *The Logistics of Logistics*, Multiple
  logistics-quote compilations, WarU *Quotes for the Air Force Logistician*. [Logistics]

**Engine grounding (verified in repo, not public sources)**
- `packages/engine/src/execution/AttackExecution.ts` — `refreshToConquer`, whole-border heap,
  `tickBudget = 1`, `addNeighbors`, boat `sourceTile` path, heap priority, `attackLogicInput`.
- `packages/engine/src/configuration/EngineConfig.ts` — `attackAmount` (1/5 human), pure
  `attackLogic` (mag/tileCost/wheel, `tickFraction ÷ borderSize`, local-ratio loss),
  `terrainAttackBase` (Realistic World mountain cost), `boatAttackAmount` (1/5).
