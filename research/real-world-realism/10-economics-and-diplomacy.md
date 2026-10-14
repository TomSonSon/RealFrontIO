# Real-World Economics & Diplomacy — Trade, Sanctions, Alliances, Coalitions, Passage, Chokepoints, and Economic Power (for OpenFront "Realistic World" mode)

> **Scope.** This is the research foundation for OpenFront's "Realistic World" economic and diplomatic systems. It answers eight questions about the real world and then maps each to the current engine (trade via `TradeShip`/`Train`, relations tiers, `Embargo`, alliances, coalition attacks, ownership-exclusive terrain, and the `isRealisticWorld` gate). The goal is not to model the *whole* global economy, but to extract the few dynamics that create good strategy, deterministic behavior, and testable engine changes.
>
> **Method.** Grounded in open-source reporting current as of **October 2026**, with inline citations to World Bank, Reuters, IISS, CFR, CRS/Congress.gov, Chatham House, CSIS, PIIE, EIA, and mainstream news. Facts that are time-sensitive or contested are flagged so the design can be versioned.
>
> **Design discipline (from the repo rules and `08-game-dynamics-notes.md`).** Everything below is framed to (1) hang off the *named engine systems* already in the codebase, (2) be **gated behind `isRealisticWorld`** so classic mode is untouched, (3) be **deterministic** (no hidden randomness that breaks replays), and (4) be **covered by engine tests**. Where a proposal is speculative, it is explicitly labeled **needs-design** or **complex** rather than presented as settled.

---

## Table of contents

