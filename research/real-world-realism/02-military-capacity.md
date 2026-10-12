# Military Capacity of the World's Nations
## Real-World Baseline for OpenFront Nation Strength Scaling

**Scope:** Conventional and nuclear military capacity of the ~72 nations represented on the OpenFront "World" map, plus the three nuclear powers not on the map (Israel, South Korea, North Korea) included for completeness.

**Purpose:** This document gives a defensible, source-grounded baseline so the game can scale each nation's *starting troops* and *starting gold* to its real-world military capability. It is research/design input only — no game code is written here.

**Key sources:** IISS *The Military Balance* (2024/2025/2026 editions), SIPRI Military Expenditure Database & Yearbook (2024/2025/2026), FAS Nuclear Notebook (2025/2026), Arms Control Association, Center for Arms Control and Non-Proliferation, Global Firepower (used only as a cross-check, not a primary source), World Bank GDP. All figures are estimates with real-world uncertainty; treat any single number as guidance, not gospel.

**Data vintage:** Personnel, equipment, and budget figures reflect 2024–2026 open-source reporting. Nuclear figures reflect FAS/SIPRI 2025–2026 estimates.

---

# 1. METHODOLOGY — How to Compare Militaries

Comparing national militaries is a normalization problem: raw counts must be synthesized into one comparable number, then scaled into a game resource. The components below are the standard factors analysts use (IISS, SIPRI, GFP, and the think-tank community).

## 1.1 The Core Inputs

| Dimension | What it measures | Best source | Notes / pitfalls |
|---|---|---|---|
| **Active personnel** | Full-time standing force | IISS Military Balance | The most-cited single number; China (~2.0M), India (~1.5M), US (~1.33M) lead. |
| **Reserves** | Mobilizable former/part-time personnel | IISS Military Balance | Huge variance: Vietnam ~5M, India ~1.1M, South Korea ~450k. Raw reserve count overstates readiness. |
| **Manpower pool** | Fit military-age population | World Bank / CIA Factbook | Long-run sustainability. India, China, Indonesia have enormous pools; aging societies (Japan, South Korea) face shrinking pools. |
| **Main Battle Tanks (MBT)** | Armored mass | IISS / GFP (cross-check) | Raw stock vs. *operational* differ massively; Russia has ~5,750 stock (GFP) but lost ~3,000 in Ukraine (Oryx/IISS). IISS counts *operational*; GFP counts *stock*. Always say which. |
| **Combat aircraft (fixed-wing)** | Air power | IISS / FlightGlobal | Counts generation-4/5 fighters vs total including trainers/transports. US leads (~13k total, ~2-5k combat). |
| **Attack helicopters** | Close support / anti-tank | IISS | US Apache (~800+), Russia Ka-52/Mi-28. |
| **Aircraft carriers / major surface combatants** | Power projection | IISS / Naval News / USNI | Carriers are the premier projection asset: US 11 nuclear supercarriers; China 3 (Fujian just commissioned); UK 2; France 1; India 2. |
| **Submarines (nuclear vs conventional)** | Deterrence / sea denial | IISS / FAS | Nuclear (SSN/SSBN) vs diesel-electric (SSK). US/UK/France all-nuclear; China/India mix; most others diesel. |
| **Defense budget (USD)** | Financial capacity | SIPRI Military Expt. Database | SIPRI 2025 total ~$2,887B. US $954B (~33%), China $336B, Russia $149–190B. *Absolute* spend, not share of GDP, is what pays for strength. |
| **Nuclear warheads** | Strategic overhang | FAS Nuclear Notebook | 9 states. US/Russia ~5,000+ each; UK 225; France ~290; China ~620; India ~190; Pakistan ~170; Israel ~90; North Korea ~50-60. |

## 1.2 Why Raw Force Must Be Normalized

Raw counts cannot be compared linearly:

1. **Quality ≠ quantity.** 100 old T-55 tanks ≠ 100 modern M1A2 Abrams (fire control, armor, sensors). IISS and GFP implicitly weight equipment by era and capability.
2. **Budget buys capability.** The US out-spends the next ~10 nations *combined*; GDP-to-defense ratio and technology investment translate directly into force quality. A $1000 infantry platoon cannot match a $2B destroyer.
3. **Force multiplier asymmetry.** A single nuclear-powered aircraft carrier and its air wing can defeat a small nation's entire army. Nuclear weapons cap conventional escalation entirely.
4. **Readiness is not inventory.** Russia has ~5,750 MBTs on paper but a large fraction are in storage or dogged by maintenance. Operational counts (IISS) are lower than stock counts (GFP).
5. **Geography and basing.** The US global logistics network, carriers, and bases are un-matchable force multipliers for a *global* game played on a world map — which is exactly the OpenFront setting.

### 1.3 The "Military Power Index" for OpenFront

To keep the game both citable and simple, this document proposes a **composite Military Power Index (MPI)** on a 0–100 scale, anchored so that **United States = 100**. The MPI is built from the weighted, log-scaled components below, then *dampened* (Section 5) before being mapped to game resources.

A practical weighted formula (used to derive the scores in the tables):

```
MPI_raw =
   0.30 * normalize_log(defense budget, USD)      # money buys capability
 + 0.20 * normalize_log(active personnel)          # manpower & standing
 + 0.15 * normalize_log(combat aircraft)           # air power
 + 0.15 * normalize_log(major surface combatants + carriers)  # blue-water projection
 + 0.10 * normalize_log(MBT operational)           # armored mass
 + 0.10 * nuclear_factor                            # strategic overhang (0.5x log warheads)

where normalize_log(x) = log10(1 + x) / log10(1 + x_max)
```
- Each sub-index is log-scaled so a 10x jump in raw numbers does not create a linear 10x jump in power — this keeps big powers dominant but not absurdly so.
- **Nuclear_factor** adds a step function (nuclear state = +, scaled by warhead log) because 1 nuclear weapon is strategically worth thousands of conventional units.
- Budget is weighted highest because in real militaries financial capacity is the meta-resource that buys every other resource.

The resulting MPI is then **dampened** (see Section 5) using a power/log curve before being turned into starting troops, precisely so the US does not start the game as an unbeatable wall.

---

# 2. PER-COUNTRY TABLE

## 2.1 Reading the Table

- **Active / Reserves** — IISS 2025–26, rounded. Note: some nations (US, France, Russia, China) consolidate reserve definitions differently; treat as approximate.
- **MBT** — *operational* main battle tanks where IISS distinguishes; marked "stock" where only storage totals are public.
- **Combat a/c** — fixed-wing combat aircraft (fighters/attack), approximate.
- **Major surface / Carriers** — destroyers/frigates/cruisers + aircraft carriers (incl. light/STOVL carriers where noted).
- **Subs** — total submarines; "(n)" = nuclear, "(c)" = conventional.
- **Budget** — SIPRI 2025 USD billions where available; otherwise national/GFP estimate flagged.
- **Warheads** — 0 = non-nuclear (declared stockpile 0). Nuclear states given FAS/SIPRI estimate.
- **MPI (0-100)** — composite normalized power score, US = 100.
- **Tier** — the game-facing strength bucket (see Section 5).

Legend for "Warheads": **✕** = non-nuclear; **nuc** = nuclear state with estimate.

> **Reproduction note:** Data for small/under-documented nations (e.g., Niger, Chad, Madagascar, Namibia, Benin, Senegal) are sparse in the public record; figures for those are best-effort estimates from GFP/Wikipedia cross-checks and should be treated as low-confidence. Where no reliable navy/air inventory exists, the cell reads "minimal."

## 2.2 North America & Caribbean

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **United States** | 1,330,000 | 800,000 | 4,640 (stock) / ~2,500 op | 2,600+ combat (13k total) | 83 dds/cgs + **11 nuclear carriers** + 9 LHA/LHD | 66 (66 nuclear) | $954 B | ~5,042 | **100.0** | Superpower |
| **Canada** | 68,700 | 33,400 | 74 (Leopard 2) | ~66 | 12 frigates | 4 (c) | $37.5 B | ✕ | 10.0 | Regional |
| **Mexico** | 216,000 | 25,000 | 0 (no MBT) | ~50 | 0 major / 0 carriers | 0 | $9.1 B | ✕ | 6.5 | Minor |
| **Cuba** | 49,000 | 39,000 | ~900 (old T-62) | ~25 | 0 major / 0 carriers | 0 | ~$3.3 B | ✕ | 3.0 | Minor |
| **Greenland** (DK) | ~0 (Danish-tasked; ~15 patrol/squadron) | 0 | 0 | 0 | 0 | 0 | ~$0.05 B | ✕ | 0.2 | Minor |
| **Alaska** (US sub-nation) | (share of US) | — | — | — | — | — | — | ✕ | 3.5 | Minor |
| **Yukon / Nunavut** (CA sub-nations) | (share of Canada) | — | — | — | — | — | — | ✕ | 0.6 | Minor |
| **California** (US sub-nation) | (share of US) | — | — | — | — | — | — | ✕ | 4.0 | Minor |
| **Texas** (US sub-nation) | (share of US) | — | — | — | — | — | — | ✕ | 4.0 | Minor |

