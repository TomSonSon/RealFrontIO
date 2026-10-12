# Real-World Realism — Power Dynamics & Alliances (2025–2026)

> **Scope.** This document is the research foundation for the "World" map's **starting relations** in *OpenFront* (a turn-based RTS fork of *WarFront.io* simulating nations on a real world map). It inventories the **2025–2026** great-power alignment, the formal **defense/alliance blocs**, the **active & frozen conflicts** that shape that alignment, and a **relationship matrix** that translates directly into in-game starting stances (`ALLY / FRIENDLY / NEUTRAL / TENSE / HOSTILE`).
>
> **Method.** Grounded in open-source reporting current as of **October 2026** (ISW/UnderstandingWar, CFR Global Conflict Tracker, CRS/Congress.gov, NATO, Chatham House, 38North, Reuters, and mainstream news, all dated inline). Where a fact is time-sensitive or contested, that is flagged so the game design can be versioned.
>
> **Headline context (the world of October 2026):**
> - A **second Trump administration** is in the White House, pursuing deal-brokering (Russia–Ukraine energy ceasefire, India–Pakistan ceasefire, Iran war ceasefire) alongside a more coercive posture on proliferation (strikes on Iran; capture of Venezuela's Maduro).
> - A **2026 Iran war** (US + Israel vs. Iran) escalated in Feb 2026 — killing Supreme Leader Khamenei — and de-escalated via a Pakistan-mediated ceasefire in April and a US–Iran ceasefire in June 2026; the US conflict formally lapsed in Aug 2026, with possible renewed strikes in play (Oct 2026).
> - **Russia's war in Ukraine** grinds on as an attritional stalemate; an **energy ceasefire** was brokered 11 Oct 2026. North Korea deploys troops/munitions for Russia.
> - The **Beijing-brokered Iran–Saudi détente is strained** but formally reaffirmed (Oct 2026).
> - A **2026 Afghanistan–Pakistan open war** and renewed **South China Sea** clashes show the Indo-Pacific and Central/South Asia remain the hottest fault lines.

---

## 1. OVERVIEW — HOW THE GREAT POWERS ALIGN

The 2025–2026 world is best understood as **three concentric circles of alignment** rather than the clean bipolar blocs of the Cold War:

### 1.1 The "US-led" order (democratic / rules-based / maritime)
At the core is the **US alliance network**, both in the Atlantic (NATO, now 32 members) and the Pacific (bilateral treaties with Japan, South Korea; ANZUS/AUKUS with Australia; enhanced engagement with the Philippines; Five Eyes intelligence-sharing; the Quad). This is the densest, most treaty-bound bloc, and it has expanded since 2022 (Finland 2023, Sweden 2024 into NATO; the 2023 Camp David trilateral and 2026 Japan–Philippines–US trilateral in the Pacific). [CRS IF10472; NATO; State Dept. 2026]
**Strain:** The Trump presidency injects uncertainty — transactional trade policy, "America First" financing of allies, and personal diplomacy with adversaries (talk of direct Trump–Kim talks, engagement with Putin) create friction within alliances even as the treaty structures persist. [Commons Library 2026; 38North Oct 2026]

### 1.2 The "Russia–China" order (authoritarian / land-power / anti-Western)
Russia and China have a declared **"no limits" strategic partnership** without a formal mutual-defense treaty, but Russia has built **harder military pacts on its flanks**: a mutual-defense treaty with North Korea (June 2024), a strategic-partnership treaty with Iran (Jan 2025), and the CSTO (weakened by Armenia's departure). Russia–China–North Korea function as a **de facto axis** in practice. [CRS IF12760; RAND RRA5044-1; Asia Society 2026]
China leads the looser **SCO** and **BRICS+** platforms, which are economic/diplomatic clubs — *not* defense pacts — and which notably contain members hostile to each other (e.g., India and Pakistan are both in the SCO).

### 1.3 The "non-aligned middle" (self-interest / hedging / multi-alignment)
A large group — **India, Türkiye, Saudi Arabia/Gulf states, Brazil, South Africa, Indonesia, Egypt, the Sahel AES juntas** — actively hedges. India is a member of the Quad *and* BRICS/SCO, buys arms from both Russia and the West, and co-founded the "Global South" framing. Türkiye is a NATO member that also bought the Russian S-400 and coordinates with Russia in Syria. The Gulf states maintain US security guarantees while diversifying to China and holding multiple dialogue channels with Iran. [Chatham House Apr 2025; MEI 2026]
After the 2026 Iran war, the Middle East split hardened toward a **US–Israel–Sunni-Gulf axis vs. a weakened Iran** that increasingly leans on Russia — while Saudi–Iran channels remain formally alive. [INSS Feb 2026; Iran Dossier Sep 2026]

**Strategic shorthand for the game:** the biggest single in-game dynamic is **US/NATO-anchored bloc vs. Russia–China–NK–Iran cluster**, with a large, swingable middle that can tilt either way. Anyone who assigns these "middle" powers a hard start-alignment should ideally give them a *neutral* baseline with deterministic drift toward their treaty partners.

### 1.4 Chronology — how the 2025–26 map was built (for narrative/events pacing)
A compressed timeline of the alliance-shaping events a scenario designer can mirror as in-game "world events":

- **Feb 2022:** Russia's full-scale invasion of Ukraine → NATO revitalized; Finland/Sweden begin accession; German Zeitenwende; EU defense awakening. [NATO; Commons]
- **Mar 2023:** **China brokered an Iran–Saudi normalization (Beijing Agreement)** — reopening embassies, ending a 2016 rupture. [MFA China]
- **Apr 2023:** **Finland joins NATO** (31st). [NATO]
- **Aug 2023:** **Camp David trilateral** — US–Japan–South Korea pledge collective-crisis consultation. [State Dept]
- **Sep 2023:** Azerbaijan takes **Nagorno-Karabakh**; ~100k Armenians flee; Russia (CSTO) fails Armenia. [CFR]
- **Apr 2024 (dep.) / Mar 2024:** **Sweden joins NATO** (32nd). [NATO]
- **19 Jun 2024:** Russia–North Korea **Treaty on Comprehensive Strategic Partnership** (mutual defense). [CRS IF12760]
- **2024:** Caucasus — Armenia suspends CSTO (announces withdrawal). [Jamestown]
- **Oct 2024:** India–China **Ladakh disengagement deal** (BRICS-flavored). [MEA; Chatham]
- **Nov 2024:** Israel–Hezbollah US-brokered ceasefire. [CFR]
- **Jan 2025:** Russia–Iran **Comprehensive Strategic Partnership Treaty** signed (in force Oct 2025). [CSIS/militarnyi]
- **Mar/Apr 2025:** Armenia formally notifies CSTO of exit (31 Mar). EU **ReArm Europe/SAFE (~€150bn)** announced (Mar). [Commons; ukraine-war-analytics]
- **May 2025:** India–Pakistan **Trump-brokered ceasefire** after May 7 strikes; Israel conducts its **12-day war** with Iran (US joins strikes on Iran). [France24; WaPo; Britannica]
- **Jun–Jul 2025:** SHELF of EU military aid to Ukraine consolidates; US–Saudi nuclear-deal talks accelerate. [INSS]
- **Aug 2025:** **Armenia–Azerbaijan peace treaty** signed (US-mediated). [Wikipedia; ary.news]
- **Oct 2025:** **Afghanistan–Pakistan** cross-border clashes begin (Pakistan strikes TTP in Afghanistan). [Britannica]
- **Oct 2025:** US-brokered **Israel–Hamas ceasefire** (Gaza hostage/succession deal). [KRCA]
- **Jan 2026:** **US forces capture Venezuela's Maduro.** [BISI]
- **Feb 2026:** US+Israel strike Iran — **Khamenei killed**; Iran nuclear/military infrastructure hit; "2026 Iran war" begins. [CFR; Britannica]
- **Feb 2026:** **Afghanistan–Pakistan open war** — Pakistani airstrikes (Kabul, Kandahar), ISKP bombing in Islamabad, "open war" rhetoric. [CFR; Wikipedia]
- **Mar 2026:** Pakistan bombs Kabul (140+ civilians); Saudi expels 5 Iranian diplomats citing Beijing-Agreement violations. [albis; afghanistanpeacecampaign]
- **Apr 2026:** **Pakistan-mediated US–Iran ceasefire** (Apr 7–8). [Wikipedia 2026 Iran war ceasefire]
- **May 2026:** ICJ merits hearings — Guyana v. Venezuela (Essequibo) run 4–11 May. [TopDisputes]
- **Jun 2026:** **US–Iran ceasefire signed**; US–Iran conflict formally expires **Aug 2026** (possible renewed strikes loom). [CRS R48887]
- **Jul 2026:** US–Saudi **civilian nuclear deal** certified by Trump (16 Jul; to Congress 24 Aug). [MEE; Wikipedia]
- **Jul–Sep 2026:** South China Sea — heavy China–Philippines clashes (Scarborough, 2nd Thomas Shoal); **US–PH–JP** patrols; China blocks Sierra Madre resupply. [USNI; CFR]
- **Aug–Sep 2026:** Africa Corps expands in the Sahel; AES fractures (Niger re-engages West); Bamako/JNIM pressure. [Frontwatch; FP]
- **Aug–Sep 2026:** **SCO summit, Bishkek** (31 Aug–1 Sep); BRICS 18th summit chaired by India (New Delhi), BRICS+ at 11 members. [Wikipedia; brics2026.gov.in]
- **Sep 2026:** Russia strengthens military ties with AES (Reuters 9 Jul); Sahel/US courts the juntas. [Reuters]
- **Oct 2026:** **Russia–Ukraine "energy ceasefire"** brokered by Trump (11 Oct); JEF ministers meet at Keflavik (2 Oct); NP fires ballistic missiles (12 Oct); Iran calls US proposal "insufficient" as renewed US strikes loom. [ISW/Critical Threats; Gov.UK; Al Jazeera; PBS]

**Design takeaway:** the map is in a **volatile ceasefire regime**, not a stable peace — perfect for a game where near-instant conflict re-ignition is expected. Version the "world state" as a datestamp (e.g., build to the 12 Oct 2026 reality, and keep a config knob to roll it forward or back).

---

## 2. DEFENSE TREATIES / ALLIANCE BLOCS (as of 2025–2026)

### 2.1 NATO — North Atlantic Treaty Organization
- **Members (32):** Albania, Belgium, Bulgaria, Canada, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Lithuania, Luxembourg, Montenegro, Netherlands, North Macedonia, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden, Türkiye, United Kingdom, United States. [NATO; EATA 2025]
- **Enlargement timeline:** Finland joined **4 Apr 2023** (31st), **Sweden joined 7 Mar 2024** (32nd) — both abandoned neutrality after Russia's 2022 invasion. [NATO; Commons Library]
- **Mutual defense:** **Article 5** — an armed attack on any member is treated as an attack on all. Notably *not* invoked for the Ukraine war (Ukraine is a partner, not a member), but invoked historically for 9/11. [NATO]
- **2025–2026 posture:** Rebuilding toward 2%+ of GDP defense spending; eastern-flank forward deployments (Baltic states, Poland); Finland/Sweden integration. Türkiye–Greece friction (Aegean) is the standout internal tension. [ELIAMEP Dec 2025; NATO]
- **In-game:** treat all 32 as mutual-ALLY bled. Ukraine is a "defensive ally in ongoing war" but *not* Art.5-protected.

### 2.2 US bilateral & minilateral alliances (Indo-Pacific focus)
- **Japan:** US–Japan Security Treaty (mutual.) A **US–Japan–South Korea trilateral** formalized at Camp David (Aug 2023) and reaffirmed in a Sept 2026 UNGA joint statement on North Korea. [State Dept. Sep 2026]
- **South Korea (ROK):** Mutual Defense Treaty; ~28,500 US troops; extended deterrence (nuclear umbrella). Trilateral with Japan above.
- **Australia:** **ANZUS** (US–Aus–NZ, 1951) and **AUKUS** (US–UK–Aus, 2021) — nuclear-submarine technology pact. Also Five Eyes and Quad. [CRS IF12113]
- **Philippines:** **EDCA** (Enhanced Defense Cooperation Agreement) — US access to rotating bases; a **Japan–Philippines–US** trilateral formed 2024–2025; joint patrols surged amid 2026 South China Sea clashes (Scarborough Shoal, Second Thomas Shoal). [USNI Oct 2026; Wiley 2026]
- **Taiwan (de facto):** No formal treaty, but the **Taiwan Relations Act** (1979) provides arms and U.S. policy of "strategic ambiguity" (defending against coercion, ambiguous on autonomy). Taiwan is *not* a US treaty ally, so in-game it should be FRIENDLY→ALLY-leaning but not a guaranteed Article-5-style defender. [CRS; ISW China-Taiwan updates]
- **Five Eyes (intelligence):** US, UK, Canada, Australia, New Zealand (1946). Signals-intel alliance.
- **Quad:** US, Japan, India, Australia (revived 2017) — a consultative/security dialogue, *not* a treaty alliance; India deliberately keeps it non-military. [CRS IF12113]
- **"SQUAD":** US, Japan, Australia, Philippines — countering China in the SCS. [IP Defense Forum Jul 2026]
- **Five Power Defence Arrangements (FPDA):** UK, Australia, New Zealand, Malaysia, Singapore — regional defense arrangement (Singapore/Malaysia, and both are otherwise neutral-leaning). [IP Defense Forum 2026]

### 2.3 CSTO — Collective Security Treaty Organization (Russia-led)
- **Members:** Russia, Belarus, Kazakhstan, Kyrgyzstan, Tajikistan, **Armenia**. [CRS; Jamestown]
- **Armenia's status (2025–2026):** Armenia **formally suspended** participation in 2024 after Russia failed to defend it against Azerbaijan; announced withdrawal intention (June 2024), **officially notified the CSTO on 31 Mar 2025**, and by **July 2025** had reached the "point of no return" toward full withdrawal. Armenia subsequently signed a US-mediated peace deal with Azerbaijan (Aug 2025). **Net: Armenia is effectively leaving the CSTO and pivoting West.** [Jamestown Jul 2025; Wikipedia Armenia–CSTO; DW]
- **Practical value:** The CSTO is largely dormant — it did *not* intervene in Ukraine (obviously) or the 2022 Kazakhstan crisis; Russia's bandwidth is consumed by Ukraine. Belarus remains the only dependable ally.
- **In-game:** Russia–Belarus = hard ALLY; Russia–Kazakhstan/Kyrgyzstan/Tajikistan = FRIENDLY (CSTO members but hedging); Armenia = TENSE→HOSTILE with Russia, NEUTRAL-to-FRIENDLY with the West.

### 2.4 SCO & BRICS — (looser, economic/diplomatic; NOT defense pacts)
- **Shanghai Cooperation Organisation (SCO):** China, Russia, India, Pakistan, Kazakhstan, Kyrgyzstan, Tajikistan, Uzbekistan, **Iran** (full 2023), **Belarus** (full 2024). Ran the **26th summit in Bishkek, 31 Aug–1 Sep 2026**. Counter-terrorism arm (RATS) in Tashkent. **Key quirk:** India and Pakistan are *both* members — so SCO membership implies nothing about bilateral hostility. [Wikipedia 2026 Bishkek SCO summit; Medhya]
- **BRICS (11 full members, 2026):** Brazil, China, Egypt, Ethiopia, India, Indonesia, Iran, Russia, Saudi Arabia, South Africa, UAE — per the official India-chaired 2026 site. Expansion tier of **partner countries** also exists (~10). India chairs **2026** with the **18th summit in New Delhi**. *(Note: some secondary sources in 2025 listed only 10 and described Saudi Arabia as "invitee not full member" — the official 2026 Indian chair site lists 11 including Saudi; flag for design reuse.)* BRICS is a coordination forum with **no constitutive treaty, no secretariat, no defense clause**. [brics2026.gov.in; Wikipedia Member states of BRICS; Medhya 2026]
- **In-game relevance:** SCO/BRICS are *not* mutual-defense pacts — a country's SCO/BRICS card must not trigger automatic war-bloc behavior. Use them only to add FRIENDLY/NEUTRAL diplomatic framing.

### 2.5 Arab League / GCC / Gulf Cooperation Council
- **Arab League (22):** Algeria, Bahrain, Comoros, Djibouti, Egypt, Iraq, Jordan, Kuwait, Lebanon, Libya, Mauritania, Morocco, Oman, Palestine, Qatar, Saudi Arabia, Somalia, Sudan, Syria (readmitted 2023), Tunisia, UAE, Yemen. [Arab League]
- **GCC (6):** Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. A security/economic council dominated by Saudi Arabia & UAE. [GCC]
- **2025–2026 Gulf dynamics:** Saudi Arabia pursuing a **US civilian nuclear deal** (certified by Trump 16 Jul 2026, submitted to Congress 24 Aug 2026) that Trump has publicly tied to joining the Abraham Accords; Saudi–Iran Beijing-agreement détente strained (below). Saudi–UAE rivalry continues under the surface (notably in **Sudan**, where the UAE is widely accused of arming the RSF while Saudi mediates). [MEI 2026; UN fact-finding Sep 2026]

### 2.6 African blocs: AU, ECOWAS, AES
- **African Union (55):** continental body; broad, non-defensive.
- **ECOWAS (15):** Benin, Burkina Faso, Cape Verde, Côte d'Ivoire, Gambia, Ghana, Guinea, Guinea-Bissau, Liberia, Mali, Niger, Nigeria, Senegal, Sierra Leone, Togo.
- **AES — Alliance of Sahel States (2023–24):** **Mali, Niger, Burkina Faso** — the three juntas. They **announced withdrawal from ECOWAS in June 2024** (effective early 2025), created the AES as a mutual-defense/confederation, and expelled French troops in favor of **Russia's Africa Corps** (ex-Wagner). **Regional split:** AES vs. the rest of ECOWAS (Nigeria, Ghana lead the pro-Western coastal bloc). [Frontwatch 2026; Reuters Jul 2026]
- **In-game:** AES = a small FRIENDLY/ALLY cluster aligned to Russia; ECOWAS coastal states = FRIENDLY to the West; both are internally complicated (Nigeria is the regional heavyweight and swings both ways).

### 2.7 EU common defense posture & the Joint Expeditionary Force
- **EU:** The EU is *not* a defense pact (NATO remains Europe's shield), but 2025's **ReArm Europe / SAFE** programme mobilizes **~€150 billion** of joint borrowing for defense procurement (air defense, artillery, drones) and suspends deficit rules for defense. A genuine **European defence-industrial mobilization** is underway in response to the Ukraine war and anxieties about US reliability. [ukraine-war-analytics Mar 2026]
- **Joint Expeditionary Force (JEF) — UK-led, 10 nations:** Denmark, Estonia, Finland, Iceland, Latvia, Lithuania, Netherlands, Norway, Sweden, UK. A flexible, high-readiness "coalition of the like-minded" operating in the High North, Northern Europe, and the Baltics. Ministers met at **Keflavik, Iceland (2 Oct 2026)**; leaders met in **Helsinki (26 Mar 2026)**. [Gov.UK Oct 2026; jefnations.org]
- **Franco-German axis + UK:** France and Germany remain the EU's motor (recovering from bilateral tensions); the UK is outside the EU but inside NATO/JEF/AUKUS, and has rebuilt closer EU defense ties (2025 "reset").
- **In-game:** treat EU members as mutually FRIENDLY/ALLY-with-NATO; the EU as a whole should *not* be a separate hostile war-bloc — it is a NATO-aligned economic/defense community.

---

## 3. CURRENT ACTIVE CONFLICTS / FROZEN CONFLICTS (2025–2026 status)

### 3.1 Russia–Ukraine war — ACTIVE (attritional stalemate)
- **Frontline (Oct 2026):** Static-to-gradually-shifting attrition. Russia presses in the east/donetsk; Ukrainian forces recently advanced in the **Borova** direction; Russia launches massive combined drone/missile strikes (160 drones overnight on 10 Oct 2026). [ISW 10 Oct 2026; ISW 7 Oct 2026]
- **Ceasefire status:** Russia and Ukraine agreed an **"energy ceasefire"** on **11 Oct 2026**, brokered/announced by Trump — but neither side formally recognized it fully; front-line combat continues. [Critical Threats 11 Oct 2026; ISW]
- **Human cost (Oct 2026):** Zelenskyy reports **~43,000 Ukrainian soldiers killed, ~370,000 wounded**; Russia's losses are far higher but undisclosed. UN reports ~30M+ affected. [Russia Matters 7 Oct 2026]
- **Alignment:** **Russia** is backed by **Belarus** (logistics/basing), **North Korea** (artillery shells, ballistic missiles, **12,000+ troops**, and reportedly a missile unit by 2026), and **Iran** (drones, munitions), with China providing economic/military-industrial lifelines without troops. [CRS IF12760; Defense News Aug 2026; militarytimes Sep 2026]
- **Ukraine** is backed by **NATO/EU/JEF** (US, UK, EU, Nordic–Baltic bloc) plus **Australia, Japan, South Korea** (economic/military aid). US support under Trump is conditional and contested; Europe has taken over the largest share of aid. [Commons Library 2026]
- **In-game:** Russia–Ukraine should start HOSTILE with Russia also HOSTILE to NATO; Belarus aligned with Russia; NK/Iran supplying Russia as FRIENDLY-to-Russia.

### 3.2 Middle East: Israel–Hamas / Israel–Hezbollah / **2026 Iran war** — ceasefire, but fragile
- **Israel–Hamas (Gaza):** The US-brokered Israel–Hamas ceasefire (Oct 2025) produced a hostage deal/succession in Gaza, but **a year later progress has stalled** and the arrangements are fragile; Israel retains security control. [KRCA/AP Oct 2026]
- **Israel–Hezbollah (Lebanon):** A US-brokered ceasefire (Nov 2024) ended the 2024 war; Lebanon's army/UNIFIL fill a partially disarmed Hezbollah vacuum. Hezbollah is severely degraded after the 2024 campaign and the 2025–26 decapitation of Iran's axis. [CFR]
- **2026 Iran war (US + Israel vs. Iran):**
  - **Feb 2026:** The **US and Israel attacked Iran**, killing **Supreme Leader Ali Khamenei** and targeting nuclear & military infrastructure — an unprecedented strike on the Iranian leadership. [CFR Conflict Tracker; Britannica 2026 Iran war]
  - **April 7–8 2026:** Ceasefire (a **Pakistan-mediated** two-week truce; Iran had rejected an earlier draft). [Wikipedia 2026 Iran war ceasefire]
  - **June 2026:** US–Iran ceasefire signed (after renewed fighting); Israel's 12-day war against Iran (June 2025) had previously drawn a US strike on Iran. [CRS R48887; Britannica]
  - **Aug 2026:** The US conflict formally **expired**; since then the Pentagon signals possible **renewed strikes** (a window of two weeks to two months as of Oct 8, 2026) — Trump said he'd announce a decision "in two weeks"; Iran's leadership calls US proposals "insufficient." [CRS R48887; ILTV/Al Jazeera Oct 2026; PBS Oct 12 2026]
  - **Net effect:** Iran is **weakened, decapitated, economically sanctioned (snapback)** and increasingly reliant on Russia/China; the US–Israel–Sunni-Gulf axis is ascendant; Saudi–Iran détente is strained but formally maintained. [MEI; Iran Dossier Sep 2026]

### 3.3 China–Taiwan / South China Sea — HIGH TENSION (hot maritime clashes)
- **Crisis hotline/red lines:** No open war, but the most militarized scenario in the Pacific. ISW runs a *China-Taiwan Update* tracking PRC coercion. Chinese pressure around Taiwan includes daily incursions and, since 2022–2024, an expanding military.* [ISW China–Taiwan updates]
- **South China Sea clashes (2026):** Philippines and China clashed **three times in one week in July 2026** at **Scarborough Shoal** and **Second Thomas Shoal**, prompting **joint US–Philippines–Japan** patrols; there have been **at least 6 dangerous engagements** in 2026 (esp. Luzon Strait, Thitu, Batanes/Kota Island, Scarborough). China blocked a Philippine resupply to the aground BRP Sierra Madre (Second Thomas Shoal) in late Sept 2026; China fired water cannons at Philippine vessels. [CFR; USNI 9 Oct 2026; ACLED]
- **Claimants:** China claims nearly the whole SCS; disputes with **Philippines, Vietnam, Malaysia, Brunei** (and Taiwan). A **Code of Conduct** remains elusive despite a decade of talks. [ThinkChina 2026; CFR]
- **Taiwan–Philippines alignment:** Taiwan and the Philippines moved toward informal cooperation against Chinese maritime pressure (2026), a new mini-alignment. [Youtube/ACLED Oct 2026]
- **In-game:** China ↔ Taiwan = HOSTILE (unification vs. effective independence); China ↔ Philippines = HOSTILE/TENSE; China ↔ Vietnam/Malaysia = TENSE; US/Japan/Australia ↔ China in SCS = TENSE-to-HOSTILE.

### 3.4 India–Pakistan — fragile ceasefire (nuclear-armed)
- **May 7 2025:** India struck **nine alleged militant camps inside Pakistan/PaK** in retaliation for the Pahalgam attack — the most serious confrontation between the nuclear rivals in decades. [Washington Post May 2026]
- **May 10 2025:** A **Trump-brokered (and Pakistani COAS Asim Munir-brokered) ceasefire** took hold along the LoC. [France24 May 2025; Al Jazeera May 2026]
- **Status (2026):** Ceasefire largely holds but **diplomacy/trust remain frozen**; there have been ceasefire violations (Poonch, 12 Feb 2026; LoC incidents June 2026) and US "needling" of India complicates things. Nuclear weapons on both sides make this a **HOSTILE-standoff with a ceasefire** — treat as TENSE-to-HOSTILE with a no-first-strike default. [BBC Apr 2026; Al Jazeera May 2026; The Media Line]

### 3.5 India–China — border deal easing, but fresh friction
- **Oct 2024:** In a **BRICS-diplomacy-flavored deal**, India and China agreed on **disengagement at the last Ladakh friction points (Depsang, Demchok)**; brigades pulled back. The 2020 Galwan standoff measures largely resolved by late 2024–25. [MEA; Chatham House Apr 2025]
- **2025:** Normalization steps — resumed **Nathu La Pass border trade** (first time in 6 years), direct flights, scholar/journalist exchanges, transboundary-river cooperation. [Washington Post Nov 2025]
- **2026:** **Fresh friction in Arunachal Pradesh** — Aug 2026 reporting of Chinese encroachment/road-building near the disputed McMahon Line; the LAC itself is not mutually agreed. [Al Jazeera 17 Aug 2026; ORF]
- **In-game:** India–China = TENSE (managed border friction; not currently a shooting war, but a standing flashpoint). Both are BRICS/SCO members — good example of club-membership ≠ friendship.

### 3.6 Armenia–Azerbaijan — Nagorno-Karabakh resolved (2023); peace treaty signed but unratified
- **Nagorno-Karabakh dissolved (Sep 2023)** when Azerbaijan took full control; ~100k Armenians fled.
- **Peace treaty signed 8 Aug 2025** (US-mediated; Pashinyan & Aliyev) — mutual recognition of sovereignty/borders, renouncing territorial claims, non-aggression; the **Zangezur corridor** connectivity is a sticking point. [Wikipedia; ary.news; CFR]
- **2026 status:** **Signed but unratified.** Azebaijan preconditions ratification on Armenia amending its constitution to recognize Baku's sovereignty over Karabakh; the ~1,000 km border remains **undefined**. Pashinyan (9 Oct 2026) says Armenia is committed to signing/ratifying; the deal is widely described as fragile. [eurasianet; EVN Report; ArmRadio Oct 2026]
- **In-game:** Armenia–Azerbaijan = TENSE (peace treaty, unresolved border/ratification). Armenia has pivoted West (left CSTO); Azerbaijan is closer to Türkiye (pan-Turkic) and Israel.

### 3.7 Korean Peninsula — technical state of war; escalation + diplomacy talk
- **North Korea** is a **declared nuclear-armed state** with missiles that can now reach the US homeland and certainly Japan/ROK (Per April 2026 US defense testimony). [CRS IF10472]
- **Russia–North Korea Treaty (18 Jun 2024)** — a **mutual-defense clause** (Art. 4), the hardest formal military pact either has; NK has sent **12,000+ troops**, munitions, and a reported missile unit to Ukraine. The **first NK–Russia road bridge** opened in 2026 (deepening integration). [CRS IF12760; Chatham House Sep 2026; Defense News Aug 2026]
- **Inter-Korean** relations are at a **historic low**; the 2018 military agreement is suspended; NK fired **multiple ballistic missiles on 12 Oct 2026** and 11th missile test of the year. [Al Jazeera 12 Oct 2026; Commons Library; 38North]
- **US–North Korea:** Trump (late 2026) publicly wants **direct talks** (like his first term); Pyongyang signals no appetite while pressing for sanctions relief. [38North Oct 2026; Commons Library]
- **In-game:** ROK & Japan & US ↔ DPRK = HOSTILE; Russia ↔ DPRK = hard ALLY (mutual defense); China ↔ DPRK = FRIENDLY but not a hard military pact (China is wary of NK–Russia drift and uses "tactical ambiguity"). [Asia Society/RAND 2026]

### 3.8 Sudan civil war — ACTIVE (world's worst humanitarian crisis)
- **Factions:** Sudanese Armed Forces (SAF, Gen. Burhan) vs. Rapid Support Forces (RSF, Hemetti) since **April 2023**.
- **Territory (as of 2025–26):** SAF holds the **north, east, southeast (incl. Port Sudan) and retook Khartoum by March 2025**; the RSF controls **most of Darfur (incl. El-Fasher, 2024), large parts of Kordofan, and much of Gezira**, and is pushing on **El Obeid** (North Kordofan) and into North/West Darfur (2025–26). [Wikipedia; EUAA; ACLED; UN]
- **2026 events:** Massive RSF build-up around **El Obeid** with drone campaigns (both sides); a new front in **North/West Darfur** where SAF-aligned **Darfur Joint Forces** pushed back RSF incursions from Chad. **>30 million** need humanitarian aid. A protracted war-of-attrition is expected. [UN News; BBC Jul 2026; ACLED]
- **External patrons:** The **UAE is widely accused of arming/supporting the RSF** (Sudan rejects UAE hosting UN congress over it); up to **2,000 former Colombian contractors** fight for the RSF; the **SAF uses foreign-supplied drones**; Egypt, Iran, Russia lean toward SAF. UN fact-finding (Sep 2026) documents transnational recruitment and arms pipelines to both sides. [UN News 3 Sep 2026; Sudan Tribune; ACLED]
- **In-game:** Sudan = an active HOSTILE civil war (SAF vs. RSF). External leanings — UAE/RSF, Russia&Iran/SAF — could seed proxy dynamics, but keep it internal-first. Note **South Sudan** mediates and the **Abyei** status quo holds separately.

### 3.9 Sahel juntas (Mali / Niger / Burkina Faso) vs. France; Russian Africa Corps
- **Coups & rupture with France:** Mali (2021), Burkina Faso (2022), Niger (2023) — all expelled French forces by 2023–24, quit ECOWAS, and formed the **AES**. [Frontwatch; Reuters]
- **Russia's Africa Corps** (the sanctioned successor to Wagner Group, under direct Russian MoD control) has **expanded to permanent bases in all three AES states**, providing training, equipment, and direct combat support in exchange for mining access and loyalty. Africa Corps has ~100-man instructor detachments (e.g., at **Air Base 101, Niamey**), helped **defend Bamako** during JNIM pressure, and helped **defeat the Aug 2026 Niamey mutiny**. [Africa Index 2026; Foreign Policy 29 Sep 2026; warwatchlive]
- **Security deterioration:** Burkina Faso is the worst — **JNIM controls an estimated 40% of its territory** (with ~17,775 killed over 3 years); JNIM laid a **blockade on Bamako**; Kidal fell to Tuareg/JNIM in 2024; Africa Corps withdrew from Kidal in **April 2026**. [Frontwatch; newsafrika; war-on-fire]
- **2026 wrinkle:** The AES is fracturing — **Niger is quietly re-engaging with the West/France** while Mali doubles down with Russia. [Frontwatch 2026]
- **In-game:** Mali/Niger/Burkina Faso = FRIENDLY-to-ALLY with Russia; TENSE-to-HOSTILE with France/US/West (though Niger may drift back); the Sahel is a Russia-vs-West proxy zone with a severe local insurgency overlay (not state-vs-state).

### 3.10 Venezuela–Guyana (Essequibo) — legal standoff, after a regime shock
- **The dispute:** Venezuela claims the **Essequibo** — ~two-thirds of Guyana (oil-rich, offshore ExxonMobil production). A 2023 Venezuelan referendum/annexation push was followed by ICJ provisional measures. [Wikipedia; CFR]
- **ICJ (2026):** Merits hearings ran **4–11 May 2026** and closed; the Court is deliberating, no date set. [TopDisputes; Diplomacy&Law]
- **Regime shock:** **US forces captured Venezuela's President Maduro on 3 Jan 2026** — a dramatic escalation by the Trump administration (linked to Venezuela's oil/proliferation policy). This dramatically shifts Caracas's negotiating position; the interim leadership is urging "good-faith negotiations" and has signaled it won't escalate to seizure while negotiating. [BISI 2026; VenezuelaAnalysis Feb 2026; Demerara Waves Sep 2026]
- **Guyana's position:** strong domestic mandate after the **Sep 2025 election**; backed by the US, UK, EU, CARICOM, and (implicitly) the West given Exxon involvement. Venezuela has historic support from Russia/China/Cuba. [IMUNA; villagevoicenews]
- **In-game:** Venezuela ↔ Guyana = TENSE (active legal dispute; latent escalation risk). Venezuela is aligned FRIENDLY with Russia/China/Cuba/HIC and HOSTILE/TENSE with the US after 2026 events.

### 3.11 Other active / latent flashpoints worth seeding (2025–26)
- **Red Sea / Houthis (Yemen):** Iranian-backed Houthis kept attacking shipping (2023–26) in solidarity with Gaza; Saudi & UAE have pared their own Yemen entanglement; the US/Israel targeted Houthi assets. As of Oct 2026 the Red Sea remains a friction corridor. [matzav 2026; CFR]
- **Syria:** Assad's Russia/Iran-backed government holds ~two-thirds; Idlib (HTS) and the SDF (US-backed Kurds) hold pockets; Türkiye occupies the north; Israel strikes Iranian assets. A frozen-but-active multi-party war — Russia (protects Assad) vs. US/Kurds vs. Türkiye, with Iran degraded post-2026.
- **Ethiopia / Horn of Africa:** The Ethiopian government is rebuilding after the Tigray war; frictions with Somalia (dam, port, and Somaliland recognition), and a Gulf/Russia involvement crescent (Russia courting a Red Sea base).
- **Cyprus (frozen):** Greek- vs. Turkish-Cypriot division; Türkiye's guarantor role vs. an EU-aligned Cyprus — a NATO-internal (Greco-Turkish) pressure point.
- **Western Balkans (frozen tensions):** Kosovo vs. Serbia (NATO KFOR mission), Bosnia's Republika Srpska secessionist drift, Russian influence — low-boil European friction inside NATO's south.
- **Western Sahara:** Morocco (US-recognized claim, US-backed) vs. the Polisario Front (Algeria-backed) — a low-tension North African rift with a Western tilt.
- **Myanmar / Afghanistan:** internal civil wars with external meddling (Myanmar's junta vs. ethnic armies — China/Russia lean junta; Afghanistan's Taliban vs. ISKP — see Pakistan war above).

---

## 4. GREAT-POWER & KEY-PLAYER PROFILES (2025–26)

For each major player on the "World" map: their core alliance identity, their most important allies/friends/rivals, and a one-line description of where they stand right now.

### 4.0 The United States
- **Identity:** Sole superpower and hub of the largest alliance network (NATO + Indo-Pacific bilaterals + Five Eyes + Middle East security commitments).
- **Administration (2025–26):** Second Trump term. "America First" transactional diplomacy: brokering ceasefires (Russia–Ukraine energy, India–Pakistan, Iran war), coercive on proliferation (struck Iran, captured Maduro), and wanting direct engagement with adversaries (talk of Trump–Kim). [PBS Oct 2026; 38North Oct 2026; BISI]
- **Allies:** NATO (32), Japan, South Korea, Australia, UK, Canada, Israel (special). **Friends:** Philippines (EDCA), India (Quad), Taiwan (de facto), Saudi/Gulf. **Rivals/Enemies:** Russia, China (competition), Iran, North Korea, Venezuela (post-2026).
- **In-game:** the default "Team A" pole. Starts allied broadly but with divisibility on commitment (strategic ambiguity on Taiwan; reluctance to fully commit to far-flung fights under "America First").

### 4.1 China
- **Identity:** Rising rival superpower; economic behemoth; land+maritime power; center of SCO/BRICS.
- **Allies/friends:** Russia ("no limits"), Pakistan (all-weather, CPEC), North Korea (loose), Cambodia/Laos (clients), Iran & the Global South via BRICS. **Rivals/Enemies:** US, Taiwan (claims), Japan, South Korea (historical), Philippines/Vietnam/Malaysia/Brunei (SCS), India (border).
- **Strategy 2025-26:** pressure on Taiwan + SCS militarization; brokering Middle East & Afghan diplomacy (China mitigates its own isolation while the West is bogged down); deepening the Russia axis while watching NK–Russia drift with "tactical ambiguity." [RAND; ISW China-Taiwan; Wikipedia China in the 2026 Iran war]
- **In-game:** economic/top-tier production power; starts strong but isolated vs. the US bloc; its "axis" is real but looser than NATO — China's partners won't fight automatically with it.

### 4.2 Russia
- **Identity:** Weakened-but-resilient great power; revisionist; front and center of the Ukraine war.
- **Allies/partners:** Belarus (close), North Korea (2024 mutual-defence treaty), Iran (2025 strategic-partnership), China ("no limits"), Central Asia (CSTO/SCO), the AES Sahel juntas, Syria, Venezuela.
- **Situation 2025-26:** Ukraine war an attritional stalemate (energy ceasefire 11 Oct 2026); heavily sanctioned; reliant on Iran/NK/China arms; pivoting its Post-Soviet security architecture to the Global South/Africa (Africa Corps). Lost Armenia (quit CSTO, pivoted West). [ISW Oct 2026; CRS IF12760; Jamestown]
- **In-game:** the "Team B" pole. Starts isolated in Europe but with partners on the periphery (Belarus, North Korea, Iran, Sahel, Africa Corps in the Sahel/Sudan). Strong in irregular/proxy tools, weaker in conventional depth.

### 4.3 India
- **Identity:** The classic swing power / hedge. Demography, fast growth, nuclear-armed, "Global South" champion.
- **Alignments:** In the **Quad** (US, Japan, Australia) *and* **BRICS/SCO** (with China, Russia, Pakistan!). Buys arms from Russia *and* the West; buys Russian oil; host of BRICS 2026 chairmanship.
- **Rivals/enemies:** Pakistan (nuclear standoff, 2025 ceasefire), China (border, TENSE). **Friends:** US/West (growing), Russia (historic), Israel (defense/tech), Gulf (diaspora/energy), Japan/Australia (Quad).
- **2025-26:** Trump-brokered India–Pakistan ceasefire (May 2025) holding though trust frozen; India–China normalization stepwise but fresh Arunachal friction (Aug 2026); US "needling" of India's Russia ties. [BBC; WaPo 2026; Al Jazeera Aug 2026]
- **In-game:** start **NEUTRAL** to both superpower blocs — high-value "swing" node; its pressure points are Pakistan and China, not the superpowers.

### 4.4 The European anchor (Germany, France, UK, Italy, Poland)
- **Germany:** NATO/EU anchor; defense surge post-2022; Taurus debates; pro-Ukraine but cautious on escalation. **France:** nuclear-deterrent EU security-minded; independent streak (sought EU strategic autonomy); leads EU defense rhetoric; UK–France defense reforging. **UK:** outside EU but NATO/JEF/AUKUS core + Five Eyes; strong Ukraine backer. **Poland & Baltics:** the hawkish eastern flank, most Russia-averse and spending biggest % of GDP on defense.
- **Collective:** ReArm Europe/SAFE (~€150bn), JEF (10 nations, UK-led). [Gov.UK Oct 2026; JEF nations; ukraine-war-analytics 2026]
- **In-game:** treat as a coherent **European FRIENDLY/ALLY** sub-bloc within NATO — allies among themselves, HOSTILE to Russia, donating resources to Ukraine. Do not over-split them; their frictions (Hungary, Türkiye) are the spice.

### 4.5 Japan & South Korea
- **Japan:** US treaty ally; reconstituted military (post-2022 defense buildup); active in SCS/Quad/trilateral with ROK; TENSE with China (Senkaku), HOSTILE-adjacent to North Korea.
- **South Korea:** US treaty ally; extended nuclear deterrence; TENSE-to-HOSTILE with North Korea (mutual "enemy states" constitutionally); improved Japan relations via US trilateral (2023–26).
- **2026:** Both in the US–Japan–ROK trilateral (UNGA statement Sep 2026) and targets of NK missile tests (Oct 2026). [State Dept Sep 2026; Al Jazeera Oct 2026]
- **In-game:** hard US ALLIES; mutually ALLY via trilateral; both HOSTILE to NK/TENSE to China.

### 4.6 Türkiye (a NATO swing-state)
- **Identity:** NATO member, powerful middle power, three-time-region actor (Black Sea, Middle East, Caucasus) with an independent foreign policy.
- **Complex ties:** NATOALLY but buys Russia's S-400 (friction with US/NATO), cooperates with Russia in Syria, coordinates on energy, but also TENSE with Russia in the Caucasus/Libya. TENSE with Greece (Aegean/East. Med) and Cyprus. FRIENDLY economically with the Gulf, hedge-player in the Middle East. [ELIAMEP; MilitaryTimes-era S-400 reporting]
- **In-game:** the single best "swing state." Start FRIENDLY to the West (NATO) but with a **drift mechanic** toward Russia if pressured; TENSE with Greece.

### 4.7 The Middle East & the Gulf
- **Israel:** US-guaranteed regional power; HOSTILE with Iran; just fought the 2026 war; normalizing/supporting with Gulf quietly; still managing Gaza/Hezbollah. [CFR; MEI]
- **Saudi Arabia:** US-friendly; pursues a 2026 US nuclear deal; keeps Saudi–Iran Beijing détente alive (formally reaffirmed Oct 2026) while tilted West; perpetual Saudi–UAE rivalry (incl. Sudan). [MEE; SPA Oct 2026]
- **UAE:** US/France-friendly; accused of arming the RSF in Sudan; a Gulf powerhouse.
- **Iran:** weakened/decapitated post-2026-war; relations: HOSTILE with US/Israel; TENSE-but-formal détente with Saudi (Beijing Agreement); FRIENDLY with Russia/China; backs proxies (Houthis, Hezbollah-degraded, Iraqi militias, Hamas).
- **In-game:** Middle East = a **US–Israel–Gulf bloc vs. a weakened Iran** (+Russia/China backing) with Saudi as the pivotal hinge. Proxy nodes (Yemen/Houthis, Lebanon, Syria, Iraq) are low-state-cost conflict engines.

### 4.8 Brazil, South Africa, the "Global South" neutrals
- **Brazil** (Lula): BRICS + partner to all; neutral on Russia–Ukraine (hawkish-ish but non-aligned); would-be mediator. **South Africa:** BRICS, was a spoiler via ICJ Gaza case, neutral on Ukraine, close-ish to Russia/China but not allied. **Indonesia:** non-aligned heavyweight, BRICS member (2026), neutral, balancing US–China.
- **In-game:** start NEUTRAL; they raise the cost/"reputation" of picking sides and can be courted. Good "diplomacy targets" rather than combatants.

### 4.9 North Korea / Pakistan / Iran / Venezuela (the "pariah-ally" cluster)
- **North Korea:** nuclear-armed; hard military-rush ally of Russia (2024 mutual-defense treaty) while keeping China at arm's-length-wariness; HOSTILE to ROK/Japan/US; open to Trump talks (sanctions relief) but not yet. [CRS; 38North; Commons]
- **Pakistan:** China's all-weather ally; in an **open war with Afghanistan** (2026); ceasefire-truce with India; historically US-ally (frayed); nuclear-armed; key US/Pakistani broker in the 2026 Iran ceasefire and the India–Pakistan ceasefire. [CFR; Wikipedia 2026]
- **Iran:** see 4.7. **Venezuela:** post-Maduro-capture; Russia/China/Cuba-friendly; TENSE/US; Essequibo dispute with Guyana. [BISI]
- **In-game:** these are the "anti-systemic / spoiler" factions — useful mid-game escalation triggers, each with a patron (Russia/China) but no ironclad great-power umbrella.

---

## 5. RELATIONSHIP MATRIX

**Scale:** `ALLY` (treaty-level mutual defense / ironclad), `FRIENDLY` (strong cooperation, no hard pact), `NEUTRAL` (cordial, low-stakes), `TENSE` (strategic rivalry or dispute, but not at war), `HOSTILE` (enemies, at/claiming war or existential dispute).

| Partner A | Partner B | Relation | Key driver (2025–26) |
|---|---|---|---|
| US | UK | **ALLY** | NATO Art.5, AUKUS, Five Eyes, intelligence-to-missiles intimacy [CRS IF12113] |
| US | France | **ALLY** | NATO; strong for Ukraine; EU-US trade friction minor |
| US | Germany | **ALLY** | NATO; Germany's defense surge & Taurus policy debates; trade/auto frictions [ReArm] |
| US | Japan | **ALLY** | US–Japan Treaty; 2026 trilateral; SCS/Senkaku pressure [State Dept 2026] |
| US | South Korea | **ALLY** | Mutual Defense Treaty; NK threat; 2026 trilateral [State Dept 2026] |
| US | Australia | **ALLY** | ANZUS, AUKUS, Five Eyes, Quad [CRS IF12113] |
| US | Canada | **ALLY** | NATO, NORAD, Five Eyes; trade disputes (Trump tariffs) add friction but alliance solid |
| US | Israel | **ALLY** | Ironclad strategic ally; 2026 Iran war joint strikes [CFR] |
| US | Saudi Arabia | **FRIENDLY** | Security partnership; 2026 nuclear deal; normalization question [MEI; MEE] |
| US | India | **FRIENDLY** | Quad, defense/tech ties; but India hedges with Russia & BRICS; Trump "needling" 2026 [WaPo 2026] |
| US | China | **HOSTILE/TENSE** | Trade war, tech decoupling, Taiwan, SCS, Russia ties; strategic competition [ISW] |
| US | Russia | **HOSTILE** | Ukraine war; sanctions; arms control collapse; Trump diplomacy tentative |
| Russia | China | **ALLY (no-limits)** | Anti-Western partnership; economic lifeline; de-facto axis w/ NK; no formal mutual-defense [RAND] |
| Russia | India | **FRIENDLY** | Defense/oil legacy, BRICS/SCO; strained by Ukraine; India tilts West |
| Russia | North Korea | **ALLY** | **Mutual-defense treaty (Jun 2024)**; NK troops in Ukraine [CRS IF12760] |
| Russia | Iran | **FRIENDLY/ALLY-ish** | **20-yr strategic-partnership treaty (Jan 2025, in force Oct 2025)**; drones/arms; NO mutual-defense clause [militarnyi; IranWatch] |
| Russia | Belarus | **ALLY** | Union State; CSTO; basing for Ukraine war |
| China | North Korea | **FRIENDLY** | Historic alliance; "tactical ambiguity" on NK–Russia drift [RAND; Asia Society] |
| China | Pakistan | **ALLY (all-weather)** | CPEC; joint fighter jets; counterweight to India |
| China | India | **TENSE** | LAC/Ladakh & Arunachal friction; both in BRICS/SCO [Al Jazeera Aug 2026] |
| India | Pakistan | **HOSTILE/TENSE** | Kashmir, nuclear standoff; 2025 ceasefire holds, trust frozen [BBC; France24] |
| India | Russia | **FRIENDLY** | Historic arms/oil; BRICS; vs. Western pressure [Chatham House] |
| India | US | **FRIENDLY** | Quad; defense; but India's Russia ties & Trump friction [WaPo 2026] |
| Iran | Saudi Arabia | **TENSE/FRIENDLY** | Beijing Agreement (2023); 2026 Saudi expulsion & Iran war strain; reaffirmed Oct 2026 [albis; SPA Oct 2026] |
| Iran | Israel | **HOSTILE** | Proxy wars; 2025–26 direct US/Israel strikes; existential rivalry [CFR] |
| Iran | US | **HOSTILE** | 2026 Iran war; Khamenei killed; snapback sanctions; possible renewed strikes [CRS R48887] |
| Israel | Saudi Arabia | **TENSE/FRIENDLY** | Normalization stalled/off agenda; quiet security/tech cooperation [INSS Feb 2026] |
| Türkiye | Greece | **TENSE** | Aegean/Eastern Med maritime disputes; Sea Wolf 2026; both NATO [ELIAMEP; GreekReporter] |
| Türkiye | Russia | **TENSE/FRIENDLY** | NATO ally but S-400, Syria coordination, gas hub; rivalry in Caucasus/Libya |
| Türkiye | US | **TENSE/FRIENDLY** | NATO ally; S-400 friction, Syria/Kurds, but defense trade & Åland diplomacy |
| UK | France | **ALLY** | NATO, JEF, AUKUS-pivot reconvergence; rebuilding post-Brexit defense ties |
| Japan | South Korea | **FRIENDLY/ALLY** | US-mediated trilateral (2023, 2026); shared NK/China threat; historical friction easing |
| Japan | China | **TENSE** | Senkaku/Diaoyu; Taiwan; SCS; NK missile overflights |
| EU | Russia | **HOSTILE** | Ukraine war; sanctions; energy decoupling; ReArm driven by Russia threat |
| NATO | Russia | **HOSTILE** | Ukraine war; eastern flank; Finland/Sweden accession as response [NATO] |
| Pakistan | Afghanistan | **HOSTILE** | **2026 Afghanistan–Pakistan war** (TTP/ISKP strikes, Kabul bombings, open war) [CFR; Wikipedia 2026] |
| China | Taiwan (de-facto) | **HOSTILE/ENFORCEMENT** | Unification policy vs. effective independence; coercion [ISW] |
| US | Taiwan (de-facto) | **FRIENDLY** | Taiwan Relations Act arms; strategic ambiguity; no Art.5 [CRS] |
| Russia | Ukraine | **HOSTILE** | Active invasion; energy ceasefire Oct 2026 [ISW] |
| Philippines | China | **TENSE/HOSTILE** | SCS Scarborough/2nd Thomas Shoal clashes; US-PH-JP patrols [USNI] |
| Vietnam | China | **TENSE** | SCS (Paracels/Spratlys) claims; balancing with US |
| Armenia | Azerbaijan | **TENSE** | Karabakh resolved 2023; peace treaty signed 2025, unratified [CFR; eurasianet] |
| Armenia | Russia | **TENSE** | Armenia quit CSTO (2024-25); Russia didn't defend; pivot West [Jamestown] |
| France | Germany | **ALLY** | EU/NATO motor; recovered from 2023-24 frictions; joint defense initiative |
| Poland | Russia | **HOSTILE** | NATO eastern flank; largest defense spend % of GDP; Ukraine front-line ally |
| Baltics (EE/LV/LT) | Russia | **HOSTILE** | NATO eastern flank; historic Russia resentment |
| US | Philippines | **ALLY/FRIENDLY** | Mutual Defense Treaty + EDCA bases; SCS joint patrols [USNI] |
| US | Taiwan | **FRIENDLY** | Taiwan Relations Act; arms; strategic ambiguity (no Art.5) [CRS] |
| Japan | Australia | **ALLY** | Quad, reciprocal access, 2022 "special strategic partnership" |
| Australia | China | **TENSE** | AUKUS subs, SCS; trade dispute easing but strategic rivalry |
| South Korea | China | **TENSE** | Trade + THAAD history + North Korea; balanced economically |
| France | Russia | **HOSTILE** | Ukraine war; Macron's earlier dialogue attempts failed |
| Germany | Russia | **HOSTILE** | Ukraine war ended Ostpolitik-era dependence; energy decoupling |
| Finland/Sweden | Russia | **HOSTILE** | Joined NATO 2023/2024 after invasion; long shared border |
| India | China | **TENSE** | LAC/Ladakh, Arunachal; both in BRICS/SCO [Al Jazeera Aug 2026] |
| China | North Korea | **FRIENDLY** | Historic alliance; wary of NK–Russia drift [RAND] |
| China | Russia | **ALLY (no limits)** | Anti-Western partnership; de-facto axis with NK [RAND] |
| Japan | North Korea | **HOSTILE** | NK missile overflights/abduction issue; US umbrella |
| Greece | Cyprus | **ALLY** | Greek-Cypriot kinship vs. Türkiye; EU membership |
| Turkey | Cyprus | **TENSE** | Turkish-occupied north; guarantor role; gas disputes |
| Egypt | Ethiopia | **TENSE** | Nile/GERD dam dispute; Horn rivalry |
| Morocco | Algeria | **TENSE** | Western Sahara backing of Polisario; closed land border |
| Saudi Arabia | UAE | **FRIENDLY/TENSE** | Gulf allies but rivalry (Sudan RSF backing, economic) [UN/Sudan Tribune] |
| India | Japan | **FRIENDLY** | Quad, infrastructure, antipathy to China |
| India | Israel | **FRIENDLY** | Defense/tech trade (post-1992); de-hyphenated from Palestine under Modi |
| Brazil | Russia | **NEUTRAL/FRIENDLY** | BRICS, non-aligned on Ukraine, trade |
| Brazil | China | **FRIENDLY** | Top trade partner, BRICS |
| South Africa | China/Russia | **FRIENDLY** | BRICS; neutral on Ukraine; spoiler via ICJ Gaza case |
| Indonesia | China | **TENSE/FRIENDLY** | Heavy trade/belt-road but Natuna/SCS & South China Sea concerns; BRICS 2026 |
| Mongolia | China/Russia | **NEUTRAL** | Economy squeezed between the two; "third neighbor" diplomacy with West |
| Kazakhstan | Russia | **FRIENDLY** | CSTO/Eurasian Union; 2022 Russia "helped" him; rising China ties |
| Gulf (Qatar, Kuwait, Bahrain) | Iran | **TENSE/FRIENDLY** | Trade/energy pragmatic; GCC-IR coalition-split; Qatar closer to Iran |

*(Pairs marked `FRIENDLY/ALLY-ish`, `TENSE/FRIENDLY`, etc. are the ones the design team should treat as **swingable** — assign a baseline and let drift resolve it. These are the most interesting for gameplay: e.g., Türkiye–Russia, Saudi–Israel, India–US.)*

### 5.1 Foreign-policy buckets for the "World" map (quick reference)
These are the groupings a designer can reuse rather than recompute each pair. A nation can sit in more than one bucket (e.g., India is Western-leaning *and* BRICS *and* Russia-friendly — that is what makes it a hedge, see 5.2).

| Bucket | Nations | Typical default relation to the West | Typical default relation to Russia–China |
|---|---|---|---|
| **Western core** | US, UK, Canada, Australia, NZ, Japan, South Korea, most NATO (France, Germany, Nordics, Baltics, Poland...) | ALLY (self) | HOSTILE |
| **European resisters-of-Russia but independent** | France, Germany, Italy, western EU, JEF | ALLY self | HOSTILE |
| **NATO swing-states** | Türkiye, Hungary (Orbán often pro-Russia) | FRIENDLY (allied) but frictional | TENSE-to-FRIENDLY (hedged) |
| **US security-proxies in the Middle East** | Israel, plus US-guaranteed Gulf (Saudi, UAE, Bahrain, Jordan, Egypt) | ALLY / FRIENDLY | TENSE (esp. vs. Iran) |
| **Hedgers / multi-aligned** | India, Türkiye, Brazil, South Africa, Indonesia, Egypt, Saudi, Pakistan (for US historical) | FRIENDLY/NEUTRAL | FRIENDLY/NEUTRAL |
| **Russia+ allies & partners** | Russia, Belarus, (quasi) NK, Iran, Syria, the AES (Mali/Niger/Burkina), Venezuela, Cuba, Nicaragua, Armenia(no—pivoted) | HOSTILE | ALLY/FRIENDLY |
| **China+ partners** | China, Pakistan (all-weather), NK (loose), Russia (no-limits), Cambodia/Laos (client), the SCO | TENSE/HOSTILE (US) | ALLY/FRIENDLY |
| **Russia–China buffer states (Central Asia)** | Kazakhstan, Kyrgyzstan, Tajikistan, Uzbekistan, Turkmenistan, Mongolia | NEUTRAL/FRIENDLY | FRIENDLY (CSTO/SCO) |
| **Global South neutrals** | most of Africa, Latin America, SE Asia, South Asia outside flashpoints | NEUTRAL | NEUTRAL |

---

## 6. GAME IMPLICATIONS — translating this into OpenFront "World" map starting relations

### 6.1 Suggested default starting stance per nation (World map)
- **ALLY (hard mutual-defense) blocs to hardcode:**
  - All 32 **NATO** states = mutual ALLY (esp. the "Five Eyes" core: US, UK, Canada, Australia, NZ + US–Japan, US–South Korea).
  - **Russia–Belarus**, **Russia–North Korea** (2024 mutual-defense treaty), **China–Pakistan** (all-weather), **US–Israel**.
  - The **AES** (Mali, Niger, Burkina Faso) mutually, and each FRIENDLY-to-ALLY with Russia.
- **FRIENDLY (strong but not Art.5):**
  - US–Saudi, US–India, US–Taiwan(de facto), Russia–India, Russia–China, Russia–Iran, China–North Korea, EU-internal, France–UK, Japan–South Korea, Australia–Japan.
- **NEUTRAL (default, swingable):** the bulk of the Global South — Brazil, South Africa, Indonesia, Egypt, Türkiye (vs. West), most African/Arab/ASEAN states, and the "hedgers."
- **TENSE:** China–India, China–Vietnam, China–Malaysia/Brunei, India–Pakistan (ceasefire), Armenia–Azerbaijan, Türkiye–Greece, Türkiye–US, Japan–China, Venezuela–Guyana, Saudi–Iran.
- **HOSTILE:** US/NATO–Russia, US/NATO–China (strategic but *not* at war — consider HOSTILE-flagged rivalry), US–Iran, Israel–Iran, Russia–Ukraine, China–Taiwan, Pakistan–Afghanistan, North Korea–South Korea (and NK–US/Japan), India–Pakistan if you want it hot.

#### 6.1.1 Concrete per-nation starting defaults (implementation-ready)
A flat lookup table a developer can drop into a data file. Columns: nation's **stance toward the Western bloc (US/NATO/EU)**, **stance toward the Russia-led cluster**, **stance toward China (where distinct)**, and **primary starting allies**.

| Nation | vs. West (US/NATO/EU) | vs. Russia-cluster | vs. China | Starts allied to |
|---|---|---|---|---|
| United States | — | HOSTILE | HOSTILE (rivalry) | NATO, JP, KR, AU, IL, UK, CA, PH |
| United Kingdom | ALLY | HOSTILE | TENSE | US, NATO, JEF, AUKUS, Five Eyes |
| France | ALLY | HOSTILE | TENSE | NATO, EU, JEF(observer), Germany |
| Germany | ALLY | HOSTILE | NEUTRAL/TENSE | NATO, EU, France |
| Poland | ALLY | HOSTILE | NEUTRAL | NATO, US, Baltics |
| Baltics | ALLY | HOSTILE | NEUTRAL | NATO |
| Finland/Sweden | ALLY | HOSTILE | NEUTRAL | NATO, JEF |
| Canada | ALLY | HOSTILE | TENSE | NATO, Five Eyes, US |
| Australia | ALLY | HOSTILE | TENSE | AUKUS, ANZUS, Five Eyes, Quad, JP |
| New Zealand | FRIENDLY | NEUTRAL/TENSE | NEUTRAL | Five Eyes, US (no nuclear-policy) |
| Japan | ALLY | HOSTILE | TENSE | US, KR (trilateral), AU, PH |
| South Korea | ALLY | HOSTILE | TENSE | US, JP (trilateral) |
| Philippines | ALLY/FRIENDLY | NEUTRAL | TENSE/HOSTILE | US (EDCA), JP, AU |
| Taiwan (de facto) | FRIENDLY | NEUTRAL | HOSTILE | US (informal), JP, PH mutual |
| India | FRIENDLY | FRIENDLY | TENSE | Quad, US, Japan; BRICS/SCO co-member |
| China | TENSE/HOSTILE | FRIENDLY/ALLY | — | Russia, Pakistan, NK(loose), BRICS/SCO |
| Russia | HOSTILE | — | FRIENDLY/ALLY | Belarus, NK, Iran, Syria, AES, China |
| Belarus | HOSTILE | ALLY | FRIENDLY | Russia (Union State), CSTO |
| North Korea | HOSTILE | ALLY | FRIENDLY | Russia (2024 treaty) |
| Pakistan | FRIENDLY/TENSE | NEUTRAL | ALLY | China, Gulf; TENSE with India & US(after 2026) |
| Iran | HOSTILE | FRIENDLY/ALLY | FRIENDLY | Russia, China, Syria, Houthis/proxies |
| Saudi Arabia | FRIENDLY | TENSE | NEUTRAL/FRIENDLY | US, GCC, (Israel-quiet); Iran-détente |
| UAE | FRIENDLY | NEUTRAL | NEUTRAL | US, France; rift w/ Saudi |
| Israel | ALLY | TENSE | NEUTRAL | US; quiet-Gulf; HOSTILE Iran |
| Türkiye | FRIENDLY(w/ friction) | TENSE/FRIENDLY | NEUTRAL | NATO, Azerbaijan; swing-node |
| Greece | ALLY | NEUTRAL/TENSE | NEUTRAL | NATO, EU, Cyprus; TENSE w/ Türkiye |
| Cyprus | FRIENDLY/ALLY | NEUTRAL | NEUTRAL | EU, Greece; TENSE w/ Türkiye |
| Armenia | FRIENDLY | TENSE | NEUTRAL | West-pivot, TENSE w/ Azerbaijan |
| Azerbaijan | FRIENDLY/TENSE | NEUTRAL/FRIENDLY | NEUTRAL | Türkiye, Israel; TENSE w/ Armenia |
| Egypt | FRIENDLY | NEUTRAL | NEUTRAL/FRIENDLY | US, Gulf, Arab League |
| Ethiopia | NEUTRAL/TENSE | NEUTRAL | FRIENDLY | China, Russia-lean; TENSE Somalia |
| Brazil | NEUTRAL/FRIENDLY | NEUTRAL/FRIENDLY | FRIENDLY | BRICS; non-aligned |
| South Africa | NEUTRAL | FRIENDLY | FRIENDLY | BRICS |
| Indonesia | NEUTRAL/FRIENDLY | NEUTRAL | TENSE/FRIENDLY | ASEAN, BRICS 2026, non-aligned |
| Vietnam | FRIENDLY | NEUTRAL | TENSE | ASEAN; balancing US-China |
| Nigeria | NEUTRAL/FRIENDLY | NEUTRAL | NEUTRAL | ECOWAS, AU |
| Mali/Niger/Burkina | TENSE (vs France) | FRIENDLY | NEUTRAL/FRIENDLY | AES, Russia (Africa Corps) |
| Sudan (SAF) | NEUTRAL/TENSE | FRIENDLY | NEUTRAL/FRIENDLY | Egypt, Iran, Russia-lean (vs RSF) |
| RSF/Sudan (faction) | NEUTRAL | — | — | UAE-backed (opposed by SAF) |
| Ghana/Senegal/Cote | FRIENDLY/ALLY | TENSE | NEUTRAL | ECOWAS, France/West |
| Venezuela | TENSE/HOSTILE | FRIENDLY | NEUTRAL | Russia, China, Cuba, Nicaragua |
| Guyana | FRIENDLY/ALLY | NEUTRAL | NEUTRAL | US, UK, EU, CARICOM; TENSE Venezuela |
| Mexico/Colombia | FRIENDLY/NEUTRAL | NEUTRAL | NEUTRAL | US (economic), regional |
| Cuba/Nicaragua | HOSTILE/TENSE | FRIENDLY | NEUTRAL/FRIENDLY | Russia, China, Venezuela |
| Kazakhstan/Uzb/Kyrg/Taj | NEUTRAL/FRIENDLY | FRIENDLY | FRIENDLY | CSTO/SCO, Russia, China |

*(Defaults shown are "in-being" relation-toward-bloc; a neutral like India sits NI (neutral) on the A-vs-B axis and its real edge cases are the TENSE rows. Rows of "ALLY" denote hard treaty or ironclad partnership; everything else drifts.)*

### 6.2 Which nations start effectively allied in a way that changes early-game balance (design notes)
1. **The Pacific firewall:** In any "World" start, the **US–Japan–South Korea–Australia(-Philippines-Taiwan)** cluster is a *marine-heavy allied block* facing **China** (with NK and Russia backing China's flank). This is the single most consequential early-game power balance — it mirrors reality that the Taiwan Strait & SCS are the hottest zone. Recommend China start with strong economic/tech (production) advantages but no early allies-in-being beyond the Russo-Korean shadow; the US bloc starts coordinated but spread out.
2. **The European bloc is monolithic vs. Russia:** Because NATO=32 and JEF/EU rearm, **Russia should start cold-isolated in Europe** except Belarus — if you want the game to reflect reality, Russia must conquer or coerce its way into European influence rather than start with partners. Consider a NEUTRAL "non-aligned" Austria/Finland-type hinge and Türkiye as the swing state (NATO-member but Russian-adjacent).
3. **The Middle East hinge-zone:** With Iran **decapitated/weakened after the 2026 war**, the Gulf (Saudi/UAE) tilts **US/Israel-friendly**, and Israel is a **US-guaranteed regional power**. Iran should start weakened but Russia/China-backed — a strong "rival faction" with proxy tools rather than raw strength. Saudi is the swing state (US-economic vs. Iran-détente vs. Israel-normalization).
4. **The India wildcard:** India is **the classic swing/hedge** — in the Quad (West) *and* BRICS/SCO *and* friendly to Russia. Recommend India start **NEUTRAL** toward both blocs with a deterministic drift option, mirroring its real "multi-alignment." Its relations with **China (TENSE)** and **Pakistan (ceasefire-HOSTILE)** are the real early-game pressure points.
5. **Proxy zones to seed conflict without state-to-state war:** **Sudan** (SAF vs. RSF; UAE/RSF, Russia&Iran/SAF) and the **Sahel** (AES-France/Russia proxy) and **Venezuela–Guyana** (Essequibo) give the map organic, realistic conflict nodes where external powers fight through clients — great for mid-game escalation without hardcoding great-power war.
6. **Frozen/ratification states:** **Armenia–Azerbaijan** (treaty signed, unratified) and **India–Pakistan** (ceasefire) are *TENSE-not-war* starting states that let players push either toward peace or war — good "player agency" design, mirroring reality that these are unresolved-but-constrained.

### 6.3 Caveats for game design
- **Bloc membership ≠ war alliance.** SCO/BRICS members include mutual rivals (India–China, India–Pakistan). Do **not** let membership drag a neutral into a hostile bloc automatically.
- **Versioning:** The 2026 Iran war, Russia–Ukraine energy ceasefire, Pakistan–Afghanistan open war, and Maduro's capture are all *fast-moving*. Expose starting-relations as data/config so a patch can flip a HOSTILE→CEASEFIRE or vice versa as the real world moves.
- **Strategic ambiguity vs. ironclad:** US–Taiwan and US–India are the two most mis-scaled if hardcoded as ALLY; keep them FRIENDLY with conditionality.

### 6.4 Ballpark military-balance snapshot (who out-guns whom, for tuning)
For tuning starting strength, here is the rough **conventional-power hierarchy** and where the big league-clusters land. These are qualitative, not exact numbers (exact figures evolve; design should expose strength as data).

| Bloc / league | Rough composition (2025–26) | Balance flavor |
|---|---|---|
| **US + NATO core (US, UK, France, Germany, Italy, Poland, Nordics, Baltics, Canada, Japan, South Korea, Australia)** | The globe's dominant air/sea/intel/tech + 3 of 5 Five Eyes + 2 of the 5 "nuclear" greats (UK, France independent deterrents under NATO/EU) + Japan/ROK/Australia navies | Numerical supremacy in carrier-capable navies, stealth air, space/C4ISR, and a unified command (NATO) — but *global* commitments stretch it thin (must defend Europe *and* the Pacific simultaneously — the classic "two-front" problem). |
| **China (alone)** | World #1 or #2 defense budget; huge, modernizing navy/air/PLA; hypersonics | Peer-competitive regionally; unmatched capacity to threaten Taiwan/SCS; but no true formal allies (Russia/NK/Pakistan are partners of convenience, not Art.5-style). |
| **Russia** | Massive land/artillery/EW force, nuclear-triad superpower; but degraded armor/air and attrition loss in Ukraine | Borderline-peer in Europe with nuclear guarantee; conventionally blunted by the Ukraine war; strong in EW/missiles and proxy tools. |
| **Russia+Near-Axis (Belarus, North Korea, Iran, Syria, Sahel AES)** | Nuclear (Russia, NK), NK's millions of soldiers + artillery, Iran's missile/drone axis | Formidable "coalition of the weak-adjacent" — dangerous in aggregate (NK artillery can saturate Seoul; Iran missiles reach Israel/Arabia), but economically strained and internally disunited (NK distrusts Iran's high-maintenance axis; Russia rivals China mildly). |
| **India** (swing) | World's largest army by personnel, own nuclear triad, fast-growing navy/defense industry | Top-4 conventionally; backs neither bloc; its China/Pakistan borders are its only real theaters. |
| **Second-tier powers (Türkiye, Pakistan, Israel, Saudi/UAE, Brazil, Egypt, South Africa, Indonesia, Vietnam, Azerbaijan)** | Regional military leaders or major buyers (S-400/F-35, drones) | Capable of decisive *regional* outcomes and of flipping a local fight, but not global peers. Useful as "force multipliers" and spoilers. |

**Key balance insight for OpenFront:** because the **US/NATO bloc** out-guns anyone conventionally but is two-fronted, and **Russia/China** each exceed one region while lacking formal allies — the realistic tension is *"the West is individually stronger but organizationally burdened; the anti-Western bloc is looser but geographically contiguous & unsentimental."* A good game economy would reward the Western bloc for coordination (allied-buff) and the anti-Western bloc for interior lines / autarky, and let the middle powers decide where they tilt.

---

### Source note
This file is research only — no game code. Primary sources consulted for the 2026 snapshot include: **ISW/UnderstandingWar & Critical Threats** (Russian & China-Taiwan Campaign Assessments, Oct 2026), **CFR Global Conflict Trackers** (Ukraine, Iran, Sudan, SCS, India-Pakistan, Armenia-Azerbaijan, Venezuela-Guyana), **CRS/Congress.gov** (IF10472 North Korea; IF12760 Russia-DPRK; R48887 US-Iran; IF12113 AUKUS/Indo-Pacific), **NATO.org**, **Chatham House**, **38North**, **RAND**, **Asia Society**, **Reuters/AP/Al Jazeera/BBC/France24/Reuters-dated pieces**, and **national/government statements** (State Dept, Gov.UK, India's brics2026.gov.in). Where sources conflicted (e.g., BRICS member count, Saudi's membership status), the official 2026 Indian chair site was given precedence and the discrepancy noted. Facts are current to **12 October 2026**.

---

## 7. REGIONAL THEATRE SUMMARIES (at-a-glance for scenario building)

A region-by-region consolidation of the relation matrix into "who is on whose side here" — useful when building a regional campaign or a sub-map.

### 7.1 North America & the Atlantic
- **US–Canada–UK–Australia–NZ** = the Five Eyes/Euro-Atlantic core; unbreakable intelligence/military ties. Canada and UK are the closest US allies after Israel.
- Atlantic friction is **internal to the West** (Trump trade pressure, US–Canada/US–EU tariff rows) — not a strategic split.

### 7.2 Europe (continent)
- **Big picture:** NATO+EU+JEF is a **united anti-Russia bloc**; the only real defectors/frictions are **Hungary** (Orbán's Russia ties) and **Türkiye** (a NATO member that orbits between blocs and bickers with Greece). Serbia resists NATO/EU alignment (Russia-friendly, EU-bid).
- **Ukraine** is in a hot defensive war, supported collectively; **Belarus** is the lone pro-Russia European country (Union State).
- **To seed a European campaign:** the natural early game is **NATO-vs-Russia (via Ukraine/Belarus)**, with **Türkiye** as the swing that can tip the southern flank, and **Cyprus–Greece–Türkiye** as a secondary NATO-internal puzzle.

### 7.3 Middle East & North Africa
- **The regional power map post-2026:** **US–Israel–Saudi/UAE/Egypt–Gulf** vs. **a weakened Iran + Russia/China backing + proxies (Houthis, Hezbollah-degraded, Iraqi militias, Hamas)**.
- **Nigeria/Egypt/GCC** stay Western-leaning; **Syria** is the Russia/Iran protectorate vs. US Kurds & Türkiye; **Libya** fragmented (Russia leans on Haftar), **Sudan** is the proxy flashpoint.
- **To seed a Mideast campaign:** start with the **Iran–Israel–US** HOSTILE core, make **Saudi** the pivotal neutral, and let **Iran's proxies** act as low-cost conflict engines without forcing state-on-state war.

### 7.4 Asia-Pacific & Indo-Pacific
- **The densest alliance architecture on Earth:** US–Japan, US–South Korea, ANZUS/AUKUS (US–UK–Aus), Quad (US–JP–IN–AU), SQUAD (US–JP–AU–PH), Five Eyes, US–Japan–ROK trilateral, Japan–Philippines–US trilateral.
- **Against it:** China + North Korea (loose) + Pakistan (west flank) + Russia (north). **India** is the great wildcard — in the Quad *and* BRICS/SCO.
- **Flashpoints (hot or latent):** Taiwan Strait (the big one), South China Sea (Philippines/Vietnam/Malaysia/Brunei), Senkaku/Diaoyu, Korean Peninsula, and the India–China LAC.
- **To seed an Indo-Pac campaign:** the whole map's center of gravity. Default = **US-bloc vs. China** with **NK** attached to Russia, **India neutral**, and the **SCS/Taiwan** as the ignition.

### 7.5 South & Central Asia
- **South Asia:** **India–Pakistan** (nuclear, 2025 ceasefire) and **India–China** (border) are the axes; **Pakistan–Afghanistan** is in an **open 2026 war**. Pakistan = China's all-weather ally; India = the hedge. Notional Central Asian states (Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan, Turkmenistan, Mongolia) sit **between Russia and China**, economically squeezed, CSTO/SCO members.
- **To seed a Central/South Asia campaign:** start **India–Pakistan TENSE** and **Pakistan–Afghanistan HOSTILE**, keep India **NEUTRAL** on the great-power axis (its real rivalry is land-based with China/Pakistan), and let Central Asia tilt in response to whichever pole pressures them.

### 7.6 Sub-Saharan Africa
- **West divide:** the coastal **ECOWAS** bloc (Nigeria, Ghana, Senegal, Côte d'Ivoire — Western/French-allied) vs. the **AES juntas** (Mali, Niger, Burkina Faso — Russian Africa Corps). 
- **Sudan** is a full-blown internal war (SAF vs. RSF) with external patrons (UAE/RSF; Egypt-Iran-Russia/SAF). **South Sudan** mediates. **East Africa/Horn** (Ethiopia, Somalia) has Gulf/Russia/China in-mixing.
- **To seed an African campaign:** use the **Sahel proxy war** (Russia vs. West) and **Sudan civil war** as the conflict engines; Nigeria/Ghana as the pro-Western regional powers; keep most of the continent NEUTRAL.

### 7.7 Latin America & the Caribbean
- **Leftist "Bolivarian" camp:** Venezuela, Cuba, Nicaragua (Russia/China-friendly; post-Maduro Venezuela shaken); **Brazil** (Lula) and Mexico/Colombia are **non-aligned/neutral**, balancing with both blocs.
- **Guyana–Venezuela (Essequibo)** is the live territorial dispute, with the West (oil/US/UK) backing Guyana.
- **To seed a LatAm campaign:** it is mostly NEUTRAL; the interesting inputs are **Venezuela (post-2026 weakness)**, the **Essequibo case**, and economic/trade pulls from both the US and China. Good for a low-heat, economic/coercion-focused theater.

> **End of file.** Next research track suggestion: correlate this alignment map with the *map-generator* nation list in this repo, and generate a machine-readable `starting_relations.json` from §6.1.1. (Not done here — this document is research only.)