1. [Who trades with whom — complexity beyond "allies trade, enemies don't"](#1-who-trades-with-whom)
2. [Sanctions & economic boycotts — coercion, isolation, signalling](#2-sanctions--economic-boycotts)
3. [Alliance formation, breaking & reputation](#3-alliance-formation-breaking--reputation)
4. [Coalition & joint military action](#4-coalition--joint-military-action)
5. [Right of passage, transit & basing](#5-right-of-passage-transit--basing)
6. [Strategic resources & chokepoints](#6-strategic-resources--chokepoints)
7. [Economic power projection — currency, debt, aid, investment](#7-economic-power-projection)
8. [Game implications — prioritized, engine-tied design proposals](#8-game-implications--concrete-prioritized-design-proposals)

---

# 1. WHO TRADES WITH WHOM

## 1.1 The naive model vs. reality

**Naive in-game assumption:** trade follows alliance lines — allies trade, enemies don't, and "hostile" means no trade. **Real world: false.** Trade is overwhelmingly governed by comparative advantage, geography, price, and infrastructure dependence — *not* by warm relations. Countries that are geopolitical rivals, and even outright adversaries at war with each other's clients, trade heavily because both sides benefit and because some goods (energy, food, rare earths, chips) have **no cheap substitute**.

**The single best illustration is the US–China relationship.** The United States and China are the world's two largest economies — together ~**43% of global GDP** and ~**48% of global manufacturing output** in 2023 [World Bank via CFR]. Yet despite a grinding trade war, escalating tariffs, and deepening strategic rivalry, bilateral goods trade still totaled an estimated **$414.6 billion in 2025** ($106.0B US exports, $308.7B US imports) [USTR]. That is enormous trade *between declared rivals*. The 2018–2026 tariff escalation *reduced* but did not *eliminate* the flow — US imports from China fell ~30% and still exceeded $300B, and a large share was **rerouted through third countries** (Southeast Asia) rather than stopped [Wikipedia/Wikipedia trade war; PAAlAulA]. Even the US trade deficit with China, though its lowest in two decades, remained over **$200 billion** [CFR]. Economists largely conclude the tariff war did not "win" anything — it diverted, not eliminated, trade [CFR; PAAlAulA].

**Why does rival trade persist?** Because the two economies are **complementary**: China has manufacturing scale and rare-earth/electronics supply chains; the US has consumers, technology, and food/energy. Both would be much poorer without the exchange. Trade is a **positive-sum relationship that exists alongside geopolitical competition**, not instead of it. China regularly calls this "decoupling" impossible — and US business opinion data confirms companies keep operating across the Pacific despite tensions [Statista; USTR].

## 1.2 Allies, neutrals, and rivals all trade — the energy cases

**EU–Russia energy before 2022.** For decades the EU—a NATO-core bloc—was by far Russia's largest energy customer. Before the invasion, **>40% of Europe's imported pipeline gas came from Russia**, its single largest supplier; some EU members (Austria, Latvia, Czechia) were **~80–100% dependent** on Russian gas [Brookings; wiiw]. Germany, the heart of the Western alliance, was Russia's largest gas customer by volume. Oil and gas were the majority of Russian exports (~$110B crude oil in 2021 alone) [Bruegel]. This was trade between the two sides of the Cold War-era divide — because **you can't argue with the physics of pipelines and geography.** Russia's gas is physically attached to Europe; Europe's demand is physically attached to that gas. Neither had a cheap alternative in the medium term.

**The 2022 rupture proves both the power and the limits of decoupling.** After the invasion, the EU *did* decouple dramatically, but only at enormous cost and over years: Russian pipeline-gas share fell from ~40% (2021) to ~6% (2025) [Consilium]. But this required building new LNG terminals, shifting to US/Norway/Algeria supply, and enduring a brutal 2022–23 price spike (Brent >$130; EU gas crisis) [IEA; Wikipedia]. Russia, for its part, **could not simply redirect** the gas to China — the infrastructure doesn't connect east [Bruegel]. So both sides *bled*: the EU paid more for energy, and Russia lost the revenue. It is a textbook case of **strategic dependence creating mutual (trapped) trade** — and of how hard it is to break once infrastructure locks it in.

**India buying Russian oil while allied-partnering with the West.** India is a member of the Quad and buys arms from both Russia and the West simultaneously — a model "multi-aligned" middle power [Chatham House]. Since the war began, India's Russian crude imports went from ~**2–3% of imports (2021) to ~35–40% (2024)**, making Russia India's largest oil supplier [BBC; SPF; Al Jazeera]. India's stated logic: **"we will buy oil from wherever we get the best deal"** to protect its 1.4 billion people, and it has formally resisted US pressure to stop [BBC]. The US has responded with threats of **secondary tariffs up to 100%** on buyers of Russian energy (the 2026 Graham Act), and India has begun to bend — but analysts conclude India **cannot quickly replace** the Russian barrels given global supply constraints [Nikkei]. This is the defining example of **a "friendly-in-the-West" power trading heavily with a sanctioned adversary for cheap energy** — because energy security trumps alliance optics, up to the point where coercion (secondary sanctions) makes it too expensive.

## 1.3 Tariffs, carve-outs, and strategic dependence

Real-world trade is not simply on/off. Three mechanics refine it:

1. **Tariffs/price structures, not binary embargoes.** The US–China tariff war pushed a trade-weighted US tariff on Chinese imports to **~47.5%** (2025) — a huge tax but *not a ban* [PAAlAulA]. Trade continued but was slower and redirected. This is the real-world analogue of a **"neutral/rival tariff rate"** rather than an unbridgeable wall.

2. **Carve-outs and exemptions.** The G7 oil **price cap** explicitly *kept Russian oil flowing* while capping the price, to avoid a market shock that would have hurt the sanctioners as much as Russia [Harvard HKS; Treasury]. Sanctions routinely exempt **humanitarian goods** (food, medicine) — Iran sanctions officially exempted medicines even as banking restrictions made them hard to buy [Wikipedia Iran sanctions]. Real sanction regimes are full of **holes by design** because cutting off everything is often self-damaging.

3. **Strategic dependence is asymmetrical.** Some goods are critical with no substitute, making the *dependence itself* a vulnerability:
   - **Energy** (oil, gas) — as above.
   - **Food** — net importers depend on exporters (grains); a food net-exporter has leverage.
   - **Chips / semiconductors** — Taiwan produces the majority of advanced chips; TSMC is a strategic dependency for the entire world [IISS/literature].
   - **Rare earths** — China dominates ~60–70% of rare-earth mining and most processing; a choke on rare earths flows through to everything from EVs to defense electronics.

**The strategic dictum:** whoever is the *only* or *cheapest* supplier of something the other side cannot do without has leverage, regardless of alliance status. Trade follows **comparative advantage + geography + infrastructure lock-in**, and sanctions/security blocs rewire *some* flows at high cost — they do not snap trade to alliance lines.

## 1.4 What this means for the game's "who trades with whom"

Mapping to `Player.canTrade(neighbor)` and relations tiers:

- Trade should **not** be a hard on/off at relation < Hostile. Allies, neutrals, and even rivals should keep trading — but at **differentiated value/price tiers** (allies best, neutrals "tariffed," hostiles embargoed **unless a strategic/energy exemption** applies).
- The current hard auto-embargo at `relation <= Hostile` is exactly the "allies trade, enemies don't" error. Realistic mode should replace the binary with **scaled economic value by relation plus strategic exemptions**.
- "Sanction-sensitive goods" (energy/rare earth = factories/industry) should be **embargoable and hurt both sides** when cut — modelling EU-Russia mutual pain rather than one-sided walls.

---

# 2. SANCTIONS & ECONOMIC BOYCOTTS

## 2.1 Definition and mechanics taxonomy

A **sanction/embargo** is coercive economic pressure short of (or alongside) war. The real toolbox, in increasing severity:

- **Unilateral sanctions** — one state acts alone (US sanctions its own firms/citizens against a target). Easiest to impose, weakest effect, often mostly symbolic.
- **Multilateral / coalition sanctions** — many states coordinate (EU, UN, US-led coalitions). Much stronger because the target loses more trade partners and faces fewer alternate suppliers. PIIE finds sanctions are "more likely to succeed when hit hard, include financial controls, and are **enforced through international cooperation**" [PIIE].
- **Primary vs. secondary sanctions** — primary targets direct dealings with the sanctioned state/citizens; **secondary sanctions** punish *third parties* who deal with the target (e.g., US threatening India/China with tariffs for buying Russian energy; the 2026 Graham Act up to 100% tariffs on buyers of Russian/Iranian energy) [Nikkei; CRS IF12452]. Secondary sanctions are how a powerful sanctioner **extends coercion beyond its own borders**.
- **Embargoes by type** — arms embargoes (UN arms embargo on South Africa, 1976-onward), **energy embargoes** (EU 6th package banning seaborne Russian crude, Dec 2022; OPEC's 1973 oil embargo), **financial sanctions** (freezing central-bank reserves; excluding banks from **SWIFT** messaging).
- **Blockades** — a *physical/kinetic* interdiction of trade (a naval blockade, or OPEC 1973 refusing to ship to the US/Netherlands). A blockade is closer to an **act of war** than to a mere economic sanction — it physically prevents movement rather than disincentivizing it.
- **Export controls** — restricting the *sale of specific technology* (US/EU controls on advanced chips, equipment, software to Russia/China). These target capabilities, not just revenue.

## 2.2 Real cases and their (mixed) outcomes

**Russia post-2022 (the canonical modern case).** The coalition (US, EU, G7, Australia, Japan, South Korea) deployed: exclusion of major Russian banks from **SWIFT**; freezing of ~$300B of central-bank reserves (later leveraged to back a $20B US loan to Ukraine) [CFR]; the **seaborne-oil import ban** (Dec 2022 / Feb 2023 EU 6th package); and the **G7 oil price cap** ($60/bbl on Russian crude using coalition shipping/insurance, Dec 2022). **Outcomes:**
- Russia's oil export *revenue* fell sharply — oil-export duty receipts reportedly fell **60%**; Russia's Finance Minister admitted the cap widened the 2023 budget deficit and "significantly reduce[d]" economic activity [Treasury; Wikipedia]. Russia was forced to accept a **~$32/bbl discount** on Urals crude, partly from longer shipping distances as it diverted exports to Asia [Dallas Fed].
- **But** Russia remained a functioning hydrocarbon exporter by building a **"shadow fleet"** of uninsured, non-Western tankers and selling to India/China/Turkey at discounts — sanctions **reduced revenue, didn't stop trade** [Dallas Fed; CRS]. India/China became the primary buyers, effectively arbitraging the discount [Dallas Fed].
- The sanctions **cost the sanctioners** heavily: EU inflation, the gas crisis, and (per CGE modeling) an oil+gas embargo costing EU welfare — extending the embargo to gas, in particular, roughly **doubles** the EU's welfare cost, and hurts Russia *less* proportionally than it hurts the EU [ScienceDirect]. **Sanctions that damage the sanctioner are real** — this is the "oil/gas cut hurts both sides" fact that must be in the game.

**Iran (2010s and 2018–2026 "maximum pressure").** Comprehensive multilateral sanctions (oil, banking, SWIFT) plus US secondary sanctions hit Iran's economy hard: oil exports fell from ~**2.5M bpd (2018) to under ~0.5M bpd (2020)**; currency collapsed; inflation soared; the middle class shrank ~**12–17 percentage points/yr** by some estimates [CRS; BBC; ScienceDirect]. The UN's Iran sanctions helped produce the **JCPOA (2015)** — Iran traded sanctions relief for limits on its nuclear program — a *measured success* of multilateral pressure with an **off-ramp** [PIIE]. But the 2018 US withdrawal and "maximum pressure" **did not make Iran abandon its nuclear program** — it accelerated breakout, because maximum pressure offered **no realistic path to relief** [DU thesis; CRS]. Lesson: **sanctions coerce only when the target's cost of submitting is lower than the cost of enduring** — if there's no off-ramp, a target doubles down. Sanctions hurt, but "hurt" ≠ "comply."

**Cuba (US embargo, 1960–present).** A long-standing, mostly *unilateral* (US) embargo that has **failed to change the regime** for six decades — the textbook case of unilateral coercion's limits — while inflicting genuine hardship on Cubans [Verfassungsblog]. It shows that **without coalition support and without an off-ramp, endurance beats coercion.** (As of 2026 the US has *tightened* it further into a fuel blockade, and Cuba now leans on Russia/Venezuela — sanctions pushed the target into another patron's arms [Verfassungsblog].)

**South Africa / apartheid (1960s–mid-1980s).** The closest thing to a *successful* broad coalition sanctions campaign. Arms embargo (UN 1976 onward), an OPEC-driven **oil embargo (1973)**, and 1985–87 multilateral trade/financial sanctions pressured a regime that De Klerk himself called **economically unsustainable** — contributing to the release of Mandela and the end of apartheid [Wikipedia; Yale cdp796]. Even here scholars argue **sanctions were "at best a modest contribution"** relative to internal resistance, inefficiency, and the Soviet collapse [Yale cdp796; Hufbauer]. Sanctions **accelerated but did not author** a transition being driven by domestic forces.

**OPEC 1973 oil embargo.** Arab OPEC members embargoed the US, Netherlands, Portugal, and South Africa to punish support for Israel — a **"weaponization" of a strategic commodity by a coalition of producers**. It spiked prices, triggered stagflation, and **shifted global financial power toward oil producers** [State Dept. Office of the Historian]. This is the clearest real-world example of **chokepoint/commodity control as coercive leverage** against countries that *would otherwise be "too big to coerce."*

## 2.3 The core strategic principle: coercion, isolation, signalling

Real sanctions have three overlapping objectives:
1. **Coercion** — raise the target's cost until compliance looks better than defiance. Only works when **target cost exceeds target willingness** and there's an **off-ramp**.
2. **Isolation** — deny the target the resources/legitimacy to act (cut the war chest; delegitimize). 
3. **Signalling** — a visible statement that constitutes a *line in the sand* to allies, rivals, and domestic audiences (this is what even "symbolic" unilateral sanctions do).

**KEY FOR THE GAME — the diplomatic byproduct:** economic pressure is not a private economic act; it is a **diplomatic act with relationship consequences**:
- **Sanctioning a *friend* breaks trust.** If you embargo an ally, you are treating them with hostility regardless of your stated "reason." The alliance should strain or break, and your *other* allies should notice and trust you less.
- **A hostile act via economic war is near-war.** A blockade (physical interdiction) is broadly understood as an **act of aggression** approaching war — it should be a huge relation hit, possibly trigger alliance-defense obligations, and carry international-reputation costs.
- **Joining a sanctions coalition** aligns you with the sender and against the target — a signal that can pull your own relations with third parties (or pull you into the target's retaliation).

## 2.4 What this means for the game's embargo/boycott system

Mapping to `NationExecution`'s current `-20` embargo relation malus:
- **Boycotts/sanctions must weigh far heavier than a `-20` relation nudge** — the note's own open question. A sanction choosedly toward a friend should **strain/break the alliance** (with the "why?" question — a human-rights-style sanction vs. a hostile act), and should **demean the sanctioned party economically** (lost trade income, possibly lost production), not just one number.
- **Economic damage should hit the sanctioned nation** (lost `TradeShip`/`Train` gold, and ideally reduced production), **and optionally the sender** (modelling EU-Russia mutual pain for energy).
- **Coalition sanctions** (multiple allies coordinating) should be **stronger** than unilateral ones (real-world fact), rewarding coordination.
- **Secondary-style spread:** a powerful nation could sanction *third parties who keep trading with a target* — an advanced mechanic that models US secondary sanctions against India/China.
- **Off-ramp:** sanctions that can be lifted in exchange for behavior change are the realistic path to coercion — deterministic and testable.

---

# 3. ALLIANCE FORMATION, BREAKING & REPUTATION

## 3.1 How real alliances are structured

Real alliances are **mutual-defense pacts with treaty text** specifying when defense is owed. The canonical example is **NATO Article 5**: an armed attack on any member is considered an attack on all, and members will take "such action as it deems necessary" — including, in practice, military force [NATO; Belfer]. Two nuances that matter for the game:
- **Article 5 is not a blank check.** It is a *consultation and collective-responsibility* commitment, not an automatic full-mobilization guarantee — members decide what they deem necessary [Belfer; ODUMUNC]. This is why allies can be *allied* yet unevenly committed.
- **Article 5 has only been triggered once** (9/11, invoked for the US), despite being *threatened/considered* over cyberattacks and territorial disputes [Brennan; Belfer]. Deterrence — the *fear* that the pact will be honored — does most of the work; actually fighting is rare. Alliances are **deterrent instruments** first, warfighting institutions second.

## 3.2 Why alliances form

Classic political science: alliances form to **balance power** — weak states band together against a rising hegemon, or great powers recruit clients to deny terrain/resources to rivals. NATO (balancing the Soviet Union) is the archetype [Bush Center; Quincy]. But there are also **alliances of convenience** — transactional, interest-based partnerships (e.g., the USSR–Western Allies in WWII, or today's Russia–North Korea pact formed to get artillery/ammunition for Ukraine) [CRS IF12760]. And in the non-aligned middle there is **alignment without formal alliance**: India is *aligned* with the West on some axes and with Russia/China on others, without being treaty-bound to either — it is **"multi-aligned"** [Chatham House; 01-power-dynamics]. Alignment ≠ alliance: India trades and cooperates with both blocs and is not capturable by either.

## 3.3 Why alliances break

Alliances break when the **incentive to stay** erodes:
- **Abandonment** — a partner fails to come when called; the pact loses credibility and members drift.
- **Free-riding** — members enjoy the security umbrella without paying the cost; resentment builds (this is the modern NATO 2%-of-GDP debate).
- **Changing interests** — the threat that created the alliance fades or a partner's foreign policy diverges (e.g., Türkiye buying Russian S-400 while in NATO; Hungary keeping flexible ties with Moscow [ODUMUNC]).
- **Coercion/blackmail** — a partner is sanctioned or coerced into re-aligning.

## 3.4 The cost of betrayal

**Betraying an ally is reputational and strategic** — not just a one-game debuff. A state that abandons or attacks an ally signals to *every other potential partner* that pacts with it are worthless. This **deters future alliance formation** and invites pre-emptive distrust. In game terms: a traitor should be harder to ally with, and its aggression should be remembered — ideally *across games* (persistent reputation), which directly matches the note's open question: "a reputation/traitor system that persists between games (aggression and broken pacts follow you)."

Real-world examples: the **annexation of Crimea/Ukraine invasion** wrecked Russia's standing and galvanized NATO (treatment of a "guarantor of sovereignty" as an aggressor); the allied **bombing of Yugoslavia** (NATO acting against a non-member while formally outside its article) rung debates, but did not break NATO because Serbia wasn't a member. The sharp lesson: **breaking a pact with a *member* is the reputational killer; acting against a non-member is merely controversial.**

## 3.5 Mapping to the game

- The engine's model — **break alliance first (marks TRAITOR) then attack** — is sound and maps to "you cannot legally hurt a current ally." But the TRAITOR debuff is described as *time-limited*; realistic mode should make **betrayal reputational and remembered**, ideally persistently, so a traitor pays in *future* alliance offers.
- **Alliance formation should track balance-of-power**, not just warm feelings: nations should prefer aligning against a rising superpower and should be willing to ally with *somewhat-fresh* partners (alliances of convenience) when interests align — currently alliances require `relation >= Friendly`, which is reasonable but should allow "convenience alliances" at lower relation when a shared threat exists.
- Distinguish **alignment from alliance** (India model): a nation can be *aligned* (good trading/defense posture, passage rights) without a formal mutual-defense pact. This is design space for the passage/basing mechanic (§5).

---

# 4. COALITION & JOINT MILITARY ACTION

## 4.1 Coalitions of the willing vs. formal alliances

A **formal alliance** is a standing treaty (NATO). A **coalition of the willing** is an *ad hoc* grouping assembled for a specific operation, often crossing alliance lines. Real coalitions range from tightly integrated to loosely coordinated:

**Gulf War 1990–91 (Desert Storm).** The UN-authorized coalition to liberate Kuwait from Iraq — **~35 nations** under US command (CENTCOM's Schwarzkopf), including the US, UK, France, Saudi Arabia, Egypt, Syria, and even states with no formal Western alliance [History; Navy History; GAO]. Crucially it combined: (a) **combined command integration** (air campaign under unified ATO — Air Tasking Order), (b) **burden-sharing** — allied countries pledged ~**$54 billion in cash/in-kind support** to the US [GAO], and (c) **share of conquest/security goals** — restoring Kuwait's sovereignty rather than territorial grabs. ~**750,000 troops** of which ~540,000 US [History]. This is the archetype of a *large coalition fighting as one* without a prior formal mutual-defense pact.

**Afghanistan ISAF (2001–2014).** Up to **~50 allied/partner countries** in a UN-mandated coalition under ISAF to train/assist Afghan forces and counterterrorist groups [DCAS/OEF]. Shows **long-duration coalition sustainability** and the *training/arming of a host partner* (equipment, aid, basing) as coalition glue [DCAS].

**Modern NATO combined operations.** NATO's Allied Reaction Force (ARF) and Force Model embody forward staging and *integrated command* under a single SHAPE headquarters — allies fight under unified doctrine [NATO]. This is the "command integration" that makes many small contributors into one punch.

## 4.2 How allies actually fight together (vs. formal alliance)

- **Command integration** — a common operations plan (ATO), shared targeting, one commander. This is what makes 35 divergent militaries act as one. Without it, you have "alliance members who happen to fight the same enemy separately."
- **Burden-sharing / resource pooling** — cash, equipment, basing, logistics. Nations contribute asymmetric shares; the powerful carry the load and gain disproportionate influence [GAO; Brookings].
- **Cobelligerence** — fighting the same enemy *without* a formal pact (e.g., US/Soviet WWII; today's loose anti-Houthi naval grouping using Allies + regional navies). Allies and cobelligerents both contribute; only formal allies guarantee mutual defense.

## 4.3 Mapping to the game

The engine already lets allied nations **informally coordinate** — `AttackExecution` combines outgoing attacks on a shared target into one stack, and allied `NationNukeBehavior`/assist logic targets shared adversaries [08-notes]. The gap is **explicit, guaranteed coordination plus resource sharing**:
- **Joint-strike / coalition declarations** — an ally can accept a "join my attack on X" and their forces reinforce, in exchange for a **share of conquest gold/tiles** [the note's open question]. Real-world: combined operations with agreed spoils.
- **Coalition sanctions** (§2) — coordinated economic pressure by a bloc.
- **Burden-sharing** — a proxy for "rich ally subsidizes/equips a frontline partner," tying into donate-gold/troops and §7.

---

# 5. RIGHT OF PASSAGE, TRANSIT & BASING

## 5.1 The real mechanics

Real militaries cannot teleport through friendly airspace/territory; they need **transit/overflight/basing agreements**:

- **Basing agreements** — the US maintains ~**750–800 base sites in ~80 countries**, compiled via bilateral executive agreements, typically *separate from any alliance treaty* (with SOFAs — status-of-forces agreements — governing legal jurisdiction) [CRS R48123; Overseas Basing Coalition]. Bases give **power projection**: a forward base lets you stage, refuel, and respond far from home. This is why the US "footprint" is a cornerstone of its strategy [CRS R48123].
- **Transit & overflight rights** — permission to *move* forces/aircraft through or over a third country without basing there. Often granted to allies but also to cobelligerents; can be one-way, conditional, or revocable.
- **Russian basing in Syria/Belarus/Kyrgyzstan** and **Chinese Djibouti base** show that even rival blocs project power through host states via basing agreements [Wikipedia overseas bases].
- **"Cobelligerence"** — granting passage/basing because you're fighting the same enemy, even without a formal pact.

**Operational significance:** **basing = power projection.** A country that can't cross an ally's land to reach a far enemy is functionally distant; a country with forward bases in an ally can project into an entire region. This is exactly the note's §4 gap: *"You cannot move/attack THROUGH an ally's territory to reach a far enemy."*

## 5.2 Allying vs. simply granting passage

These are distinct diplomatic acts with different costs/values:
- **Alliance** = mutual defense (high commitment, high value, high risk).
- **Passage/basing** = a *narrower* grant of transit rights (medium commitment). You can grant passage to a cobelligerent or an aligned-but-not-allied power without committing to defend them.
- A state that **grants passage costs itself something** — sovereignty, security risk, and (with basing) the risk of being dragged into the user's wars. So passage should be a **grant with a price (influence/reputation) and revocability**, not a free rider on alliance.

## 5.3 The interaction with ownership (engine-specific)

The note is explicit: terrain ownership is exclusive; allied land is not traversable; conventional ground/boat movement and land attacks cannot route through a non-attacking ally's territory [08-notes]. Nuclear overflight already ignores ownership [08-notes]. So the *conventional* transit is the gap.

A `passage` grant must: (a) allow **attacks to cross ally land** to reach targets *beyond* without (b) **capturing the ally's tiles** at the border. This is a distinct behavior from conquering — effectively a "through-route" that preserves the ally's ownership.

---

# 6. STRATEGIC RESOURCES & CHOKEPOINTS

## 6.1 Why chokepoints matter

A **chokepoint** is a narrow strait/canal through which a disproportionate share of trade must pass. Control of a chokepoint = **leverage over everyone who uses it** — you can tax, delay, or deny their commerce. The headline numbers [EIA; The Conversation; Al Jazeera; aa.com.tr]:

- **Strait of Hormuz** (Persian Gulf → Gulf of Oman): ~**20%+ of global oil and LNG exports** pass through; ~20–23M barrels/day — with **no viable alternative route** for Gulf producers, making it the world's most critical energy chokepoint [Britannica; The Conversation]. ~80–90% of its oil goes to Asia (China, India, Japan, Korea) [Britannica; The Conversation].
- **Strait of Malacca** (between Malaysia/Indonesia): the busiest shipping lane — **~24% of global seaborne trade, ~45% of seaborne crude oil**; the primary gateway for China/Japan/Korea energy imports; **~80% of China's oil imports** pass through — Beijing's famous "**Malacca dilemma**" [The Conversation; Al Jazeera; aa].
- **Suez Canal / Bab-el-Mandeb (Red Sea)**: ~10–12% of global seaborne trade, ~30% of containerized trade transits the Red Sea; Suez cuts ~10+ days off Asia–Europe voyages [The Conversation; ITF-OECD]. Bab el-Mandeb is the southern gate of the Red Sea.
- **Panama Canal**: key Atlantic–Pacific connector; a 2023–24 drought cut its capacity by a third — showing even *natural* closure has global consequences [AITimeline].

## 6.2 Real interdiction events and their global bite

- **Iran threatening Hormuz (2019 and 2024–26).** Even the *threat* of closing Hormuz spikes oil prices and reroutes traffic; Iran has periodically harassed tankers. In the 2026 Iran war, ~90% of Hormuz traffic was diverted away from hostilities, rising above 95% when Iran threatened ships — a near-total disruption of a chokepoint carrying 20%+ of global oil [Britannica 2026]. Note the UAE can divert some via its Fujairah port on the Gulf of Oman — a real "backup route" that blunts a full closure [Britannica].
- **Houthi Red Sea attacks (2023–26).** Starting Nov 2023, Houthi attacks near Bab el-Mandeb forced most container lines to reroute around the **Cape of Good Hope** — adding ~3,000–3,500 nm and 7–14 days per Asia–Europe voyage [AITimeline; Red Team]. Consequences: **Suez trade volume fell ~50%** in early 2024; Shanghai–Europe spot rates **rose ~256%**; Egypt lost **~$6B in canal revenue in 2024**; container traffic through the Red Sea fell dramatically [AITimeline; Wikipedia; IMF/UNCTAD via AITimeline; CFR]. Oil shipments through the Red Sea fell from ~9.3M to ~4.1M bpd [CFR]. By 2026 Bab el-Mandeb transits were still ~half the pre-attack level [AITimeline]. This is a *non-state actor* (with Iranian backing) inflicting outsized global economic damage by threatening one chokepoint.

**The strategic dictum:** chokepoint control lets a small/poor actor (the Houthis, Iran) impose huge costs on much bigger powers (China, Europe, the US) — an **asymmetric "force multiplier."** Conversely, a naval power can defend a chokepoint (keeping Hormuz/Malacca open) as a public good that cements its role.

## 6.3 Strategic resources

Beyond chokepoints, **who has the resource** matters:
- **Energy** — reserves create revenue and leverage (Russia, Gulf, OPEC 1973).
- **Rare earths / critical minerals** — China's dominant share is a strategic lever over global manufacturing.
- **Food** — net food exporters (grains) have leverage over importers.
- **Fresh water** — a regional coercive lever (dams, Nile/Euphrates) though outside this doc's core.

The game has **no resource terrain today** — that is the note's explicit gap ("The game has no resource terrain"). Chokepoint value (sea-strait control) is achievable *cheaper* than full resource terrain, because chokepoints are geographic rather than distributed-node economics.

## 6.4 Mapping to the game

- **Chokepoint value is cheap to add** because it's geographic: specific straits (map edges / narrow water tiles) are pre-weighted as high-strategic-value. Controlling a chokepoint gives **leverage over trade passing through it** — you can tax/toll or interdiction-attack commerce transiting it (modelling Hormuz/Malacca/Suez). This directly rewards map control and creates "why is that tile worth fighting over."
- **Strategic resources as terrain** is a **larger** addition (new tile concept, spawn/density, ownership) — a ton of engine work, best staged after chokepoints.

---

# 7. ECONOMIC POWER PROJECTION — CURRENCY, DEBT, AID, INVESTMENT

## 7.1 Currency / financial hegemony

The **US dollar** is the world's dominant reserve and trade currency; dollar-denominated debt and markets give the US **"weaponized interdependence"** — the ability to cut a target off from the global financial system (dollar clearing, SWIFT) and to freeze reserves (as with Russia's ~$300B). Even China's BRI loans are **largely dollar-denominated**, and China explicitly worries about "sanctions-proofing" its own access to dollar markets [Carnegie "China's Dollar Dilemma"]. Financial hegemony is an **economic power-projection weapon**: being the currency of the world lets you tax/target the world's financial plumbing.

## 7.2 Debt, aid, and development finance

- **China's Belt and Road Initiative (BRI)** — a ~**$1 trillion+** infrastructure program larger than 8× the Marshall Plan [CSIS]. Critics call it "**debt-trap diplomacy**" — loans that burden nations and open them to Chinese leverage; scholars dispute the "trap" narrative but agree it gives **China economic leverage** and dependency relationships [Chatham House; Wilson Center; CFR; Brautigam]. ~80% of China's government loans to developing countries have gone to nations in **debt distress** [Wilson Center]. Whether or not it's a deliberate trap, **providing cheap financing buys influence**.
- **Lend-lease / military aid** — the WWII Lend-Lease Act and the 2022 **Ukraine Democracy Defense Lend-Lease Act** let the US lend/lease military equipment to vital partners, expediting arms without cash-up-front [millermeeks.house.gov; war.gov]. Cold War Marshall Plan (aid as influence) is the archetype of **wealth-converted-to-influence**.
- **Ukraine aid (2022–2026)** — over **50 countries** coordinated; mostly-Western pledges reached **~$360B (€309B)**, including ~€149B direct military assistance [Wikipedia foreign involvement; State Dept]. The US alone committed over $195B in aid, on top of a $20B loan backstopped by frozen Russian assets [CFR]. **Massive wealth transfer = deep dependency + alliance cohesion.** This is the modern, largest-scale example of "rich allies buy a partner's survival and loyalty."

## 7.3 Subsidies and FDI

- **Foreign direct investment (FDI)** creates long-term economic intertwinement and dependency (China's FDI in Africa/SE Asia; US PE in China fell from $140B to under $1B as trust deteriorated — a *negative* projection [CRS IF11284]). FDI is sticky economic influence.
- **Subsidies/grants** — direct cash keeps a client economy afloat and loyal (analogous to the game's *donate-gold*).

## 7.4 Mapping to the game

- **Wealth → influence/dependency** is the core mapping. The game already has *donate-gold/troops*; realistic mode should make **aid create dependency**: giving a partner sustained relief builds/locks loyalty (relation), and withholding it strains the relationship.
- **Debt/aid as coercion** — loans with conditions, and leverage when they can't be repaid, models both BRI-style influence and "allies keep a partner afloat" [08-notes' "the game has donate-gold/troops"].
- **Aid as alliance glue** — nations that subsidize a frontline ally (like the US+Ukraine) cement the alliance; cutting aid is a coercive lever and an abandonment signal.
- **Financial/capital access** is harder to model directly (no banking layer) — this overlaps sanitation (SWIFT-style financial exclusion = strong trade embargo) and is best represented *as* an extreme economic-embargo tier rather than a distinct mechanic.

---

# 8. GAME IMPLICATIONS — CONCRETE, PRIORITIZED DESIGN PROPOSALS

> **Reading key.** Each proposal: **(fact)** the real-world fact it models; **(map)** how it maps to the existing named engine systems; **(det/test)** the deterministic + testable behavior; **(V/E)** value-to-effort ranking (★ low effort–high value … ★★★★★ high effort); **(status)** = **known-how** (we already know exactly how to build it), **needs-design** (needs a design decision before coding), or **complex** (real architecture risk).

---

## 8.1 (a) **Relation-scaled trade** — allies get best rates, neutrals a tariff, rivals embargoed unless a strategic exemption

- **Status:** known-how (data & logic exist) • **V/E:** ★★★★
- **(fact)** Real trade follows comparative advantage, not alliance lines — US~China trade ~$414B *between* rivals; India buys 35–40% of its oil from a sanctioned Russia; allies/neutrals/rivals all trade at differentiated prices [USTR; BBC; Dallas Fed]. Trade is price/relation-graded, not binary.
- **(map)** Replace the hard `Player.canTrade(neighbor)` on/off with a **trade-efficiency/multiplier ladder keyed to relation tier**, applied to the gold generated by `TradeShip` (ports→gold) and `Train`/rail (factories→gold). `relation` already exists as a tiered value (`HOSTILE…ALLY`). Today "allies/neutrals/rivals trade at the same flat rates unless embargoed" — add a tier multiplier:
  - `ALLY`/`FRIENDLY` → full rate (×1.0)
  - `NEUTRAL` → tariffed (e.g. ×0.7)
  - `TENSE` → heavy tariff (e.g. ×0.4)
  - `HOSTILE` → no trade by default (embargo), **unless** a strategic exemption applies (§8.1 next bullet).
- **(det/test)** Define a pure function `tradeMultiplier(relationTier, strategicExemption?) → number`. Test: (a) ALLY yields more gold than NEUTRAL for the same ship/train; (b) HOSTILE with no exemption yields 0; (c) HOSTILE with an energy/strategic exemption yields the tariffed (TENSE) rate; (d) `isRealisticWorld` off ⇒ always ×1.0 (classic behavior preserved).
- **Design note.** Keep it a *multiplier on existing trade gold*, not new systems — cheapest, highest immediate payoff, directly answers the note's open question #1 ("Trade value/tariff gated by relation tier").

### 8.1a — Strategic / energy exemption carve-out
- **Status:** known-how (bool flag + config) • **V/E:** ★★★
- **(fact)** Sanctions intentionally carry holes: the G7 price cap kept Russian oil flowing; Iran sanctions exempted medicines [HKS/Treasury; Wikipedia Iran]. Strategic dependence (energy, food) means even embargos can't fully cut some flows.
- **(map)** Add a per-good-category toggle: `TradeGood.energy` (and optionally `food`) can be flagged **embargo-resistant** so that a `HOSTILE` nation with a port/factory can still trade it at the tariffed rate, unless an even-harder "total blockade" applies.
- **(det/test)** `canTrade(neighbor, good)`: returns true for embargo-resisting goods at a reduced multiplier. Test: HOSTILE oil port still produces *some* gold; ALLY oil produces the full rate; a blockade (below) zeroes it.
- **Design note.** This models EU-Russia/iIndia-Russia "can't quit the dependency overnight" — and it makes **controlling the resource producer** (or forcing a total blockade) the way to truly cut someone off.

---

## 8.2 (b) **Trade value by alliance alignment** — deeper rewards for bloc alignment

- **Status:** needs-design (needs the alignment concept) • **V/E:** ★★★
- **(fact)** While rivals trade, **trading inside a bloc is deeper and cheaper** — integrated supply chains, free-trade agreements, and reduced transaction/logistics cost make intra-bloc commerce more efficient (EU single market; NAFTA-USMCA). Sanctions also *rewire* flows *toward* blocs (US-China diversion to SE Asia/other) [PAAlAulA; The Conversation].
- **(map)** Add an **alignment bonus** on top of §8.1: if two nations are formal allies (or share a sanction/security treaty), their mutual trade gold is boosted (×1.15–1.25). This rewards forming blocs — "trade intensity rewards alliance alignment," directly the note's open question.
- **(det/test)** `tradeMultiplier = baseTier(relation) × (allied ? alignmentBonus : 1)`. Test: two ALLY nations trade > two NEUTRAL nations at the same base tier; the bonus is deterministic and symmetric.
- **(status note)** Needs the "alignment vs alliance" concept named — reusable for passage/basing (§8.8) and coalitions (§8.4).

---

## 8.3 (c) **Boycotts/sanctions that genuinely damage the target — and strain/break alliances + optional sender cost**

- **Status:** needs-design (heavy balance + off-ramp decisions) • **V/E:** ★★★★★ (highest value, real effort)
- **(fact)** Sanctions are coercive economic warfare with a real cost to the target *and often* the sender, and they carry relationship consequences: sanctioning a friend breaks trust; a blockade is near-war; Iran/Russia case studies show sanctions "hurt but don't always comply," and off-ramps matter [CRS; PIIE; Dallas Fed; ScienceDirect].
- **(map)**
  1. **Target economic damage:** while an embargo is active, the target's `TradeShip`/`Train` gold is reduced by a percentage (the "sanctioned economy"), beyond the §8.1 rate — modelling lost trade income. Optionally reduce `goldAdditionRate` for the target (income-rate hit, per note's open question #0).
  2. **Sender cost (optional, on "hard" sanction types):** cutting an *energy/dependency* good hurts the sender too (modelling EU-Russia) — a config flag `embargoHurtsSender`.
  3. **Diplomatic byproduct:** replace the weak `-20` `handleEmbargoesToHostileNations` nudge with a **sanctions-based relation shock**: embargoing a `FRIENDLY`/`ALLY` statically **strains or breaks the alliance** (a "why?" classification — see §8.3a), and a **blockade** is a near-war hostile act (large relation drop, may trigger alliance-defense support for the target).
- **(det/test)** `applySanction(sender, target, tier)`: computes target gold-loss %, optional sender-loss %, and a relation/alliance delta. Tests: (a) embargo reduces target's recorded trade-gold by the configured %; (b) embargo of an ally breaks the alliance and drops sender's reputation (§8.5); (c) with `embargoHurtsSender`, both sides' income drop; (d) a lifted embargo restores gold but **not** the ruptured alliance/reputation (asymmetric — you can't undo a betrayal by lifting a sanction).
- **(design decision)** Introduce a **sanction "reason" taxonomy** to govern the diplomatic byproduct: e.g. `HUMANITARIAN/LEGITIMACY` (public-defensible, bigger reputation reward, less alliance-breaking among *like-minded* third parties) vs. `HOSTILE/ECONOMIC-WAR` (no legitimacy, breaks even friendly ties). This is the "why?" the note asks for. **needs-design.**

### 8.3a — Off-ramp for sanctions
- **(status)** needs-design • **(V/E)** ★★★
- **(fact)** Iran yielded at the JCPOA when sanctions offered an off-ramp; maximum pressure with no path to relief produced *more* nuclear breakout [PIIE; CRS; DU thesis]. Sanctions coerce only with a path to relief.
- **(map)** Sanctions carry a **condition** (e.g., "lift embargo when target relation reaches X or accepts [event/behavior], or after N ticks"). Deterministic, testable, and it makes sanctions a *negotiation lever*, not a permanent wall.
- **(det/test)** `sanctionOffRamp(sanction) → Boolean` reached; lifting restores trade but not reputation.

---

## 8.4 (d) **Coalition sanctions & boycotts** — coordinated pressure is stronger

- **Status:** known-how/needs-design (byproduct calc; no new world state) • **V/E:** ★★★★
- **(fact)** Multilateral sanctions are reliably more effective than unilateral (PIIE: "more likely to succeed when enforced through international cooperation"); breadth + enforcement matter [PIIE; Hufbauer]. Isolation is the goal — the more partners the target loses, the less it can resist.
- **(map)** When **2+ allies** each sanction the *same* target, the target's gold-loss %) and the diplomatic signal increase (e.g., each additional coalition member adds a stackable penalty up to a cap). This is a cheap, natural outgrowth of §8.3 that doesn't require a new pact system — it's just *counting concurrent embargoes* in `NationExecution`. Rewards the natural coalition clustering the game already encourages.
- **(det/test)** `sanctionDamage(target) = base × (1 + 0.25×(numCoalitionSenders −1))` capped. Test that two senders hurt more than one, deterministically; and that a lone embargo is much weaker — modelling why unilateral coercion (Cuba) fails.

---

## 8.5 (e) **Persistent reputation & betrayal system**

- **Status:** needs-design (persistence layer) • **V/E:** ★★★★ (cheap-ish, huge strategic payoff)
- **(fact)** Betraying/abandoning an ally is reputational: it deters future alliance offers and invites pre-emptive distrust (the note asks for a traitor system that persists between games) [Bush Center; Chatham House; 08-notes]. Treaties demand follow-through.
- **(map)** Add a **reputation score per nation** (`NationReputation`) that persists across games (persisted per-player ID or nation ID), tracking:
  - **Betrayal** (breaking an alliance then attacking; abandoning an ally under attack) → big negative.
  - **Aggression / unprovoked war** → negative (models "unprovoked aggression carries a global-opinion penalty" from note §5 checklist).
  - **Reliability** (honoring alliances, defending allies, keeping sanction off-ramps) → positive.
- Reputation gates **future alliance offers** (`allianceRequest` acceptance knock), **trade rates** (§8.1 base), and **coalition invitations** (§8.4) — a traitor is a worse partner in every future game, exactly the real deterrent.
- **(det/test)** `reputationDelta(event, nation)` pure function; `bilateralTrust(a,b) = f(a.reputation, b.reputation)`. Tests: attacker-of-ally gets persistent penalty visible to all; high-rep nations get easier alliance/trade; the score is persisted (a new game sees the old value) and clamped.
- **(design decision)** Decide persistence scope (per-player vs. per-nation, global vs. per-map-profile) — **needs-design.** Keep it optional behind `isRealisticWorld` and a config "persistence" toggle so casual modes stay clean.

---

## 8.6 (f) **Joint coalition war declarations / combined attacks**

- **Status:** needs-design/known-how (extends existing informal stacking) • **V/E:** ★★★★ (leverages existing combined-attack logic)
- **(fact)** Coalitions of the willing fight as one via combined operations and agreed spoils — Gulf War (~35 nations, $54B burden-sharing, unified air tasking), ISAF (~50 countries), NATO integrated command [History; GAO; DCAS; NATO]. Burden-sharing and shared conquest-goals are the glue.
- **(map)** Extend the current *informal* stacking in `AttackExecution` (outgoing attacks on the same target combine) into an **explicit "join coalition attack" diplomatic action**:
  - A nation initiates a war declaration / attack campaign on target X and **invites allies**.
  - Accepting allies' attacking forces **reinforce** the combined stack (models command integration & combined ops).
  - **Spoils sharing:** each contributor claims a deterministic share of conquered gold/tiles (models burden-sharing / the note's "a share of conquest gold/tiles").
  - A formal **coalition declaration** makes all members drop to `HOSTILE` with the target and auto-sanction it (ties §8.4), so it's a *declared* joint commitment, not just opportunistic stacking.
- **(det/test)** `coalitionAttack(initiator, target, contributors)` resolves to a combined force size and a deterministic gold/tile split. Tests: (a) 3 allied contributors produce a bigger combined stack than any single; (b) the gold split sums to 100% and is deterministic; (c) a declared coalition sets all members HOSTILE vs. target and auto-embargoes (coalition sanctioning).
- **(design decision)** How spoils are split (equal per-force-share vs. initiator-favored vs. negotiated) — **needs-design** and is the main balance knob.

---

## 8.7 (g) **Right-of-passage / basing mechanic**

- **Status:** needs-design (interacts with ownership) • **V/E:** ★★★★★ (fills the note's biggest gap, real architecture)
- **(engine note)** Attacks no longer route through allied land implicitly. The earlier multi-hop passage was removed; an explicit grant below is the only intended route.
- **(fact)** Militaries need transit/overflight/basing agreements; US basing (~750 sites in ~80 countries) is the engine of power projection; basing/transit is separate from alliance (can grant to cobelligerents) and costs the host; basing = power projection [CRS R48123; overseasbases.net; Wikipedia]. Iran/Russia/China project through host states.
- **(map)** Introduce a **`passage` diplomatic grant** (separate from alliance):
  - **Grant types:** `TRANSIT` (one-way movement/attack *through* a nation's territory to targets beyond) and `BASE` (a forward staging point granting extended reach / local regeneration boost).
  - **Ownership interaction (the hard part):** passage must let an attacker **route ground/boat attacks across the granting nation's tiles without capturing them** — i.e., a "through-route" that preserves the host's ownership. This is the note's explicit mechanic: *"right-of-passage letting an ally move/attack through your territory without conquering it."*
  - **Conditions & cost:** grants are **revocable**, may be **reciprocal or one-way**, and cost the host **influence/reputation** to grant (you're surrendering sovereignty) — §8.5 reputation can price this.
  - **Revocation/abuse:** if the grantee attacks the host or the host revokes mid-war, forces in transit are expelled/eliminated — a deterministic resolution rule so passage can't be exploited to "park" armies.
  - Nuclear overflight **already ignores ownership** [08-notes], so this is purely conventional.
- **(det/test)** `passageAllowsRoute(A, B, path)` — a path-finding predicate that lets A's attack-reach a target beyond B while leaving B's border tiles owned by B. Tests: (a) A can attack a target beyond B with passage and B's tiles are untouched; (b) without passage A cannot route; (c) revoking passage ejects A's in-transit forces; (d) a `BASE` grant grants a bounded reach/regen buff. Classic mode unchanged.
- **(status note)** The **pathing/ownership** interaction is the complex part; **needs-design** before coding. This is the single most strategy-rich addition.

---

## 8.8 (h) **Strategic resources & chokepoint value**

- **Status (chokepoints):** needs-design/known-how if done geographically • **Status (resource terrain):** complex • **V/E:** chokepoints ★★★★, full resource-terrain ★★★★★

### 8.8a — Chokepoint commercial/toll leverage (cheaper, geographic)
- **(fact)** Hormuz ~20%+ of global oil & LNG; Malacca ~24% of seaborne trade / ~45% of seaborne crude / ~80% of China's oil; Suez/Bab-el-Mandeb ~10–12% of seaborne trade & ~30% of containers; Houthi attacks cut Red Sea oil from 9.3→4.1M bpd and spiked rates 256% [Britannica; The Conversation; AITimeline; CFR]. Control of a chokepoint = leverage over everyone using it.
- **(map)** Mark specific map water tiles as **chokepoints** (narrow straits on the world map). The nation controlling a chokepoint's land/water obtains:
  1. **Toll income** — a % of passing trade gold (a new passive income, deterministic per transit).
  2. **Interdiction** — the ability to **attack/tax transit commerce** (interdict enemy trade-ships/factories routed through), reusing existing attack/trade structures.
  This makes chokepoints **strategically valuable, deterministic property** — "why is that strait worth fighting over" — exactly what the note's checklist calls for ("cutting an enemy's oil via controlling a strait").
- **(det/test)** `chokepointControl(owner, strait)` grants passive toll gold per transit and an `interdict(strait, enemyShip)` action. Tests: control grants toll; losing control removes toll; interdiction reduces the enemy's trade gold by the configured %, deterministically.
- **(status note)** Depends on the world map having identifiable straits — needs a **map-data pass** (from `05-terrain-and-geography.md`) to tag strait tiles, hence **needs-design** on data, **known-how** on the mechanic.

### 8.8b — Strategic resources as terrain (larger)
- **(fact)** Energy/minerals/rare-earths and food create asymmetrical dependence and leverage (OPEC 1973; China's rare earths; Russia's energy) [Office Historian; 01-notes].
- **(map)** Add a **resource tile/node layer** (energy, minerals/rare-earths, food) with ownership; resources gate production bonuses (factories produce more gold / units need energy) and are tradeable as `TradeGood` with the §8.1 tiers. **Introduced only after 8.8a** because it's a new tile concept touching `Config`, map generation, ownership, and production — a full pass.
- **(det/test)** `resourceYield(owner, resourceType)` and `resourceProductionBonus(owner)` are pure functions over owned resource tiles; tests confirm ownership→yield→(optional) dependency = factory/unit penalties if a nation lacks a required resource.
- **(status)** **complex** — new terrain/ownership/economy systems. Staged last.

---

## 8.9 Cross-cutting game-design summary (prioritized)

**Do now (cheap, high value, `isRealisticWorld`-gated):**
1. **8.1 relation-scaled trade** — replace flat trade with relation-tier multipliers + strategic exemption. *(known-how)*
2. **8.4 coalition sanctions** — stackable embargo damage when allies coordinate. *(known-how)*
3. **8.2 alignment bonus** — intra-bloc trade bonus (needs the alignment concept, reusable later). *(needs-design)*

**Do next (core strategy depth):**
4. **8.3 real boycott damage + diplomatic byproduct (why? taxonomy, sender-cost toggle, off-ramp).** *(needs-design)*
5. **8.7 right-of-passage / basing.** *(needs-design — biggest gap, real pathing work)*
6. **8.6 joint coalition declarations + spoils sharing** (extends existing combined-attack logic). *(needs-design)*

**Do later (reputation + world richness):**
7. **8.5 persistent reputation/betrayal** across games. *(needs-design — cheap persistence layer, high payoff)*
8. **8.8a chokepoint toll/interdiction** (after a map strait-tagging pass). *(needs-design data, known-how mechanic)*
9. **8.8b full strategic-resource terrain.** *(complex — staged last)*

### Guardrails (from the repo rules and `08-game-dynamics-notes.md`):
- **All changes gated behind `isRealisticWorld`** — classic mode stays flat-trade, flat-relation, no passage.
- **Deterministic & testable** — every proposal above is a pure function over existing state (`relation`, `canTrade`, `AttackExecution`, `EngineConfig`) with explicit tests.
- **Dampen power** — like the existing `RealisticWorld` log/power curves, don't let bloc-alignment + trade + chokepoints make the US/China an *unbeatable wall*; cap bonuses (e.g., alignment bonus caps, coalition penalty caps, reputation clamped) so tactic stays fun.
- **Don't snowball** — reputation/sanctions/passage should create *interesting trade-offs*, not permanent death spirals; keep off-ramps (8.3a) and revocability (8.7) so every state is recoverable.

---

## Appendix A — Quick citation index (for versioning)

- **US–China trade:** USTR (goods trade $414.6B, 2025); CFR (43% global GDP, $200B+ deficit, compensation); CRS IF11284; PAAlAulA (47.5% tariff); Statista.
- **EU–Russia energy:** Brookings (>40% gas pre-2022); wiiw (80–100% dependency); Consilium (40%→6% by 2025); Bruegel (Russia can't reroute east); IEA (2022 crisis); ScienceDirect (sender cost doubles on gas).
- **India–Russia oil:** BBC (35–40% of imports 2024, "best deal"); Al Jazeera; SPF (1%→36% market share); Nikkei (can't quickly replace; Graham Act 100% tariffs); Dallas Fed ($32/bbl discount).
- **Russia sanctions/price cap:** Treasury (progress report); Harvard HKS (cap mechanics); Wikipedia (revenue −60% duty); CSIS (enforcement challenges, shadow fleet); CRS.
- **Iran sanctions:** PIIE (multilateral success + JCPOA off-ramp); CRS IF12452; BBC; ScienceDirect (middle class); DU thesis (max pressure → more breakout).
- **South Africa/Cuba/OPEC:** Wikipedia apartheid; Yale cdp796 (sanctions "modest contribution"); Independent.org; Office of the Historian (1973 embargo); Verfassungsblog (2026 Cuba fuel blockade).
- **Alliances/NATO:** NATO (Art 5, ARF); Belfer (Art 5 explained, invoked once); Brennan (invoked once); Bush Center; Quincy (balance of power, burden-sharing).
- **Coalitions:** History/Navy History/GAO (Gulf War 35 nations, $54B); DCAS (ISAF ~50 countries); NATO.
- **Basing/transit:** CRS R48123 (US basing, SOFA); overseasbases.net (750 sites/80 countries); Wikipedia (overseas basing).
- **Chokepoints:** Britannica (Hormuz ~20M bbl/d, 20%+ oil/LNG); The Conversation (Hormuz 39% seaborne crude, Malacca 24% seaborne trade & 45% crude, Suez 10–12%); aa.com.tr (Malacca largest 2025, 22% demand); AITimeline (Red Sea reroute costs, Suez revenue, rates +256%); ITF-OECD (Red Sea 14% trade, 30% containers); CFR (Red Sea oil 9.3→4.1M bpd); EIA.
- **Economic power:** Carnegie (dollar hegemony, China's dilemma); CSIS (BRI $1T, 8× Marshall Plan); Wilson Center (80% debt distress); Chatham House (debt-trap myth); CFR (BRI findings); millermeeks/War.gov (Ukraine Lend-Lease); Wikipedia foreign involvement (€309B aid, 50+ countries); State Dept (FY2025).

---

*End of research document. All game-engineering specifics are proposals to be validated against `packages/engine` internals during implementation; nothing here is game code.*