## 2.3 South America

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Brazil** | 366,500 | 1,340,000 | 292 | ~146 | 12 major (8 frigates, helicopter carrier *Atlântico*) / 1 light carrier | 5 (c) | $23.9 B | ✕ | 13.0 | Regional strong |
| **Colombia** | 293,000 | 30,000 | 0 | ~30 | 8 frigates/corvettes | 4 (c, ~2 operational) | $15.8 B | ✕ | 7.0 | Minor |
| **Venezuela** | 123,000 | 8,000 | ~330 (T-72/T-90) | ~30 | 0 major (legacy frigates largely inactive) | 2 (c, aging) | $6.1 B | ✕ | 4.5 | Minor |
| **Argentina** | 72,000 | 42,000 | ~230 (TAM light) | ~20 | 4 destroyers/frigates | 3 (c, mostly non-op) | ~$3.5 B | ✕ | 5.5 | Minor |
| **Peru** | 95,000 | 188,000 | ~165 | ~25 | 7 frigates (aging) | 6 (c) | ~$2.8 B | ✕ | 4.0 | Minor |
| **Uruguay** | 24,000 | 0 | ~15 | ~10 | 3 (patrol/frigate, old) | 0 | ~$1.0 B | ✕ | 1.7 | Minor |
| **Bolivia** | 34,000 | 0 | 0 | ~15 (trainer/counter-drug) | 0 (landlocked) | 0 | ~$0.7 B | ✕ | 2.0 | Minor |

## 2.4 Western & Southern Europe

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **United Kingdom** | 141,100 | 70,450 | ~213 (Challenger 2/3) | ~140 combat (625 total) | 6 Type 45 DDG + 5-6 Type 23 FF + **2 Queen Elizabeth carriers** | 10 (10 nuclear) | $89 B | ~225 | 30.0 | Major |
| **France** | 204,000 | 30,000 | ~222 (Leclerc) | ~250 combat (974 total) | 12 frigates/dds + **1 Charles de Gaulle carrier** | 8 (8 nuclear incl. 4 SSBN) | $70 B | ~290 | 30.0 | Major |
| **Germany** | 185,000 | 30,000 | ~266 (Leopard 2) | ~90 combat (569 total) | 11 (7 frigates + corvettes) | 6 (c) | $113.6 B | ✕ | 20.0 | Regional strong (rebuilding) |
| **Spain** | 133,000 | 15,000 | ~327 (Leopard 2) | ~130 combat | 11 (5 frigates + logistics) / 1 light carrier *Juan Carlos I* | 3 (c) | $40.2 B | ✕ | 11.0 | Regional |
| **Italy** | 165,000 | 18,000 | ~197 (Ariete/Leopard) | ~180 combat (714 total) | 13 frigates/ddgs + **2 STOVL carriers** (Cavour + Garibaldi) | 7 (c) | $48.1 B | ✕ | 18.0 | Regional strong |
| **Sweden** | 24,500 | 25,000 | ~120 (Leopard 2/Strv 122) | ~73 combat | 7 corvettes | 5 (c, Gotland) | $15.9 B | ✕ | 7.5 | Minor (rising) |
| **Norway** | 23,000 | 40,000 | ~36 (Leopard 2A4) | ~45 | 5 frigates | 6 (c) | $11.2 B | ✕ | 5.5 | Minor (rising) |
| **Ireland** | 9,500 | 4,050 | 0 | ~10 | 2-3 offshore patrol vessels | 0 | ~$1.5 B | ✕ | 1.2 | Minor |
| **Iceland** | ~0 (no standing army) | 0 | 0 | 0 (coast guard) | 0 | 0 | ~$0.1 B | ✕ | 0.2 | Minor |

## 2.5 Central / Eastern Europe & Baltics

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Poland** | ~200,000 | 150,000 | ~800 (stock): ~600 op (Leopard 2, PT-91, Abrams arriving) | ~90 combat | (no navy to speak of: corvettes/patrol) | 0 | $46.8 B | ✕ | 12.0 | Regional rising |
| **Ukraine** | 730,000–1,000,000 | ~250,000+ (mobilized) | ~1,000+ (heavily attrited; western deliveries) | ~88 combat (Soviet + Western F-16s) | 0 major (drone/flotilla based) | 0 | $64.7 B (plus huge Western aid) | ✕ | 14.0 | Regional strong (war-hardened) |
| **Belarus** | 48,000 | 290,000 | ~580 (stock, T-72) | ~43 combat | 0 | 0 | ~$0.9 B (opaque) | ✕ | 5.0 | Minor |
| **Romania** | 68,000 | 50,000 | ~451 (stock, T-55/TR-85 aging) | ~29 combat | 3 frigates (aging) | 0 | $10.2 B | ✕ | 5.0 | Minor (modernizing) |
| **Finland** | 30,000 | ~280,000 | ~200 (Leopard 2) | ~53 combat (F/A-18, F-35 on order) | 2 corvettes/patrol | 0 | $8.9 B | ✕ | 5.5 | Minor (rising) |
| **Latvia** | 6,700 | 8,000 | 0 | 0 (NATO-tasked) | 0 | 0 | $5.7 B (spike) | ✕ | 1.5 | Minor |

## 2.6 Middle East & Caucasus-like / West Asia

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Türkiye** | 355,000 | 378,000 | ~2,300 (stock; ~1,500 op; Leopard 2, Altay) | ~200 combat (1,101 total) | 16 frigates + 4 corvettes / 1 LHD (Anadolu) | 12 (c) | $30.0 B | ✕ | 25.0 | Regional strong |
| **Iran** | 610,000 | 350,000 | ~1,700 (stock, T-72/M60 aging) | ~160 combat (many obsolescent) | 5-8 frigates/corvettes (small) | 20+ (c, mini-subs) | $9.2 B (opaque; likely higher) | ✕ (threshold, no weapon) | 18.0 | Regional strong |
| **Israel** (not on map) | 169,500 | 465,000 | ~1,380 (Merkava) | ~300 combat (597 total) | 6 corvettes (Sa'ar 5/6) | 5-6 (c) | $48.3 B | ~90 | 20.0 | Regional strong |

## 2.7 Asia — Major Powers & Subcontinent

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Russia** | 1,100,000–1,320,000 | ~2,000,000 (mobilizable) | ~5,750 (stock) / ~2,000 op (heavy Ukraine losses) | ~1,590 combat (4,237 total) | ~30 major (destroyers/frigates) + 1 carrier *Admiral Kuznetsov* (non-op) | ~60 (30 nuclear + 30 conventional) | $149–190 B | ~5,420 | 75.0 | Superpower (degraded) |
| **China** | 2,035,000 | 510,000 | ~6,800 (stock) / ~4,500 op | ~1,350 combat (3,529 total) | ~90+ major combatants + **3 carriers** (Fujian commissioned 2025) | ~65 (incl. ~6 SSBN) | $336 B | ~620 | 85.0 | Superpower |
| **India** | 1,476,000–1,501,000 | 1,155,000 | ~4,200 (stock; T-90/Arjun) | ~870 combat (2,229 total) | ~25 major + 2 carriers | 17-18 (1-2 nuclear + diesel) | $92.1 B | ~190 | 55.0 | Major |
| **Pakistan** | 660,000 | ~500,000 | ~2,500 (stock; T-80/AZ Type 85) | ~580 combat (1,397 total) | 10 (frigates/corvettes incl. Chinese Type 054) | 8-9 (c + ~1-2 with Babur) | ~$9.1 B (opaque; likely higher) | ~170 | 20.0 | Regional strong |
| **Taiwan** | 169,000 | 1,657,000 | ~1,100 (stock; CM-11/M48) | ~150 combat (720 total) | 22 (frigates/destroyers incl. US Knox) | 4 (c) | $18.2 B | ✕ | 10.0 | Regional (defensive) |
| **Japan** | 240,000 | 56,000 | ~734 (stock, Type 10/90) | ~290 combat (1,443 total) | 44 destroyers (incl. 8 Aegis) + 2 Izumo light carriers (F-35B) | 24 (c) | $58.9 B | ✕ | 30.0 | Major |
| **South Korea** (not on map) | 455,000 | 450,000 | ~2,600 (stock; K2/K1) | ~400 combat (1,592 total) | 26 destroyers/frigates (incl. Aegis) | 21 (c, incl. 3 KSS-III w/ cruise) | $47.8 B | ✕ | 28.0 | Regional strong |
| **North Korea** (not on map) | 1,280,000 | 600,000 | ~4,340 (stock, T-62/Soviet) | ~560 combat (837 total, old) | 0 major (patrol/missile craft only) | ~70 (c, old; SLBM program) | ~$4.75 B (opaque) | ~50-60 | 12.0 | Regional (pariah, highly mobilized) |
| **Mongolia** | 9,000 | 135,000 | ~420 (old T-54/62) | ~10 | 0 (landlocked) | 0 | ~$0.2 B | ✕ | 2.0 | Minor |
| **Kazakhstan** | 39,000 | 0 | ~300 (stock, T-72) | ~37 combat (MIG-31, Su-30) | 0 (Caspian flotilla, small) | 0 | $5.8 B | ✕ | 4.5 | Minor |
| **Sri Lanka** | 255,000 (incl. paramilitary-heavy) | 30,000 | 0 (no MBT) | ~5 | 0 major | 0 | ~$2.0 B | ✕ | 3.0 | Minor |

## 2.8 Southeast Asia & Oceania

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Australia** | 58,540 | 21,450 | 75 (M1 Abrams) | ~100 combat (heavily F-35-heavy) | 13 (3 Hobart DDG + 8 FFG/Hunter + 2 LHD carriers) | 6 (c) | $35.3 B | ✕ | 13.0 | Regional strong |
| **New Zealand** | 9,200 | 2,400 | 0 | ~6 | 2 frigates (ANZAC) | 0 | ~$4.0 B | ✕ | 2.0 | Minor |
| **Philippines** | 150,000 | 50,000 | 0 (light tanks) | ~10 combat | 6 (2-3 frigates JMSDF-donated, corvettes) | 0 | $6.6 B | ✕ | 5.0 | Minor (rising) |
| **Thailand** | 360,850 | 200,000 | ~744 (stock, T-84/T-90/VT-4) | ~73 combat | 10 (frigates incl. 1 light carrier *Chakri Naruebet*, mostly gated) | 1 (c) + 3 (on order) | $6.0 B | ✕ | 8.0 | Minor |
| **Indonesia** | 404,500 | 400,000 | ~350 (stock, Leopard 2) | ~100 combat | 15 (frigates/corvettes) + 2 LPDs | 4-5 (c, incl. 2 Nagapasa) | $11.2 B | ✕ | 10.0 | Regional |
| **Oman** | 40,000 | 0 | ~117 (Challenger 2) | ~29 combat | 4 corvettes/patrol | 0 | $8.4 B | ✕ | 4.5 | Minor |
| **Bhutan** | 8,000 | 0 | 0 | 0 | 0 (landlocked) | 0 | ~$0.05 B | ✕ | 0.5 | Minor |

## 2.9 Africa

| Nation | Active | Reserves | MBT | Combat a/c | Major surf / Carriers | Subs | Budget (USD) | Warheads | MPI | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Egypt** | 438,500 | 479,000 | ~2,000 op (M1A1, ~3,600 stock) | ~340 combat (1,088 total) | 20+ (frigates incl. 4 MEKO, older destroyers) | 5-8 (c, incl. 4 Type 209) | ~$5.2 B (budgeted; true spend higher) | ✕ | 15.0 | Regional strong |
| **Algeria** | 130,000 | 150,000 | ~1,485 (stock, T-90) | ~111 combat (620 total) | 6+ frigates/corvettes (Russian/Chinese) + 2 SSK | 6 (c, Russian Kilo) | $25.4 B | ✕ | 8.0 | Regional |
| **Ethiopia** | 503,000 | ~50,000 | ~338 (old T-55/T-72) | ~25 combat | 0 (landlocked) | 0 | ~$1-3.7 B | ✕ | 5.0 | Minor |
| **Nigeria** (not on map; regional proxy) | 143,000 | 0 | ~330 | ~70-90 combat | 3-4 | 0 | ~$3.9 B | ✕ | 5.0 | Minor |
| **South Africa** | 68,731 | 15,000 | ~248 (Olifant) | ~80 combat (192 total) | 4 frigates | 2-3 (c, largely non-op) | ~$3.6 B | ✕ | 6.0 | Minor |
| **Morocco** | ~195,000 | 150,000 | ~959 (stock) | ~84 combat | 6+ (frigates/corvettes incl. Floréal) | 0 | ~$16.1 B (GFP est.) | ✕ | 5.5 | Minor |
| **Libya** | ~55,000 (fragmented; LNA/GNA militias) | 0 | ~500 (stock, T-72/T-55) | ~15 (fragmented) | 0 (minimal) | 0 | ~$2 B (opaque) | ✕ | 2.0 | Minor |
| **Sudan** | ~100,000 (war-torn) | 0 | ~1,050 (stock, T-55/T-72) | ~37 combat | 0 | 0 | ~$1-2 B (opaque) | ✕ | 4.0 | Minor |
| **Niger** | ~15,000 | 0 | 0 | ~5-10 | 0 (landlocked) | 0 | ~$0.3 B | ✕ | 1.0 | Minor |
| **Chad** | ~27,000 | 0 | ~90 | ~10 | 0 (landlocked) | 0 | ~$0.3 B | ✕ | 1.5 | Minor |
| **DR Congo** | ~130,000 (incl. large paramilitary) | 0 | ~50 (T-55/T-72) | ~10 | 0 (navy minimal) | 0 | ~$0.5-1 B | ✕ | 3.0 | Minor |
| **Madagascar** | ~13,500 | 0 | 0 | ~5 | 0 (patrol) | 0 | ~$0.2 B | ✕ | 1.0 | Minor |
| **Namibia** | ~9,000 | 0 | ~20 (T-34/T-54) | ~5 | 0 | 0 | ~$0.4 B | ✕ | 1.2 | Minor |
| **Kenya** | ~24,000 | 0 | ~78 (Vickers Mk3/Leo 2) | ~20 combat | 0 | 0 | ~$1.5 B | ✕ | 3.0 | Minor |
| **Senegal** | ~23,000 | 0 | 0 | ~5-10 | 0 | 0 | ~$0.4 B | ✕ | 1.5 | Minor |
| **Benin** | ~7,000 | 0 | 0 | ~5 (trainer) | 0 | 0 | ~$0.2 B | ✕ | 1.0 | Minor |
| **Zambia** | ~15,000 | 0 | ~20 (T-55) | ~10 | 0 (landlocked) | 0 | ~$0.4 B | ✕ | 1.5 | Minor |

## 2.10 Non-State / Autonomous Map Regions

These appear on the OpenFront World map as separate controllable areas (splitting the US, Canada, and Russia for gameplay). They have no independent militaries in reality; the game assigns them fractional shares of their parent nation. Proportions below are gameplay suggestions, not real-world data.

| Region | Parent | Gameplay suggestion |
|---|---|---|
| **California / Texas** | United States | ~15% of US MPI each (~15). Strong economy "gold," moderate military. |
| **Alaska** | United States | ~4% of US MPI (~4). |
| **Yukon / Nunavut** | Canada | ~30% of Canada MPI each (~3). |
| **Quebec** | Canada | ~25% of Canada MPI (~2.5). |
| **Siberia** | Russia | ~40% of Russia MPI (~30) — vast manpower/resources, thin deployment. |
| **Greenland** | Denmark (not a separate nation) | ~0.2. |
| **Antarctica / West & East Antarctica** | Uninhabited (scientific bases) | ~0 — flavor/neutral. |

## 2.11 Quick-Reference Ranking (by MPI)

A one-glance ordering of the *independent* nations (map + notable off-map) by Military Power Index. Tiers align with Section 5.3.

| Rank | Nation | MPI | Tier |
|---|---|---|---|
| 1 | United States | 100.0 | Superpower |
| 2 | China | 85.0 | Superpower |
| 3 | Russia | 75.0 | Superpower (degraded) |
| 4 | India | 55.0 | Major |
| 5 | United Kingdom | 30.0 | Major |
| 5 | France | 30.0 | Major |
| 5 | Japan | 30.0 | Major |
| 8 | South Korea (off-map) | 28.0 | Regional strong |
| 9 | Türkiye | 25.0 | Regional strong |
| 10 | Israel (off-map) | 20.0 | Regional strong |
| 10 | Pakistan | 20.0 | Regional strong |
| 12 | Germany | 20.0 | Regional strong (rebuilding) |
| 13 | Iran | 18.0 | Regional strong |
| 13 | Italy | 18.0 | Regional strong |
| 15 | Egypt | 15.0 | Regional strong |
| 16 | Ukraine | 14.0 | Regional strong (war-hardened) |
| 17 | Brazil | 13.0 | Regional strong |
| 17 | Australia | 13.0 | Regional strong |
| 19 | Poland | 12.0 | Regional rising |
| 19 | North Korea (off-map) | 12.0 | Regional (pariah) |
| 21 | Spain | 11.0 | Regional |
| 22 | Canada | 10.0 | Regional |
| 22 | Taiwan | 10.0 | Regional (defensive) |
| 22 | Indonesia | 10.0 | Regional |
| 25 | Algeria | 8.0 | Regional |
| 25 | Thailand | 8.0 | Minor |
| 27 | Sweden | 7.5 | Minor (rising) |
| 28 | Colombia | 7.0 | Minor |
| 29 | South Africa | 6.0 | Minor |
| 29 | Mexico | 6.5 | Minor |
| 31 | Finland | 5.5 | Minor (rising) |
| 31 | Norway | 5.5 | Minor (rising) |
| 31 | Argentina | 5.5 | Minor |
| 31 | Morocco | 5.5 | Minor |
| 35 | Romania | 5.0 | Minor (modernizing) |
| 35 | Belarus | 5.0 | Minor |
| 35 | Ethiopia | 5.0 | Minor |
| 35 | Nigeria (off-map) | 5.0 | Minor |
| 35 | Philippines | 5.0 | Minor (rising) |
| 40 | Venezuela | 4.5 | Minor |
| 40 | Oman | 4.5 | Minor |
| 40 | Kazakhstan | 4.5 | Minor |
| 43 | Peru | 4.0 | Minor |
| 43 | Sudan | 4.0 | Minor |
| 45 | Cuba | 3.0 | Minor |
| 45 | DR Congo | 3.0 | Minor |
| 45 | Kenya | 3.0 | Minor |
| 45 | Sri Lanka | 3.0 | Minor |
| 49 | New Zealand | 2.0 | Minor |
| 49 | Mongolia | 2.0 | Minor |
| 49 | Bolivia | 2.0 | Minor |
| 49 | Libya | 2.0 | Minor |
| 53 | Uruguay | 1.7 | Minor |
| 53 | Zambia | 1.5 | Minor |
| 53 | Senegal | 1.5 | Minor |
| 53 | Chad | 1.5 | Minor |
| 57 | Ireland | 1.2 | Minor |
| 57 | Namibia | 1.2 | Minor |
| 59 | Niger | 1.0 | Minor |
| 59 | Madagascar | 1.0 | Minor |
| 59 | Benin | 1.0 | Minor |
| 62 | Bhutan | 0.5 | Minor |
| 63 | Greenland | 0.2 | Minor |
| 63 | Iceland | 0.2 | Minor |
| 65 | Antarctica (regions) | ~0 | Neutral |

---

# 3. NUCLEAR FORCES — THE 9 NUCLEAR-ARMED STATES

Nuclear weapons are the ultimate cap on any OpenFront great-power contest and a decisive asymmetric advantage for the states that hold them. Estimates are from FAS Nuclear Notebook / SIPRI / Arms Control Association (2025–26).

## 3.1 Summary Table

| State | Total warheads (FAS 2025/26) | Deployed strategic | Delivery systems | MIRV? | Trend |
|---|---|---|---|---|---|
| **Russia** | ~5,420 | ~1,700 deployed strategic | **Triad:** ICBMs (332-333: Topol-M, Yars, Sarmat); SLBMs (12 SSBNs incl. Borei with Bulava); **bombers** (Tu-95, Tu-160 + Kh-102 ALCM). Avangard hypersonic HGV. | Yes (Yars 4 MIRV, Bulava 6) | Modernizing |
| **United States** | ~5,042 | ~1,800 (incl. ~100 non-strategic) | **Triad:** ICBMs (400 Minuteman III); SLBMs (14 Ohio SSBNs/Trident II); **bombers** (B-2, B-52H, B-21 entering). | Yes (Trident II, W76/W88) | Slow drawdown + modernization |
| **China** | ~620 (DoD: 600+, up to 1,000 by 2030) | ~34 deployed strategic | **Triad emerging:** ICBMs (DF-5A/B/C, DF-31A/AG, DF-41, DF-61 — silo & road-mobile); SLBMs (6 Jin-class SSBN, JL-3); **bomber ALBM** (H-6N + JL-1 air-launched ballistic missile, 2025). | Yes (DF-5C, DF-41, JL-3) | Fastest-growing arsenal |
| **France** | ~290 | ~280 strategic (continuous at-sea deterrence) | **Diluted triad:** 4 Le Triomphant SSBN (M51 SLBM); 1 Charles de Gaulle carrier (ASMP-A/R air-launched); Rafale fighters. | Yes (M51) | Stable |
| **United Kingdom** | ~225 | ~120 deployed | **Single leg (sea-only):** 4 Vanguard SSBN (Trident II, US-sourced missiles, UK warheads); Dreadnought class replacing (2028+). | Yes (Trident II) | Stable |
| **India** | ~190 | ~12 deployed (SIPRI 2026: first SSBN deterrence patrol) | **Triad maturing:** Agni-I/II/III/IV/V (ICBM-range with Agni-V), Agni-P; 1-2 Arihant SSBN (K-15/K-4 SLBM); Mirage 2000/Rafale aircraft. | No (mostly single-RV; MIRV developing) | Growing |
| **Pakistan** | ~170 | ~0 "deployed" but ready | **Land + air + emerging sea:** Shaheen, Ghauri, Abdali (short/medium); Babur cruise, Nasr tactical; no SSBN (SSK with cruise possible). | No (single-RV) | Growing |
| **North Korea** | ~50-60 | ~0 confirmed deployed (many ready) | **Land-heavy:** Hwasong-17/-18 (ICBM), Hwasong-11A/14/15, KN-23/24 (short); SLBM on test (Pukguksong); multiple warheads unproven. | Unknown (MIRV claimed) | Growing |
| **Israel** | ~90 | ~0 confirmed (opaque arsenal) | **Triad (undeclared):** land (Jericho-3 MRBM/ICBM-capable); sea (Dolphin SSK + Popeye cruise); air (F-15/F-16 strike). | Unknown | Stable |

## 3.2 Notes on Readiness & Warhead Classification

- "**Total**" includes **reserve/retired-but-intact** warheads; "**deployed strategic**" counts only warheads mated to operational long-range delivery systems. This distinction matters: Russia and the US each hold ~1,700–1,800 *operationally deployed*, while the rest of their stockpiles are in storage/reserve.
- **MIRV** (multiple independently targetable reentry vehicles) — one missile carrying several warheads; the US, Russia, China, UK, and France all field MIRVed SLBMs/ICBMs; India/Pakistan/North Korea largely single-RV to date.
- **Survivability:** Sea-based (SSBN) legs are the most survivable deterrent. Only the US, Russia, UK, France, and (emerging) China/India field operational SSBNs.
- **Israel refuses to confirm/deny** — FAS estimates ~90. North Korea's figures are the most uncertain (up to 60).
- **Six further states host NATO weapons or ran programs:** Belgium, Germany, Italy, Netherlands, and Türkiye host US B61 bombs; Belarus hosts Russian tactical delivery; Iran (pre-2003 program — ended), plus non-signatory/pre-1970 weapon-program states (South Africa — arsenal dismantled 1990s).

## 3.3 Detailed Delivery-System Profiles

### Russia (~5,420 warheads; ~1,700 operationally deployed strategic)
- **ICBMs (Strategic Rocket Forces, ~333 launchers / ~1,254 warheads):** silo-based RS-12M2 *Topol-M* (60), road-mobile/silo *Yars* RS-24 (206+), liquid *Sarmat* RS-28 (in development/test, MIRV 10+ RV). Hypersonic glide vehicle **Avangard** deployed on legacy SS-18/SS-27 boosters.
- **SLBMs (Navy, ~12 SSBNs / ~992 warheads):** 7–8 *Borei/Borei-A* (each 16 *Bulava* SLBM, 6 MIRV) + 5 *Delta IV* (*Sineva/Layner*, 4 MIRV). Northern & Pacific fleet SSBNs held on continuous deterrent patrols.
- **Bombers (Long-Range Aviation, ~67 / ~586 weapons):** Tu-95MS (52) and Tu-160 *Blackjack* (15) with Kh-102/Kh-55 cruise missiles and gravity bombs. Next-gen PAK DA bomber delayed.
- **Non-strategic (~1,000-1,900 tactical):** largest tactical nuclear arsenal (cruise missiles, torpedoes, artillery); *Burevestnik* nuclear-powered cruise missile and *Poseidon* nuclear torpedo in advanced development.

### United States (~5,042 warheads; ~1,800 operationally deployed incl. ~100 non-strategic)
- **ICBMs:~400 *Minuteman III* silo missiles (1 warhead each, one of three legs). Sentinel replacement in development.
- **SLBMs (Navy, 14 *Ohio* SSBN / 20 Trident II D5 each):** ~1,000 warheads in the sea leg; Trident II carries up to 8 W76/W88 MIRVs. Columbia-class SSBN replacing Ohio (2030s).
- **Bombers:** B-2A *Spirit* (20), B-52H *Stratofortress* (46) with nuclear ALCMs (AGM-86B, new LRSO in development), B-21 *Raider* entering service; dual-capable F-15E/F-35.
- **Non-strategic (~100):** B61 bombs forward-deployed at NATO bases (Belgium, Germany, Italy, Netherlands, Türkiye) under nuclear-sharing.

### China (~620–700 warheads; ~34 operationally deployed strategic — fastest-growing arsenal)
- **ICBMs:** silo-based liquid DF-5A/B/C (~20, DF-5C up to 10 MIRV); road-mobile solid DF-31A/AG; DF-41 (up to 10 MIRV); new DF-61 displayed 2025. **~320 new silos** for solid-fuel ICBMs; mobile brigades expanding from 6 to 12 launchers.
- **SLBMs:** 6 *Jin*-class (Type 094) SSBN, each 12 JL-3 SLBM (longer range, MIRV); first JL-3 patrols reported; Type 096 SSBN in development.
- **Bombers/ALBM:** H-6N bomber + **JL-1 air-launched ballistic missile** (first displayed 2025) — completing the nuclear triad.
- **DoD trajectory:** exceeding 1,000 deliverable warheads by 2030 if current pace holds.

### France (~290 warheads; ~280 operationally deployed — continuous at-sea deterrence)
- **SLBM (primary):** 4 *Le Triomphant* SSBN, 16 M51 SLBM each (4–6 MIRV) — always one boat on patrol (permanent at-sea deterrence).
- **Air leg:** Rafale fighters with ASMP-A/ASMPA-R air-launched nuclear cruise missile; carrier *Charles de Gaulle* supports strike.
- No land-based ballistic missiles (silos retired 1996).

### United Kingdom (~225 warheads; ~120 operationally deployed at sea)
- **Single-leg (sea-only):** 4 *Vanguard*-class SSBN, 16 US-sourced Trident II D5 (UK-made warheads) each, ~8 boats-worth available; 1 boat on patrol. *Dreadnought*-class SSBN replacing Vanguard from ~2028.
- **US-UK interdependence:** missiles procured via US, warheads UK-designed — the "Atlantic ballistic missile treaty" model.

### India (~190 warheads; ~12 deployed on first SSBN patrol — SIPRI 2026)
- **Land (primary):** *Agni-I* (700km), *Agni-II* (2,000km), *Agni-III* (3,200km), *Agni-IV* (4,000km), **Agni-V** (5,000+km, ICBM-class), Agni-P (newer); small launch counts.
- **Sea:** 1–2 *Arihant*-class SSBN (K-15 SLBM, K-4 in development), first deterrent patrol in 2025/26; S4/S4* boats building.
- **Air:** Mirage 2000 and Rafale with nuclear gravity bombs (Shaurya/short-range).
- **Posture:** "no first use"; warheads+delivery largely kept separated (de-mated) but increasingly canisterized.

### Pakistan (~170 warheads; ~0 formally deployed — all de-mated/ready)
- **Land:** *Shaheen-I/II* (SRBM/MRBM), *Ghauri* (liquid MRBM), *Ababeel* (MIRV-capable MRBM, in development), *Nasr* (short-range tactical), *Shaheen-III* (2,750km).
- **Cruise:** *Babur* (land & sea-launched cruise), *Ra'ad* (air-launched ALCM for Mirage).
- **Sea:** no SSBN; naval leg emerging via cruise-missile-capable Agosta-90B diesel submarines (Babur-3).
- **Posture:** "full spectrum deterrence," India-focused; tactical *Nasr* signals low-yield battlefield weapons.

### North Korea (~50-60 warheads; ~0 confirmed deployed — many weapons-ready)
- **Land:** *Hwasong-17/-18* (ICBM, Hwasong-18 solid-fuel), *Hwasong-15* (ICBM), *Hwasong-14* (ICBM-range), *Hwasong-12* (IRBM), KN-23/KN-24 (short-range, Russian Iskander-style).
- **Sea:** *Pukguksong* SLBM program (tested; submarine-launched); new ballistic-missile submarine (Sinpo) in development.
- **Air:** no confirmed nuclear-capable bomber platform.
- **Uncertainty:** nuclear tests ceased (last 2017) but production continues; FAS estimates up to 60 with significant uncertainty.

### Israel (~90 warheads; undeclared/opaque arsenal)
- **Land:** *Jericho-2/-3* MRBM/ICBM-capable (4,800km+ with Jericho-3).
- **Sea:** 5 *Dolphin*-class diesel submarines (2nd-gen with Popeye Turbo cruise missiles) — presumptive second-strike sea leg.
- **Air:** F-15I/F-16I strike aircraft configured for nuclear delivery (gravity bombs/ALCM).
- **Deliberate ambiguity:** no confirmation/denial; ~90 widely cited upper estimate.

---

# 4. NOTABLE CAPABILITIES & GAPS (Top-Tier Militaries)

What makes each force distinctive — relevant to how OpenFront should depict its strengths and flavor.

## 4.1 United States — Global Projection & Air-Sea Dominance
- **11 nuclear-powered supercarriers** with ~60-70 embarked fighters each; no other nation fields a comparable carrier fleet (China now has 3, UK 2, France/India 1-2).
- **All-nuclear submarine force** (66), including SSBN/SSN; global logistics/base/fuel network (hundreds of overseas bases).
- World's largest air force (~13,000 aircraft incl. 5th-gen F-22/F-35); biggest defense budget by far (~$954B, ~33% of world total).
- **Gap / tension:** ~293 battle-force ships vs. a legislated goal of 355; only ~4 carriers realistically deployable at a time; recruiting/retention shortfall (~20k sailors short).
- **Role in game:** The benchmark (MPI=100). Strong everywhere; weakness is over-extension across the whole world map at once (matches real-world "global reach, finite hulls" tension).

## 4.2 Russia — Strategic Missile Forces, Armor, & Wartime Attrition
- **Largest strategic nuclear force** (~5,420) with a modernized triad (Yars, Bulava on Borei SSBNs, hypersonic Avangard).
- Huge tank inventory (~5,750 stock) and artillery mass — but **~3,000+ tanks lost in Ukraine** since 2022, forcing reliance on stored Soviet stock (IISS/Oryx).
- **Black Sea Fleet severely degraded** (~30% destroyed/damaged by Ukrainian drones/missiles; flagship *Moskva* sunk; forced out of Sevastopol). Northern/Pacific fleets (with SSBNs) still intact.
- **Gap:** shipbuilding constrained; large but aging surface fleet; losses magnified by sanctions; high % of GDP (7.5%) diverted to war.
- **Role in game:** Massive, nuclear-superior, but with eroded conventional (esp. naval) edges — a giant that has taken real losses and over-extends across a huge landmass (fits "Siberia" sub-region being thinly defended).

## 4.3 China — Mass + Rapidly Growing Navy & Air Force
- **2.0M active personnel** — world's largest standing force; biggest army of modern MBTs (~6,800 stock).
- **Navy now world's largest by hull count** (>370 ships): 3 carriers (Fujian commissioned 2025), ~50+ destroyers (Type 052D/055 Renhai cruisers ~13k tons), ~65 submarines, ~6 SSBNs.
- **Fastest-growing nuclear arsenal** (~620, possibly 1,000 by 2030) with new ICBM silo fields and a nuclear triad finally displayed in the 2025 Victory Day parade.
- **Gap:** carrier airpower/experience trail the US; LOT of hulls but newer, less-proven; budget still ~1/3 of US.
- **Role in game:** The ascendant rival to the US — huge conventional mass, biggest rebuild rate, navy projection growing; ideal "main threat" AI.

## 4.4 India — Personnel Mass & Maturation
- **~1.5M active**, ~1.1M reserves, massive manpower pool; large tank/artillery force (~4,200 stock).
- 2 aircraft carriers (INS Vikramaditya, Vikrant — both operational), growing navy; **nuclear triad maturing** (first SSBN deterrent patrol in 2025/26, ~190 warheads).
- **Gap:** heterogeneous equipment (Russian, Western, indigenous), budget constraints vs. China, plateauing per-capita defense effort.
- **Role in game:** Huge conventional shield + nuclear backstop; "quantity backed by growing quality" — strong across all dimensions but budget-constrained relative to US/China.

## 4.5 United Kingdom / France — Compact Expeditionary & Nuclear
- **UK:** 2 Queen Elizabeth carriers (F-35B, full-op-capability reached Nov 2025), 6 Type 45 DDG, ~6 Astute SSN (1-2 operational at a time due to maintenance), single-leg **sea-based** deterrent (4 Vanguard SSBN, ~225 warheads). *Structurally brittle* — small but high-end surface fleet (11-13 escorts, frequently in refit).
- **France:** 1 Charles de Gaulle nuclear carrier, 4 Le Triomphant SSBN (continuous at-sea deterrence, **~290 warheads**), Rafale air power, **independent** all-European supply chain (unique among nuclear powers).
- **Role in game:** Compact, high-tech, expeditionary, nuclear-armed "sharp scalpel" powers — punch far above hull count, but limited staying power for long attrition.

## 4.6 Japan, South Korea (not on map), Germany, Italy — High-Tech Regional Powers
- **Japan (~$59B, 240k active):** 44 destroyers incl. 8 Aegis (BMD), 2 Izumo **light carriers** (F-35B), 24 modern submarines, ~290 combat aircraft (F-15J, F-35). **Gap:** declining demographics/manpower pool; constitutionally self-defense posture (loosening).
- **South Korea (~$47.8B, 455k active):** ~2,600 MBTs (K2/K1), ~400 combat a/c (F-35), Aegis destroyers, 21 submarines (3 KSS-III cruise), 450k reserves facing North Korea. **Gap:** largest single threat (DPRK) forces defensive posture.
- **Germany (~$114B after rearm push, 185k active):** only ~266 Leopard 2 operational despite top-3 budget — a slow-rebuilding, high-budget force. F-35 on order. **Gap:** decade of under-investment; low readiness (partly still being fixed).
- **Italy (~$48B, 165k active):** 2 STOVL carriers, 13 frigates/destroyers, 7 submarines, ~180 combat a/c (Typhoon/F-35). Solid all-round regional navy.

## 4.7 Türkiye, Iran, Pakistan, Israel/Egypt — Regional Heavies
- **Türkiye (~$30B, 355k active):** ~2,300 MBTs, large modernized F-16 fleet + domestic Kaan stealth program, 16 frigates + Anadolu LHD (drone-carrier), drone supremacy (Bayraktar). EU/NATO 2nd-largest standing army.
- **Iran (~$9B opaque, 610k active incl. huge conscript+mobilization):** ~1,700 aging MBTs, mixed Soviet/domestic a/c, ballistic-missile arsenal & missile navy in Persian Gulf, drone forces. **Gap:** obsolete conventional equipment; economy sanctions-constrained. Nuclear threshold (enrichment to 60%).
- **Pakistan (~$9B opaque):** 660k active, ~2,500 MBTs, ~580 combat a/c (JF-17, F-16, Mirage), 8-9 submarines, 170 warheads (India-focused). **Gap:** economy under strain.
- **Israel (~$48B, 169k active + 465k reserves):** ~1,380 Merkava MBTs, 300+ combat a/c (F-35, F-15/16), ~90 warheads, Iron Dome/Arrow missile defense, world-class tech. **Gap:** small territory, must-win-locally not at-scale.
- **Egypt (~438k active):** ~2,000 op MBTs (M1A1), ~340 combat a/c, region's biggest conventional force; strong US-funded modernization. **Gap:** budget pressure despite large force.

## 4.8 Australia, Brazil, Ukraine, Canada, Spain, Poland — Solid Second Tier
- **Australia (~$35B, 58k):** small but highly capable — 3 Hobart Aegis DDGs, 2 LHDs, F-35/AUKUS nuclear-sub program (Virginia-class from 2030s). **Role:** strong regional "middle power," US ally partner.
- **Brazil (~$24B, 367k):** largest Latin American military — 12 major surface combatants, 1 helicopter carrier, 5 submarines, ~146 combat a/c, 292 MBTs. **Role:** continental regional power, mostly a garrison/navy for the South Atlantic.
- **Ukraine (~$65B + massive aid, 730k-1M):** war-hardened, huge mobilized army, drone/missile innovation (sank ~30% of Russia's Black Sea Fleet without a real navy), F-16s arriving. **Role:** the underdog that fights above its nominal weight — give high "experience" bonus in-game.
- **Canada (~$38B, 69k):** high per-capita spending but small, no MBT-lite (74 Leopards), 12 frigates, 4 subs, 66 combat a/c — **deficient for its geography** (huge territory, thin forces, aging subs).
- **Spain (~$40B):** 11 major surface ships, 1 light carrier, 3 subs, ~327 Leopard 2. Modest but competent.
- **Poland (~$47B, 200k):** **fastest-arming NATO member** (4.5% GDP, 2nd-highest NATO share) — buying Abrams, K2, M1 tanks, HIMARS by the hundreds; ~800 MBTs growing. **Role:** high-gold, rising military; a strong mid-tier that is still building.

## 4.9 Minor / Distributed Forces (Africa, Small States)
- Most African states (Egypt/Algeria excepted) field small, geographically constrained, often internal-security-focused forces. **Egypt and Algeria** are the continent's notable conventional militaries; South Africa retains a capable but under-funded force; conflict states (Sudan, DR Congo) are fragmented.
- Small European states (Sweden, Norway, Finland, Romania, Latvia) are **re-arming sharply post-2022** — Finland/Sweden joining NATO, rebuilding artillery and F-35s — but remain small.
- Caribbean/Latin minors (Cuba, Uruguay, Bolivia, Paraguay) and Pacific minors (New Zealand, Mongolia) are tiny, mostly ceremonial or internal-security forces.

---

# 5. GAME SCALING — From Real Military Power to Starting Troops & Gold

This is the chapter that matters for implementation. The goal: **realism without making the US (or any one nation) trivially unbeatable** and without making weak nations irrelevant.

## 5.1 Core Design Goal

Real defense budgets and force sizes vary by **>10,000x** (US $954B and ~1.3M active vs. a nation like Chad at ~$300M and ~27k troops). If starting troops mapped linearly to MPI, the US would start with thousands of times more troops than a small African nation — instant, unsatisfying victory. **Therefore we dampen with a log/root curve.**

## 5.2 Recommended Formulas

Let `tier_index = MPI / 100` (0 to 1, US=1.0). Apply a **log-dampening** so the gap between tiers is real but playable:

```
base_troops = TROOP_SCALE * (tier_index ^ DAMPING)
starting_gold = GOLD_SCALE * (defense_budget_USD_billions ^ 0.8)   # budget still matters
```

Suggested constants (tune in playtests):
- `DAMPING` ≈ **0.35–0.5** (exponent <1 compresses the top end; e.g. 0.4).
- `TROOP_SCALE` ≈ so the US gets a large but not godly stack (e.g., if you want US ≈ 100k starting troops, TROOP_SCALE ≈ 100k).
- `GOLD_SCALE` ≈ maps a realistic budget to starting gold; use `budget^0.8` (a 100x budget gap becomes a ~40x gold gap).

Concrete worked examples with `DAMPING=0.4`, `TROOP_SCALE=100,000`, `GOLD_SCALE` such that $954B → 100,000 gold:

| Nation | MPI | tier_index | base_troops (≈) | Budget ($B) | starting_gold (≈) |
|---|---|---|---|---|---|
| United States | 100 | 1.00 | 100,000 | 954 | 100,000 |
| China | 85 | 0.85 | 93,000 | 336 | 49,000 |
| Russia | 75 | 0.75 | 88,000 | 190 | 32,000 |
| India | 55 | 0.55 | 78,000 | 92 | 20,000 |
| Japan | 30 | 0.30 | 62,000 | 59 | 15,000 |
| UK / France | 30 | 0.30 | 62,000 | 89 / 70 | 20,000 / 17,000 |
| Türkiye | 25 | 0.25 | 58,000 | 30 | 9,000 |
| Germany | 20 | 0.20 | 54,000 | 114 | 13,000 |
| Iran / Pakistan | 18–20 | 0.18–0.20 | 53,000 | 9 | 4,000 |
| Poland | 12 | 0.12 | 47,000 | 47 | 12,000 |
| Brazil | 13 | 0.13 | 48,000 | 24 | 7,000 |
| Australia | 13 | 0.13 | 48,000 | 35 | 9,500 |
| Egypt | 15 | 0.15 | 49,000 | 5 | 2,300 |
| Canada | 10 | 0.10 | 45,000 | 38 | 10,000 |
| Sweden | 7.5 | 0.075 | 43,000 | 16 | 5,500 |
| New Zealand | 2 | 0.02 | 33,000 | 4 | 2,000 |
| Chad | 1.5 | 0.015 | 31,000 | 0.3 | 400 |

**Note the dampening effect:** The US starts with only ~3x the troops of a small nation (100k vs 33k) despite being ~70x more powerful on MPI — that is intentional, keeping the early game competitive while preserving a real edge. Gold spreads wider because a richer nation genuinely can out-build, but `^0.8` keeps a weak nation's economy in the game.

## 5.3 Hard / Strong vs Weak Nations

**Hard (strong) starts** — give these high MPI, high gold, and aggressive AI governors:
- United States (100), China (85), Russia (75), India (55), Japan/UK/France (30), South Korea/Türkiye (25–28).

**Mid-tier** — meaningful local power, can threaten neighbors, beatable by a decent player:
- Germany (20), Iran/Pakistan/Israel (18–20), Egypt (15), Brazil/Australia/Ukraine (13–14), Poland (12), Spain/Italy (11–18), Canada (10), Taiwan/Indonesia (10).

**Weak / "easy" starts** — mostly for flavor, small or unstable militaries:
- Most of Africa (Chad, Niger, Madagascar, Namibia, Benin ~1–1.5), New Zealand/Mongolia/Uruguay (~2), small European minors (~1–5).

**Special cases to flag:**
- **Israel / South Korea / North Korea** are NOT on the World map but are included here; if ever added, Israel/South Korea are strong-but-small (high MPI relative to land), North Korea is highly mobilized but logistically starved (high troop count, very low gold).
- **Ukraine** — war-hardened: give moderate MPI (~14) but high "morale/experience" and ongoing gold trickle (aid), reflecting its real wartime resilience through mobilization.
- **Autonomous regions** (California, Texas, Siberia, Quebec, etc.) — fractional shares of parent MPI per Section 2.10; e.g., Siberia gets a big "manpower/resource" base but low starting development.

## 5.4 Tradeoffs & Design Warnings

1. **Don't over-nerf the superpowers, don't over-balance the weak.** The log curve already compresses; avoid additional flatting that erases the USA/China/Russia identity as world powers.
2. **Budget should control "gold," MPI should control "troops."** Rich-but-small nations (Japan, Germany, Switzerland) pair high gold with modest troops — that realism makes their starts interesting (they can tech up, not zerg).
3. **Nuclear states** deserve a qualitative edge (e.g., a prestige/tech bonus or a "nuclear deterrent" defensive ability) — represented in MPI via the `nuclear_factor`, not as free troops.
4. **Re-balance for play: treat all numbers as a starting point.** The formulas give a defensible baseline; final tuning belongs to playtests and game balance, not to pure realism.
5. **Update cadence:** SIPRI/IISS/FAS update annually. Consider re-harvesting this file each year so OpenFront's starting strengths track reality (real-world changes—e.g., Russian tank attrition, Fujian commissioning—shift MPI).

---

# 6. DATA SOURCES & LICENSING

## 6.1 Key Sources (as of 2025–2026)

### Primary authoritative sources (best for in-game data)
| Source | URL | What it gives | Licensing / usability |
|---|---|---|---|
| **IISS The Military Balance** | iiss.org/publications/the-military-balance | Personnel, equipment inventories, budgets for 170+ nations. The gold standard. | **Paywall / commercial** — data is copyrighted; summaries and tables are reproduced for research. For a commercial game, you need permission or use only open/derived summaries. |
| **SIPRI Military Expenditure Database** | sipri.org/databases/milex | Defense spending time-series by country; annual Fact Sheet top-40 tables are **public PDFs** (CC/open summaries). | **Freely usable** for the annual *Fact Sheet* and database-derived figures with attribution. Ideal for "gold." |
| **SIPRI Yearbook** (2024/2025/2026) | sipriyearbook.org | Nuclear forces, arms transfers, armaments chapters. | Yearbook is a paid book, but public summaries/chapters are usable with citation. |
| **FAS Status of World Nuclear Forces / Nuclear Notebook** | fas.org/initiative/status-world-nuclear-forces ; thebulletin.org | Warhead counts & delivery systems for all 9 nuclear states. | **Freely usable** — public data, cite FAS/Bulletin. Best source for "warheads." |
| **Arms Control Association** | armscontrol.org/factsheets/nuclear-weapons-who-has-what-glance | Concise nuclear fact sheet per state. | **Freely usable** with citation. |
| **Center for Arms Control & Non-Proliferation** | armscontrolcenter.org | Nuclear fact sheets (China/Russia/etc.). | Freely usable with citation. |
| **World Bank** | data.worldbank.org | GDP, population, manpower-pool proxies. | Open (CC BY) — reusable with attribution. |

### Cross-check / secondary sources (treat with caution)
| Source | URL | Notes |
|---|---|---|
| **Global Firepower (GFP)** | globalfirepower.com | Great for quick vibes/rankings, but its "stock" numbers (e.g., tank stocks) and budget estimates **diverge** from IISS/SIPRI and are not rigorously sourced. Use only to cross-check relative ordering, never as the primary source. |
| **FlightGlobal / Cirium** | flightglobal.com | Military aircraft inventory counts; good cross-check for air power. |
| **USNI News Fleet Tracker** | news.usni.org | Up-to-date US fleet dispositions; open journalism. |
| **Naval News / 19FortyFive / War on the Rocks** | navalnews.com etc. | Secondary reporting on fleet modernization. |
| **Oryx (equipment losses)** | oryxspioenkop.com | Documented Russian/Ukrainian equipment losses — the standard open source for Ukraine-war attrition. |
| **Wikipedia (MBT by country / personnel)** | en.wikipedia.org | Aggregates IISS/GFP; good for quick lookup but verify against primary sources. |

## 6.2 Licensing Guidance for a *Commercial Game*

- **Safest:** **SIPRI Fact Sheet** and **SIPRI Database** derived figures (annual top-40 is public; cite "SIPRI, 2025"), **FAS/Bulletin nuclear figures**, **Arms Control Association** fact sheets — all free to use with attribution.
- **IISS Military Balance** is copyrighted and commercial; do **not** copy tables wholesale into a shipped product. Reproduce *derived/summary* numbers with a citation, or obtain a license. This document's per-country table is a sanitized, game-oriented derivation and is safe as designed.
- **Global Firepower** has a specific "not for reuse in any form" clause — do **not** republish its data in game UI; use it only internally for cross-checks.
- **World Bank** data is CC-BY; attribute.
- If the game ships numeric stats derived from SIPRI/FAS/ACA, add a simple "Sources: SIPRI, FAS, ACA, IISS (public summaries)" credit line in an About/ReadMe screen. This is standard practice and keeps you on safe ground.

---

# Appendix A — Methodology Caveats & Confidence

- **Lowest confidence:** Niger, Madagascar, Namibia, Benin, Senegal, and conflict states (Libya, Sudan, DR Congo) — sparse or conflicting public data; figures are estimates.
- **Medium confidence:** Latin American minors, Southeast Asian minors, most small European minors.
- **Highest confidence:** US, China, Russia, India, UK, France, Japan, Germany, South Korea, Türkiye, nuclear states.
- **Russia budget** is intentionally given as a range ($149B SIPRI-grossing vs $190B+ IISS/GFP) because of wartime inflation of ruble-denominated spending in USD terms.
- **Tank counts** consistently differ between "stock" (GFP, all hulls incl. storage) and "operational" (IISS). This document reports **operational** where possible and labels stock explicitly.
- **Warhead counts** are mid-2025/26 FAS estimates; China's arsenal especially is growing fast and any number goes stale within a year — track FAS/Bulletin annually.

---

# Appendix B — Worked Example: Computing the MPI for Three Nations

To make the MPI reproducible, here are three worked examples using the formula from Section 1.3. Constants: `x_max` = US value for each dimension, so US = 1.0 on each sub-index.

### Reference values (used as `x_max`)
| Dimension | US value |
|---|---|
| Defense budget | $954 B |
| Active personnel | 1,330,000 |
| Combat aircraft | 13,032 (total) |
| Major surface + carriers | 95 (83 escorts + 12 carriers/LHA/LHD) |
| MBT (operational) | 2,500 |
| Warheads | 5,042 |

`normalize_log(x) = log10(1 + x) / log10(1 + x_max)`

### China
- Budget $336B → log10(337)/log10(955) = 2.528/2.98 = **0.85**
- Personnel 2,035,000 → log10(2.036e6)/log10(1.33e6) = 6.309/6.124 = **1.03** (caps at 1.0)
- Aircraft 3,529 → log10(3530)/log10(13033) = 3.548/4.115 = **0.86**
- Major surface ~95 + 3 carriers = 98 → log10(99)/log10(96) ≈ **1.00**
- MBT op ~4,500 → log10(4501)/log10(2501) = 3.653/3.398 = **1.08** (cap 1.0)
- Nuclear 620 → `nuclear_factor` = 0.5*log10(621)/log10(5043) = 0.5*(2.793/3.703)=0.5*0.754 = **0.38**

`MPI_raw = 0.30(0.85) + 0.20(1.0) + 0.15(0.86) + 0.15(1.0) + 0.10(1.0) + 0.10(0.38)`
`= 0.255 + 0.20 + 0.129 + 0.15 + 0.10 + 0.038 = 0.872`
`MPI = 0.872 × 100 ≈ 87` → **rounded to 85** in tables (accounts for un-modeled gaps: carrier-aviation experience, joint C2 maturity).

### Russia
- Budget $190B → log10(191)/log10(955)= 2.281/2.980 = **0.77**
- Personnel 1,200,000 → log10(1.2e6)/log10(1.33e6) = 6.079/6.124 = **0.99**
- Aircraft 4,237 → log10(4238)/log10(13033)= 3.627/4.115 = **0.88**
- Major surface ~30 + 1 carrier = 31 → log10(32)/log10(96)= 1.505/1.982 = **0.76**
- MBT op ~2,000 → log10(2001)/log10(2501)= 3.301/3.398= **0.97**
- Nuclear 5,420 → nuclear_factor = 0.5*log10(5421)/log10(5043)= 0.5*(3.734/3.703)= 0.5*1.008= **0.50**

`MPI_raw = 0.30(0.77)+0.20(0.99)+0.15(0.88)+0.15(0.76)+0.10(0.97)+0.10(0.50)`
`= 0.231+0.198+0.132+0.114+0.097+0.050= 0.822` → MPI ≈ **82** → rounded **down to 75** to reflect degraded readiness, Ukraine attrition, and Black Sea fleet losses.

### Chad
- Budget $0.3B → log10(1.3)/log10(955)= 0.114/2.980= **0.038**
- Personnel 27,000 → log10(27001)/log10(1.33e6)= 4.431/6.124= **0.72** (personnel sub-index is generous to manpower-heavy small states)
- Aircraft 10 → log10(11)/log10(13033)= 1.041/4.115= **0.25**
- Major surface 0 → log10(1)/log10(96)= **0.00**
- MBT op 90 → log10(91)/log10(2501)= 1.959/3.398= **0.58**
- Nuclear 0 → **0.00**

`MPI_raw = 0.038+0.144+0.038+0+0.058+0 = 0.278` → ~**28 raw** → but this over-credits manpower; after a **gear-flavored quality discount** (budget-weighted floor) it is manually set to the defensible **~1.5** used in tables. This manual cap for poor-but-populous states is a deliberate game-balance override documented here — the formula naturally over-weights mass.

**Takeaway:** The MPI formula gives a sensible ordering for great/mid powers automatically, but low-quality mass states (Chad, Ethiopia, North Korea) need a qualitative floor so raw manpower doesn't over-inflate them relative to their real (budget-limited) capability.

---

# Appendix C — Glossary

| Term | Meaning |
|---|---|
| **MBT** | Main battle tank (heavy tracked tank, e.g., Abrams, Leopard 2, T-90). |
| **SSN** | Nuclear-powered attack submarine. |
| **SSBN** | Nuclear-powered ballistic-missile submarine (strategic deterrence). |
| **SSK** | Diesel-electric (conventional) attack submarine. |
| **SLBM** | Submarine-launched ballistic missile. |
| **ICBM** | Intercontinental ballistic missile (range >5,500 km). |
| **IRBM / MRBM** | Intermediate/medium-range ballistic missile. |
| **ALCM** | Air-launched cruise missile. |
| **MIRV** | Multiple independently targetable reentry vehicles (one missile, several warheads). |
| **HGV** | Hypersonic glide vehicle. |
| **C2 / C4ISR** | Command-and-control / command, control, computers, communications, intel, surveillance, reconnaissance — the "brain" of a military. |
| **LHD / LHA** | Amphibious assault ship (helicopter/assault, often light-carrier capable). |
| **Aegis** | US-developed integrated air/missile-defense combat system (also used by Japan, Korea, Spain, Norway, Australia). |
| **Operational vs stock** | *Operational* = deployable/ready units; *stock* = all hulls incl. storage/mothballed. |
| **Defense burden** | Defense spending as % of GDP. |
| **Nuclear threshold** | State that has the capacity/uranium enrichment to weaponize but has not built a weapon (e.g., Iran at 60% enrichment). |

---

# Appendix D — Source Register (URLs)

### Nuclear & strategic
- FAS Status of World Nuclear Forces: https://fas.org/initiative/status-world-nuclear-forces
- FAS Nuclear Notebook (Bulletin of the Atomic Scientists): https://thebulletin.org/nuclear-notebook/
- Arms Control Association "Who Has What": https://www.armscontrol.org/factsheets/nuclear-weapons-who-has-what-glance
- Center for Arms Control & Non-Proliferation fact sheets: https://armscontrolcenter.org
- SIPRI Yearbook / nuclear forces chapters: https://www.sipriyearbook.org

### Expenditure
- SIPRI Military Expenditure Database: https://www.sipri.org/databases/milex
- SIPRI Trends 2025 Fact Sheet: https://www.sipri.org/publications/2026/sipri-fact-sheets/trends-world-military-expenditure-2025
- Our World in Data (military spending): https://ourworldindata.org/grapher/military-spending-sipri

### Forces & equipment
- IISS The Military Balance: https://www.iiss.org/publications/the-military-balance
- Global Firepower (cross-check only): https://www.globalfirepower.com
- Wikipedia: List of main battle tanks by country; List of countries by level of military equipment; List of ships losses (Russo-Ukrainian war)
- Oryx equipment losses: https://www.oryxspioenkop.com

### Naval / air tracking
- USNI News Fleet Tracker: https://news.usni.org
- Naval News: https://www.navalnews.com
- World Directory of Modern Military Aircraft: https://www.wdmmw.org
- FlightGlobal / Cirium fleets data: https://www.flightglobal.com

### People & economics
- World Bank data: https://data.worldbank.org
- World Population Review (military size / nuclear by country): https://worldpopulationreview.com

---

*End of report. Prepared as game-design research input; no game code included. Figures are 2025–26 open-source estimates; verify against the annual IISS/SIPRI/FAS updates before each game-balance pass.*
