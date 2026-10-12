# 05 — World Terrain & Geography: Making OpenFront's World Geographic, and Making Terrain Matter

**Scope:** Research on the real world's terrain features (mountains, deserts, rivers, forests, plains, maritime chokepoints) and how terrain shapes real warfare, so that OpenFront can (a) generate *geographically accurate* terrain from real elevation/land-cover data, and (b) give terrain a *meaningful* impact on combat (chokepoints, passes, river crossings, desert attrition, jungle concealment).

**Audience:** Game designers and engineers working on the OpenFront map generator and combat rules. This is a research/spec document — it deliberately contains **no game code**, only data, geography, reasoning, and implementable recommendations.

**All coordinates are given as (Latitude, Longitude) in WGS84 decimal degrees**, in a `[lat_min, lat_max] × [lon_min, lon_max]` bounding-box convention so the game's lat→pixel / lon→pixel projection can locate each feature deterministically. Boxes are approximate but generous — treat them as *search regions* to be refined against the actual DEM, not as hard clip boundaries.

---

## Table of Contents

1. [Methodology — How the Game Encodes Terrain Today, and How It Should](#1-methodology)
2. [Elevation Data Sources (Free, Public, Downloadable)](#2-elevation-data-sources)
3. [Major Mountain Ranges & Chains](#3-major-mountain-ranges--chains)
   - 3.1 The Great Asian Wall (Himalaya–Karakoram–Hindu Kush–Pamir)
   - 3.2 Central Asian Ranges (Tian Shan, Altai, Sayan, Verkhoyansk, Central Siberian Plateau)
   - 3.3 The Americas (Andes, Rockies, Sierra Nevada, Cascades, Alaska Range, Appalachians)
   - 3.4 Europe & Middle East (Urals, Caucasus, Alps, Pyrenees, Carpathians, Balkan, Scandinavian, Zagros, Alborz, Taurus, Pontic)
   - 3.5 Africa & Oceania (Atlas, Ethiopian Highlands, Drakensberg, Great Dividing Range, NZ Southern Alps)
   - 3.6 Mountain Walls, Passes & Gaps
4. [Major Deserts](#4-major-deserts)
5. [Major Rivers](#5-major-rivers)
6. [Sea/Strait Chokepoints & Island Chains](#6-sea--strait-chokepoints--island-chains)
7. [Forests / Jungle / Taiga](#7-forests--jungle--taiga)
8. [Open Terrain (Steppe / Plains)](#8-open-terrain-steppe--plains)
9. [How Terrain Humanly Shapes Warfare](#9-how-terrain-humanly-shapes-warfare)
10. [Game Implications — Concrete Recommendations](#10-game-implications--concrete-recommendations)
11. [Sources](#11-sources)

---

## 1. Methodology

### How OpenFront encodes terrain today

OpenFront splits each map tile into terrain types derived from **raw elevation magnitude**:

| Terrain | Current basis (elev. magnitude 0–30) |
|---|---|
| **Ocean** | elevation ≤ 0 (below sea level) |
| **Impassable** | noise / seed-driven extremes (not tied to real peaks) |
| **Plains** | low magnitude |
| **Highland** | medium magnitude |
| **Mountain** | high magnitude |

The terrain generator produces a plausible-looking world but it is **not geographically accurate to Earth** and terrain effects on combat are shallow (currently mountains are merely "bloodier/slower to take").

### The geographic principle: terrain should come from real elevation & land-cover

A tile's *biome-like* character in the real world is governed by **elevation** (for Plains/Highland/Mountain) plus **precipitation / land-cover** (for forest vs. steppe vs. desert vs. jungle). Two independent inputs therefore drive a realistic map:

1. **Elevation (DEM)** → decide Plains / Highland / Mountain / Impassable.
2. **Land-cover / climate** → decide vegetation class (forest, jungle, taiga, desert, steppe) layered on top.

Recommended **hypsometric thresholds** (standard geomorphological convention, usable to translate metres to terrain tiers; these match the mountain/foothill/plain convention used by geographers and remote-sensing landform classifiers) [USGS earth-surface processes], [OSM landform classification]:

| Terrain tier | Elevation band (metres above sea level) | Notes |
|---|---|---|
| **Ocean** | ≤ 0 | below sea level (use the DEM's water mask, not just "≤0", because the Caspian & Dead Seas sit below 0) |
| **Plains / Lowland** | 0 – 300 m | flat to gently rolling |
| **Highland / Foothill** | 300 – 1500 m | hills, plateaux, foothills |
| **Mountain** | 1500 – 5000 m | true mountains |
| **Impassable (High Peak / Glacier)** | > ~5000 m | permanent snow, extreme slopes, thin air — see §3.6 and §10 |

These thresholds put the *bulk* of the Himalaya, Karakoram, high Andes, and high Caucasus into the **Impassable** tier, which automatically forces travel through lower passes — exactly the real situation (see §8, §9).

**Important caveats for the game**:
- **The Andes' Altiplano and the Tibetan Plateau** are *high* but *flat* — elevation alone would wrongly mark them Mountain/Impassable. The game should combine elevation with **local slope/ruggedness** (variance of neighbours) to distinguish "high plateau" (movable, high-altitude plain) from "rugged peaks" (hard). Recommend computing a **ruggedness index** (std-dev or max-minus-min of the surrounding DEM cells) before classifying.
- **Polar/ice regions** (Greenland, Antarctica) and **glaciers** (Patagonian ice fields, Karakoram glaciers) read as white ice — optionally treat as Impassable or a distinct terrain.
- **Saltpan/salt-flat below sea level** (Death Valley, Caspian depression, Qattara) — treat as Plains or Desert regardless of sub-zero elevation.
- Deserts are **not** a function of elevation; they come from land-cover/aridity. A desert may be low (Rub' al Khali ≤ 200 m) or high (Gobi ~1000 m, Namib up to 2000 m). Deserts must be layered from a **land-cover/moisture** source, not from the DEM.

**Synthesis for the generator:** `Terrain = f(elevation tier, ruggedness tier, land-cover class)`, resolved by a lookup table, e.g. `Mountain + Forest = "steep forested mountain"`, `Plains + Arid = "desert"`, `Highland + Humid = "jungle/rainforest"`, etc. This is how realistic terrain gets built from freely available global data.

---

## 2. Elevation Data Sources

All of the following are **free to download and in the public domain / open licence**; no commercial dataset is required to make the world geographically correct. The game only needs to resample a global DEM and a land-cover layer down to its tile resolution (e.g., one average per map pixel).

### 2.1 NASA SRTM (Shuttle Radar Topography Mission)
- **What:** Near-global digital elevation model (DEM) from radar interferometry flown on shuttle Endeavour (STS-99, Feb 2000). The first near-global, high-resolution elevation dataset. [NASA JPL SRTM]
- **Coverage:** ~80% of Earth's land, between roughly **56° S and 60° N**. [NASA Earthdata]
- **Resolution:** 1 arc-second (~30 m) and 3 arc-second (~90 m) global; 1° × 1° tiles. [USGS EROS]
- **Access:** USGS EarthExplorer, NASA LP DAAC, Earthdata, OpenTopography.
- **Why it matters:** It is the canonical, "good enough" global terrain source for a game. Vertical datum EGM96, horizontal WGS84 — exactly what a lat/long game wants.

### 2.2 NASADEM (NASA reprocessing of SRTM)
- **What:** The current NASA "version 3" of SRTM, reprocessed with improved software, ASTER GDEM2, PRISM AW3D30, and ICESat GLAS ground-control points to fill voids and improve accuracy. [NASA LP DAAC]
- **Coverage:** 60° N–56° S, 1-arc-second (~30 m), 1° tiles. Free via NASA Data Portal / LP DAAC.
- **Why it matters:** Recommended first choice for the game's DEM — void-filled, consistent, 30 m resampling is trivial.

### 2.3 Copernicus GLO-30 / GLO-90 (ESA, EU)
- **What:** The Copernicus global DEM from the TanDEM-X radar mission (German Aerospace Center / ESA). 30 m and 90 m derivatives.
- **Coverage:** Global (including **latitudes above 60° N** that SRTM misses, e.g. all of Siberia, northern Canada, Greenland fringes, Antarctica not covered).
- **Why it matters:** Use GLO-30/GLO-90 for the **high latitudes** (Siberian taiga, Canadian boreal, Verkhoyansk, the Arctic) where SRTM/NASADEM cut off at 60° N.

### 2.4 USGS EarthExplorer / Global data
- USGS EarthExplorer distributes SRTM (30 m/90 m), **ASTER GDEM v3** (30 m, ~83°N–83°S), **GMTED2010** (250 m/500 m/1000 m mosaics), and **GTOPO30** (30-arc-sec, ~1 km global). [USGS]
- **Why it matters:** GMTED2010 / GTOPO30 are ideal *quick* sources for a first pass because they are small and fully global; SRTM/NASADEM/GLO-30 give higher fidelity for final polish.

### 2.5 Land-cover / aridity (for forest, desert, steppe, jungle)
- **ESA Sentinel-2** global land-cover products (10–300 m), and **Copernicus Global Land Service** land-cover (100 m) — free.
- **NASA MODIS** land-cover/NDVI (500 m) — free.
- **Why it matters:** These supply the "land-cover class" input that decides forest/jungle/desert/steppe independent of elevation (§1).

### 2.6 Summary table for engineers

| Source | Elev/land data | Resolution | Coverage | Where |
|---|---|---|---|---|
| NASADEM / SRTM | elevation | ~30 m | 60°N–56°S | USGS EarthExplorer, NASA LP DAAC, Earthdata |
| Copernicus GLO-30/90 | elevation | 30/90 m | global | ESA / Copernicus, AWS registry |
| ASTER GDEM v3 | elevation | ~30 m | 83°N–83°S | USGS EarthExplorer |
| GMTED2010 / GTOPO30 | elevation | 250 m–1 km | global | USGS |
| ESA Sentinel-2 / Copernicus Global | land cover | 10–300 m | global | ESA / Copernicus |
| MODIS | land cover / NDVI | 500 m | global | NASA |

---

## 3. Major Mountain Ranges & Chains

### 3.1 The Great Asian Wall — Himalaya–Karakoram–Hindu Kush–Pamir

This is the **"Roof of the World"** and the greatest mountain barrier on Earth. It is part of the **Alpine–Himalayan (Alpide) orogenic belt**, which runs >15,000 km from Western Europe (Atlas, Alps) through the Zagros, Caucasus, Hindu Kush, Pamir, Karakoram, Himalaya, and into Southeast Asia. [Wikipedia: List of mountain ranges]

#### Himalayas (`~26–32°N, 68–92°E`)
- **Description:** The highest mountain system on Earth, an arc along the southern edge of the Tibetan Plateau, between the Indus/Yarlung gorge in the west and the Brahmaputra bend in the east.
- **Countries:** India, Nepal, Bhutan, China (Tibet), Pakistan (northwest end), Afghanistan (extreme west). [Wikipedia: List of mountain ranges]
- **Dominant elevation / peaks:** All 14 of the world's 8,000 m peaks; **Everest 8,849 m** (Nepal/China). Most summits 5,000–8,800 m.
- **Approx. bounding region:** `[26, 32] × [68, 92]` (whole chain); the highest core is `[27, 30] × [80, 88]`.
- **Game note:** Almost the entire crest exceeds 5,000 m → **Impassable** under §1 thresholds. The Himalaya must act as a near-solid wall, with passes (west end, east end, and the few ~4,900–5,600 m cols) as forced crossings. See §3.6.

#### Karakoram (`~35–37°N, 74–79°E`)
- **Description:** Second-highest range on Earth; the most heavily glaciated range outside polar regions (Siachen & Biafo glaciers). Forms the northwest buttress of the Himalaya. ~500 km long, 240 km wide. [Britannica], [Wikipedia: Karakoram]
- **Countries:** Pakistan (Gilgit-Baltistan), China (Xinjiang), India (Ladakh), Afghanistan, Tajikistan (tips). [Wikipedia]
- **Dominant elevation / peaks:** **K2 8,611 m** (2nd highest on Earth); Gasherbrum I, Broad Peak, Gasherbrum II >8,000 m; average ~6,100 m.
- **Approx. bounding region:** `[35, 37] × [74, 79]` (core centred ~36°N, 76°E).
- **Game note:** Entirely above 5,000 m → **Impassable**; the Karakoram Highway's **Khunjerab Pass (4,693 m)** is the key crossing.

#### Hindu Kush (`~34–38°N, 65–75°E`)
- **Description:** ~800 km range running southwest out of the Pamir through Afghanistan and into Pakistan; divides the Amu Darya (Oxus) valley (north) from the Indus valley (south). [Britannica]
- **Countries:** Afghanistan, Pakistan, Tajikistan.
- **Dominant elevation / peaks:** **Tirich Mir 7,708 m** (Chitral, Pakistan); many peaks 4,400–5,200 m; heights diminish westward toward Herat.
- **Approx. bounding region:** `[34, 38] × [65, 75]`.
- **Game note:** The **Khyber (1,070 m)** and adjacent passes punch through its low eastern spurs — the historic invasion route onto the Indian subcontinent (§3.6, §8).

#### Pamir (Pamirs, "Roof of the World") (`~37–40°N, 71–76°E`)
- **Description:** Mountain knot where Himalaya, Tian Shan, Kunlun, Karakoram, and Hindu Kush meet; mostly in Tajikistan's Gorno-Badakhshan + the Wakhan Corridor. [Wikipedia: Pamir]
- **Countries:** Tajikistan, Kyrgyzstan, Afghanistan, China, Pakistan.
- **Dominant elevation / peaks:** **Kongur Tagh 7,649 m** (China); Ismoil Somoni 7,495 m (Tajikistan); Lenin Peak 7,134 m.
- **Approx. bounding region:** `[37, 40] × [71, 76]`.
- **Game note:** High, rugged, sparsely inhabited — near-impassable; the **Wakhjir** and **Wakhan Corridor** form the only usable east–west sliver.

#### Great "wall" & Silk Road corridor gap
- The combined Himalaya–Karakoram–Pamir–Hindu Kush–Tian Shan wall separates South Asia from the rest of Asia. It is pierced by a handful of historic **gaps**: the **Khyber** and **Bolan** passes (west), **Khunjerab** (north, to Xinjiang), and the **Wakhjir** (NE, Wakhan→Xinjiang). Between these, the wall is effectively sealed. See §3.6.

---

### 3.2 Central Asian & Siberian Ranges

#### Tian Shan ("Mountains of Heaven") (`~40–45°N, 70–95°E`)
- **Description:** Large system of ranges in Central Asia's interior, ~2,500–2,900 km, separating Xinjiang from the Central Asian steppes. [Wikipedia: Tian Shan]
- **Countries:** Kyrgyzstan, Kazakhstan, China (Xinjiang), Uzbekistan, Tajikistan (tip).
- **Dominant elevation / peaks:** **Jengish Chokusu (Victory/Pobeda) 7,439 m** and Khan Tengri 7,010 m — the two northernmost 7,000 m peaks on Earth.
- **Approx. bounding region:** `[40, 45] × [70, 95]` (core ~42°N, 80°E).
- **Game note:** The Tian Shan + northern Taklamakan ring seal Xinjiang; the **Turpan Depression (−154 m)** on its east flank is a notable pocket of low ground.

#### Altai/Sayan (`~45–52°N, 84–99°E`; `~50–54°N, 89–102°E`)
- **Description:** Altai stretches ~2,525 km across the junction of Russia, China, Mongolia, Kazakhstan — headwaters of the Irtysh and Ob. The Sayan Mountains lie northeast of the Altai, in southern Siberia/Mongolia. [Wikipedia: Altai]
- **Countries:** Russia, China, Mongolia, Kazakhstan (Altai); Russia, Mongolia (Sayan).
- **Dominant elevation / peaks:** Altai **Belukha 4,506 m**, Khüiten 4,374 m; Sayan ~3,500 m (Munku-Sardyk ~3,491 m).
- **Approx. bounding region:** Altai `[45, 52] × [84, 99]`; Sayan `[50, 54] × [89, 102]`.
- **Game note:** High but generally **below the impassable threshold** → play as Difficult Mountain; they form the wall between the steppe and the Gobi.

#### Verkhoyansk Range (`~63–70°N, 127–140°E`)
- **Description:** A long range in NE Siberia east of the Lena River, one of the coldest inhabited places on Earth. [Wikipedia/Euratlas]
- **Country:** Russia (Yakutia).
- **Dominant elevation / peaks:** ~2,300–2,900 m (moderate but extreme cold).
- **Approx. bounding region:** `[63, 70] × [127, 140]`.
- **Game note:** Cold/taiga-covered mountains — high movement cost + attrition, but not impassable.

#### Central Siberian Plateau (`~55–70°N, 90–120°E`)
- **Description:** A vast elevated plateau between the Yenisei and Lena rivers, dominated by the Putorana Plateau and trap basalts. Not a "range" but plays as Highland/plateau in a game. [Euratlas/Wikipedia subranges]
- **Country:** Russia (Siberia).
- **Dominant elevation:** 300–1,700 m (Putorana to ~1,701 m).
- **Approx. bounding region:** `[55, 70] × [90, 120]`.
- **Game note:** A huge Highland/taiga block east of the Yenisei — slow, forested, road-poor.

---

### 3.3 The Americas

#### Andes (`~11°N–57°S`, `~62–82°W`; core `70–80°W`)
- **Description:** The longest continental mountain range on Earth (~8,900 km, 200–700 km wide) along the entire western edge of South America; the highest range outside Asia; the world's second-highest plateau (Altiplano) is here. [Wikipedia: Andes], [LiveScience]
- **Countries:** Argentina, Chile, Bolivia, Peru, Ecuador, Colombia, Venezuela.
- **Dominant elevation / peaks:** Avg ~4,000 m; **Aconcagua 6,961 m** (Argentina), Ojos del Salado 6,893 m, Huascarán 6,768 m. ~100 peaks over 6,000 m, ~900 over 5,000 m.
- **Approx. bounding region:** `[11.5, −57] × [−82, −62]` (NB: lat is a signed range: `11°N` down to `57°S`).
- **Game note:** An almost unbroken north–south wall dividing the Pacific coast from the continent's interior; the highest (>5,000 m) segments near Aconcagua and the Atacama Andes are Impassable, forcing movement through the low **Andean passes** (~3,000–4,500 m). The Altiplano (18–20°S) is high but flat — see ruggedness caveat in §1.

#### Rocky Mountains (`~36–60°N, 105–130°W`)
- **Description:** North America's largest mountain system, ~4,800 km from New Mexico to Alaska; the easternmost belt of the North American Cordillera; forms the Continental Divide. [USGS], [Wikipedia: Rocky Mountains]
- **Countries:** United States, Canada.
- **Dominant elevation / peaks:** **Mount Elbert 4,401 m** (Colorado); Mount Robson 3,954 m (BC). Summits mostly 1,800–4,400 m.
- **Approx. bounding region:** `[36, 60] × [105, 130]`. **South Pass** (~2,301 m, SW Wyoming) is the historic low crossing (Oregon/Mormon Trails).
- **Game note:** Realistically below the impassable threshold except a few high cores; plays as a long Mountain/Highland barrier with passes (South Pass, Donner, etc.).

#### Sierra Nevada (US) (`~36–40°N, 118–121°W`)
- **Description:** ~640 km granite range in California; the "backbone" of the state. [Wikipedia/other]
- **Country:** United States.
- **Dominant elevation / peaks:** **Mount Whitney 4,421 m** (highest in the lower 48).
- **Approx. bounding region:** `[36, 40] × [118, 121]`.
- **Game note:** A steep barrier between the Central Valley and the Great Basin desert; low **Donner**/**Tioga**-type passes are the crossings. **Distinct from the Sierra Nevada de Santa Marta and Mexico's Sierra Madre** — disambiguate by bounding box.

#### Cascade Range (`~41–52°N, 121–124°W`)
- **Description:** A volcanic range of the Pacific Ring of Fire, ~1,100 km from northern California to British Columbia. [Wikipedia/Simple: Cascade Range]
- **Countries:** United States, Canada.
- **Dominant elevation / peaks:** **Mount Rainier 4,392 m**; many stratovolcanoes (St. Helens, Hood, Shasta).
- **Approx. bounding region:** `[41, 52] × [121, 124]`.
- **Game note:** Classic volcanic arc; high but passable except major summits; separates the Pacific Northwest coast from the interior.

#### Alaska Range (`~60–64°N, 145–155°W`)
- **Description:** ~970 km arc in south-central Alaska from Lake Clark to the Yukon border; one of the highest ranges after the Himalaya and Andes. [Wikipedia: Alaska Range]
- **Country:** United States (Alaska).
- **Dominant elevation / peaks:** **Denali 6,190 m** — highest peak in North America.
- **Approx. bounding region:** `[60, 64] × [145, 155]`.
- **Game note:** Denali and neighbours exceed the impassable threshold; a near-solid Alaska wall.

#### Appalachians (`~33–47°N, 70–85°W`)
- **Description:** ~2,400 km ancient, eroded range along the eastern US; low and rounded compared to the Rockies.
- **Country:** United States (+extends into Canada as the Notre Dame/Long Range).
- **Dominant elevation / peaks:** **Mount Mitchell 2,037 m** (NC); mostly 300–2,000 m.
- **Approx. bounding region:** `[33, 47] × [70, 85]`.
- **Game note:** Plays mostly as Highland/foothill; the multiple **gaps** (Cumberland Gap, Delaware Water Gap, Hudson/Champlain corridor) are natural invasion funnels between the colonies — great gameplay.

---

### 3.4 Europe & Middle East

#### Ural Mountains (`~50–68°N, 55–65°E`)
- **Description:** The north–south (~2,500 km) conventional Europe–Asia boundary, from the Arctic coast to Kazakhstan near the Caspian. [Wikipedia: Urals]
- **Countries:** Russia, Kazakhstan.
- **Dominant elevation / peaks:** **Mount Narodnaya 1,894 m**; average 1,000–1,300 m.
- **Approx. bounding region:** `[50, 68] × [55, 65]`.
- **Game note:** Low, rounded — the Urals are **not** a serious barrier (they're famously "crossable everywhere"), crossing points historically via Yekaterinburg/Perm and the Trans-Siberian. Use as Highland, not impassable.

#### Caucasus (`~40–44.5°N, 40–50°E`)
- **Description:** The 1,200 km wall between Europe's Black Sea and the Caspian Sea, its crest forming Russia vs. Georgia/Azerbaijan. [Wikipedia: Greater Caucasus], [WorldAtlas]
- **Countries:** Russia, Georgia, Azerbaijan (+Armenia in Lesser Caucasus).
- **Dominant elevation / peaks:** **Mount Elbrus 5,642 m** — Europe's highest peak; Kazbek 5,047 m; several 5,000 m+.
- **Approx. bounding region:** Greater Caucasus `[40, 44.5] × [40, 50]`.
- **Game note:** A genuine wall pierced by **two historic passes only**: the **Darial Gorge** (Georgia Military Road, ~1,447 m) and the **Derbent/Caspian Gates** (coastal narrows). This is one of the game's best natural chokepoint regions (§3.6, §10).

#### Alps (`~44–48°N, 5–17°E`)
- **Description:** Central Europe's great arc (~1,200 km) separating the Mediterranean/Italian peninsula from northern Europe. [Britannica/other]
- **Countries:** France, Italy, Switzerland, Austria, Germany, Slovenia, Liechtenstein.
- **Dominant elevation / peaks:** **Mont Blanc 4,810 m**; many 4,000 m peaks.
- **Approx. bounding region:** `[44, 48] × [5, 17]`.
- **Game note:** Crossed by famous low passes — **Brenner (1,370 m, Austria–Italy)**, **Gotthard (2,106 m, Switzerland)**, **Mont Cenis**, **Simplon**, **Great St. Bernard**. These are the classic "mountain pass as chokepoint" exemplars (§3.6, §8).

#### Pyrenees (`~42–43.5°N, 0–3°E`)
- **Description:** ~491 km wall between France and Spain, separating the Iberian peninsula from the rest of Europe. [Britannica]
- **Countries:** France, Spain, Andorra.
- **Dominant elevation / peaks:** **Aneto 3,404 m**.
- **Approx. bounding region:** `[42, 43.5] × [0, 3]` (with western reach `−2°E`).
- **Game note:** High but sub-impassable; crossed by low **Roncesvalles/Puerto de Somport** passes at the ends.

#### Carpathian Mountains (`~44–50°N, 17–27°E`)
- **Description:** A ~1,500 km arc (the third-longest European range) enclosing the Transylvanian basin / Pannonian plain's east; second-most extensive system after the Alps. [Wikipedia: Carpathians]
- **Countries:** Czech Rep., Poland, Slovakia, Ukraine, Romania, Hungary, Austria, Serbia.
- **Dominant elevation / peaks:** **Gerlachovský štít 2,655 m** (Tatras, Slovakia); Moldoveanu 2,544 m (Romania).
- **Approx. bounding region:** `[44, 50] × [17, 27]`.
- **Game note:** The Carpathian arc + Transylvanian plateau is a fortress ring; gaps (Dukla, Verecke passes) are invasion routes between Central Europe and the Black Sea plains.

#### Balkan / Dinaric Alps (`~42–46°N, 14–22°E`; and Pindus `~38–41°N, 20–23°E`)
- **Description:** The Dinaric Alps run along the western Balkans (Slovenia→Albania); the Balkan Mountains cross Bulgaria; the Pindus runs through Greece. Together they form the rugged spine of the Balkan peninsula. [Wikipedia/Euratlas]
- **Countries:** Slovenia, Croatia, Bosnia, Montenegro, Albania, North Macedonia, Serbia, Bulgaria, Greece.
- **Dominant elevation / peaks:** Dinaric ~2,500 m (Maja Jezercë); Balkan ~2,376 m (Botev); Olympus 2,918 m (Greece).
- **Approx. bounding region:** Dinaric+ `[42, 46] × [14, 22]`.
- **Game note:** Rugged limestone karst — slows movement, favors the defender/guerrilla (see WW2 Yugoslavia, §9).

#### Scandinavian Mountains (`~60–70°N, 6–20°E`)
- **Description:** ~1,700 km range running the length of the Scandinavian Peninsula, Norway's spine, boundary with Sweden. [Wikipedia/Carpathian comparison]
- **Countries:** Norway, Sweden, Finland.
- **Dominant elevation / peaks:** **Galdhøpiggen 2,469 m** (Norway).
- **Approx. bounding region:** `[58, 70] × [5, 20]`.
- **Game note:** Low but rugged, forested, roadless — slow, cold terrain.

#### Zagros (`~27–37°N, 46–57°E`)
- **Description:** ~1,600 km northwest–southeast system roughly parallel to Iran's west/southwest border; the barrier that fronts the Persian Gulf and Mesopotamia. [Wikipedia/Euratlas]
- **Countries:** Iran, Iraq, Turkey (SE), (Armenian highland extension).
- **Dominant elevation / peaks:** **Zard-Kuh ~4,548 m**; Dena ~4,373 m.
- **Approx. bounding region:** `[27, 37] × [46, 57]`.
- **Game note:** The Zagros funnels traffic between Mesopotamia and the Iranian plateau through a few gaps — strategic chokepoint territory (historic Persian gorges).

#### Alborz (Elburz) (`~35–37°N, 50–56°E`)
- **Description:** Range fronting the south shore of the Caspian Sea, arcing over Tehran. [Wikipedia: Alborz]
- **Country:** Iran.
- **Dominant elevation / peaks:** **Mount Damavand 5,610 m** — Iran's highest and the 12th most prominent peak on Earth.
- **Approx. bounding region:** `[35, 37] × [50, 56]`.
- **Game note:** Damavand exceeds impassable; the range seals the Caspian plain off from the Iranian plateau.

#### Taurus Mountains (`~36–38°N, 30–37°E`)
- **Description:** Southern mountain arc of Anatolia (Turkey) running parallel to the Mediterranean/Levant coast. [Euratlas list]
- **Country:** Turkey.
- **Dominant elevation / peaks:** Demirkazık ~3,756 m (Aladağlar).
- **Approx. bounding region:** `[36, 38] × [30, 37]`.
- **Game note:** Seals the Anatolian plateau off from the Cilician plain and Syria; the **Cilician Gates** (Gülek, ~1,050 m) are the historic invasion pass.

#### Pontic Mountains (`~40–42°N, 32–42°E`)
- **Description:** The northern mountain arc of Anatolia fronting the Black Sea, ~1,000 km. [Wikipedia/Euratlas]
- **Country:** Turkey.
- **Dominant elevation / peaks:** Kaçkar ~3,937 m.
- **Approx. bounding region:** `[40, 42] × [32, 42]`.
- **Game note:** The Pontic + Taurus arcs enclose the Anatolian (Central) Plateau — a natural fortress core.

---

### 3.5 Africa & Oceania

#### Atlas Mountains (`~30–37°N, −10 to 10°E`)
- **Description:** ~2,000–2,500 km chain across NW Africa (Morocco, Algeria, Tunisia), separating the Mediterranean/Atlantic from the Sahara. [Britannica]
- **Countries:** Morocco, Algeria, Tunisia.
- **Dominant elevation / peaks:** **Toubkal 4,167 m** (High Atlas, Morocco).
- **Approx. bounding region:** `[30, 37] × [−10, 10]`.
- **Game note:** A rain-shadow barrier — the north side is green, the south falls to desert (see Namib/desert relationship in §4).

#### Ethiopian Highlands (`~6–15°N, 35–42°E`)
- **Description:** The rugged "roof of Africa," the Abyssinian massif, NW (Semien) and SE (Bale) portions split by the Main Ethiopian Rift. Source of the Blue Nile (Lake Tana). [Wikipedia: Ethiopian Highlands]
- **Countries:** Ethiopia, Eritrea.
- **Dominant elevation / peaks:** **Ras Dashen 4,550 m**; numerous 4,000 m peaks.
- **Approx. bounding region:** `[6, 15] × [35, 42]`.
- **Game note:** High, cool, defensible "mountain fortress" that historically repelled invaders (Adwa 1896) — ideal key-terrain/defense-in-depth modelling.

#### Drakensberg (`~28–33°S, 27–30°E`)
- **Description:** ~1,000 km basalt escarpment/range along the eastern edge of the South African Highveld & Lesotho. [Wikipedia/Euratlas]
- **Countries:** South Africa, Lesotho, (Eswatini tip).
- **Dominant elevation / peaks:** **Thabana Ntlenyana 3,482 m** (Lesotho).
- **Approx. bounding region:** `[28, 33] × [27, 30]`.
- **Game note:** A formidable natural rampart (Lesotho sits atop it — a "mountain fortress state").

#### Great Dividing Range (Australia) (`~15–38°S, 145–153°E`)
- **Description:** Australia's main watershed/mountain system, ~3,500 km along the entire east coast (5th-longest range on Earth). [Wikipedia: Great Dividing Range]
- **Country:** Australia (Qld, NSW, Vic, ACT).
- **Dominant elevation / peaks:** **Mount Kosciuszko 2,228 m** (Snowy Mtns) — mainland Australia's highest.
- **Approx. bounding region:** `[15, 38] × [145, 153]` (range runs N–S; widest up to 400 km).
- **Game note:** An escarpment — most of it is Highland, not impassable; it funnels the populated east-coast corridor and separates the coast from the arid interior.

#### New Zealand Southern Alps (`~41–46°S, 167–173°E`)
- **Description:** ~500 km range along the western side of NZ's South Island, with the Main Divide; perennially snow-topped, glacier-carved. [Wikipedia: Southern Alps], [NASA EO]
- **Country:** New Zealand.
- **Dominant elevation / peaks:** **Aoraki/Mt Cook 3,724 m**; 16 peaks >3,000 m.
- **Approx. bounding region:** `[41, 46] × [167, 173]`.
- **Game note:** High, glaciated, rainshadow — separates the wet west coast from the Canterbury Plains; crossed by very few roads (Haast Pass etc.).

---

### 3.6 Mountain Walls, Passes & Gaps (the "where armies must go through")

A key design insight: **mountain ranges are only meaningful in gameplay if they are mostly impassable and can only be crossed at defined passes.** Below are the world's most historically decisive gaps, with coordinates so the game can mark pass tiles:

| Pass / Gap | Coordinates | Elevation | What it connects | Significance |
|---|---|---|---|---|
| **Khyber** | 34.08°N, 71.20°E | 1,070 m | Kabul↔Peshawar | Most famous invasion route onto the Indian subcontinent (Persians, Greeks/Alexander, Mughals, British) [Wikipedia, Britannica] |
| **Bolan** | 29.45°N, 67.49°E | 1,793 m | Quetta↔Sibi/Indus (Balochistan) | Southern gateway between Afghanistan/Iran and India [Wikipedia, Britannica] |
| **Khunjerab** | 36.85°N, 75.43°E | 4,693 m | Gilgit-Baltistan↔Xinjiang | Highest paved border crossing; Karakoram Highway; the Pakistan–China gate [Wikipedia] |
| **Wakhjir** | ~37.10°N, 74.40°E | ~4,923 m | Wakhan (AF)↔Taxkorgan (Xinjiang) | The narrow NE Silk Road sliver between Hindu Kush & Karakoram [Wikipedia Silk Road] |
| **Darial (Georgian Military Rd)** | ~42.75°N, 44.60°E | ~1,447 m | Russia↔Georgia (Caucasus) | One of only two crossings of the Caucasus; fortified since antiquity [Wikipedia, Jatland] |
| **Derbent (Caspian Gates)** | ~42.07°N, 48.30°E | coastal | Steppe↔Transcaucasia | The narrow coastal route between the Caucasus and the Caspian Sea [Wikipedia] |
| **Brenner** | 47.00°N, 11.50°E | 1,370 m | Austria↔Italy (Alps) | The lowest and busiest Alpine pass; the classic central gap [Britannica] |
| **Gotthard** | 46.55°N, 8.57°E | 2,106 m | Switzerland north↔south | The central Swiss massif pass (road & rail tunnels) [Britannica] |
| **Cilician Gates** | ~37.55°N, 34.80°E | ~1,050 m | Cilicia↔Anatolian plateau (Taurus) | Historic invasion gate into Anatolia [Britannica/other] |
| **South Pass** | ~42.40°N, 108.80°W | ~2,301 m | Great Plains↔Great Basin (Rockies) | The low Wyoming crossing used by the Oregon/Mormon Trails [USGS/Infoplease] |
| **Silk Road corridor gaps** | Tian Shan/Karakoram region | varies | Central Asia↔China/India | The network of passes (incl. Khunjerab, Wakhjir, and the Hexi Corridor south of the Gobi) that funnels all Central–South Asia traffic |

**"Great mountain wall" rings** the game can lean on as organic walls:
1. **Himalaya–Karakoram–Pamir–Hindu Kush** ring sealing South Asia (Khyber/Bolan/Khunjerab/Wakhjir as the only doors).
2. **The Caucasus wall** between the steppe and the Middle East (Darial + Derbent only).
3. **The Alpine arc** sealing Italy (Brenner + Gotthard + Mont Cenis).
4. **The Anatolian ring** (Taurus + Pontic) enclosing the central plateau.
5. **The Carpathian arc** + Transylvanian plateau fortress.
6. **The Andes wall** down the whole of South America.

---

## 4. Major Deserts

Deserts are the world's **attrition** terrain: they slow logistics, force reliance on fortified **oases/routes**, and punish armies that stray from the water sources. They are *not* elevation features — they must be layered from aridity/land-cover (see §1, §10).

### 4.1 Sahara (`~15–31°N, −15 to 35°E`)
- **Location:** Entire northern Africa, from the Atlantic to the Red Sea.
- **Countries:** Morocco, Algeria, Tunisia, Libya, Egypt, Sudan, Chad, Niger, Mali, Mauritania, W. Sahara (11 states).
- **Area:** ~9.2 million km² — the largest hot desert.
- **Bounding box:** `[15, 31] × [−15, 35]`.
- **Warfare notes:** Vast empty space; travel follows oases and the narrow **Nile** valley corridor; the **Qattara Depression** (below sea level) once formed the southern anchor of WWII El Alamein fortifications. Logistics, not combat, defeats armies here.

### 4.2 Arabian Desert (+ Rub' al Khali, An Nafud) (`~15–30°N, 35–60°E`)
- **Location:** Nearly the entire Arabian peninsula; bounded by Red Sea, Mediterranean/Syrian desert, Persian Gulf, Arabian Sea.
- **Countries:** Saudi Arabia (bulk), Yemen, Oman, UAE, Qatar, Kuwait, Iraq, Jordan (parts).
- **Area:** ~2.3 million km² (2nd largest).
- **Rub' al Khali ("Empty Quarter")** — the largest continuous sand sea (~650,000 km²), lying mainly in SE Saudi Arabia, with parts in Yemen, Oman, UAE; **bbox `[17, 23] × [44, 56]`** [Britannica].
- **An Nafud (Nefud)** — northern sand desert of Saudi Arabia; **bbox `[27, 31] × [38, 44]`**.
- **Warfare notes:** Hyper-arid; **hyper-aridity + heat** means deadly attrition; oases and wadis (e.g. along the Gulf/Red Sea flanks) are the only corridors.

### 4.3 Gobi (`~40–45°N, 90–110°E`)
- **Location:** Southern Mongolia and northern China (Inner Mongolia, Gansu/Hexi region).
- **Countries:** Mongolia, China.
- **Area:** ~1.3 million km² — Asia's largest desert (a cold, rocky "semidesert," not sand).
- **Bounding box:** `[40, 45] × [90, 110]` (centred ~42.5°N, 103°E).
- **Warfare notes:** Cold desert; slow movement; the **Hexi Corridor** (the east–west gap between the Gobi and the Tibetan plateau) is a natural Silk Road funnel — a strategic passage the game can highlight.

### 4.4 Taklamakan (`~37–40°N, 78–90°E`)
- **Location:** Tarim Basin, southern Xinjiang (China), ringed by Tian Shan, Kunlun, Pamir.
- **Country:** China.
- **Area:** ~270,000 km².
- **Bounding box:** `[37, 40] × [78, 90]`.
- **Warfare notes:** One of the most hostile deserts; travel only around its rim (Tarim Basin oasis circuit — the Silk Road's northern/southern routes). The centre should be effectively impassable/lethal.

### 4.5 Thar (Great Indian Desert) (`~24–30°N, 68–74°E`)
- **Location:** NW India (Rajasthan) + SE Pakistan (Sindh/Punjab), east of the Indus.
- **Countries:** India, Pakistan.
- **Area:** ~200,000–264,000 km².
- **Bounding box:** `[24, 30] × [68, 74]` (centred ~27°N, 71°E) [Wikipedia, Britannica].
- **Warfare notes:** The Indo-Pak borderland; the **Indus** and **Rann of Kachchh** bound it; movement constrained by lack of water — a real "arid buffer" between India and the passes to the west.

### 4.6 Kalahari (`~20–30°S, 18–26°E`)
- **Location:** Interior southern Africa (Botswana, eastern Namibia, N. Cape Province, South Africa).
- **Countries:** Botswana, Namibia, South Africa.
- **Area:** ~900,000 km² (semi-arid sandy savanna, not true desert).
- **Bounding box:** `[20, 30] × [18, 26]`.
- **Warfare notes:** Sparse; the **Okavango** wetlands pit into it; slow cross-country, but passable with effort.

### 4.7 Namib (`~20–30°S, 13–16°E`)
- **Location:** Coastal Namibia (Atlantic coastal strip).
- **Countries:** Namibia, (Angola/South Africa tips).
- **Area:** ~160,000 km².
- **Bounding box:** `[20, 30] × [13, 16]`.
- **Warfare notes:** A narrow hyper-arid coastal belt between the Atlantic and the escarpment — a natural barrier to parallel movement down the coast.

### 4.8 Australian Deserts — Great Victoria, Simpson, etc. (`~23–35°S, 120–140°E`)
- **Great Victoria** (`~28–32°S, 125–135°E`; ~348,000 km²), **Simpson** (`~23–27°S, 135–140°E`), plus Gibson, Great Sandy, Tanami, Strzelecki collectively, the arid interior of Australia.
- **Country:** Australia.
- **Warfare notes:** The uninhabited "Dead Heart" — enormous empty attrition space separating the east/south coast states from the far west/north; the populated coastlines are rings around a hostile interior.

### 4.9 North American Deserts — Mojave, Sonoran, Chihuahuan (`~23–37°N, 102–118°W`)
- **Mojave** (`~34–37°N, 114–117°W`; ~124,000 km² — smallest NA hot desert; the US southwest, incl. Death Valley); **Sonoran** (`~23–35°N, 110–115°W`; ~310,000 km² — NW Mexico + Arizona/California; incl. the Colorado-Gila corridor); **Chihuahuan** (`~23–33°N, 102–108°W`; ~453,000 km² — Chihuahua/Coahuila + New Mexico/Texas, the largest NA hot desert).
- **Countries:** USA, Mexico.
- **Warfare notes:** The "Old West" march routes forced armies to follow rivers (Rio Grande, Gila, Colorado) and water holes; crossing the Chihuahuan between Texas and Mexico is the classic historic invasion axis.

### 4.10 Atacama (`~18–27°S, 69–72°W`)
- **Location:** Northern Chile (and a sliver of Argentina/Peru), between the Pacific and the Andes.
- **Countries:** Chile, Peru, Bolivia.
- **Area:** ~140,000 km²; the driest non-polar place on Earth.
- **Bounding box:** `[18, 27] × [69, 72]`.
- **Warfare notes:** Nearly rainless plateau; the nitrate/copper war region; movement forced along the few coastward valleys and the railway corridors — a natural "impassable-adjacent" block.

### 4.11 Iranian Deserts — Dasht-e Kavir & Dasht-e Lut (`~28–36°N, 52–60°E`)
- **Dasht-e Kavir** (Great Salt Desert) (`~33–36°N, 52–57°E`; ~77,000 km²) — the salt/wetland central desert of Iran, north of the Zagros corridor.
- **Dasht-e Lut** (Lut Desert) (`~28–32°N, 56–60°E`; ~52,000–80,000 km²) — SE Iran; holds the **record highest surface temperature on Earth (70.7 °C / ~159 °F)** and famous yardang ("kalut") badlands [Wikipedia, desertsoftheworld]. UNEP ö – UNESCO World Heritage.
- **Countries:** Iran.
- **Warfare notes:** These two block the heart of Iran; all east–west (and much north–south) Iranian movement goes through the **Zagros gaps** and the narrow **Kerman/**Meshed passes between the two deserts — a superb "desert + pass" chokepoint region.

### 4.12 Karakum & Kyzylkum (Central Asian deserts)
- **Karakum** (`~38–42°N, 57–65°E`; ~350,000 km²) — much of Turkmenistan, between the Caspian and the Amu Darya. [Wikipedia]
- **Kyzylkum** (`~41–45°N, 60–68°E`; ~300,000 km²) — between the Amu Darya and Syr Darya, in Uzbekistan/Kazakhstan.
- **Countries:** Turkmenistan, Uzbekistan, Kazakhstan.
- **Warfare notes:** The low deserts of Central Asia over which Turkic/Mongol nomad armies historically swept; the **Amu Darya** and **Syr Darya** oasis lines are the lifelines.

**Desert impact on warfare (synthesis)** — deserts punish long supply lines (attrition per tile), force movement through **oases** and **river corridors** (natural chokepoints/supply lines of communication), hide forces poorly (no concealment), and allow encirclement by denial. See §8, §10.

---

## 5. Major Rivers

Rivers are the world's **defensive lines and crossing chokepoints**. In an RTS they make natural frontline boundaries and bridge/ford decision points. Table of the required rivers (lengths per the most-accepted measure; note Nile-vs-Amazon and Mississippi-vs-others ordering debates — cite ranges) [Britannica], [Wikipedia: List of river systems by length], [Smart Water], [World Rivers]:

| River | Source | Length (km) | Countries in basin | Outflow | Navigable / strategic note |
|---|---|---|---|---|---|
| **Amazon** (Ucayali–Apurímac system) | Andes, southern Peru | ~6,400–6,400 | Brazil, Peru, Colombia, Ecuador, Bolivia | Atlantic | Massively navigable; a continent-crossing water highway; ~20% of global river discharge |
| **Nile** (White + Blue Nile) | Rwanda/Burundi (White), Lake Tana, Ethiopia (Blue) | ~6,650 | Egypt, Sudan, S. Sudan, Uganda, Ethiopia, Rwanda, +5 | Mediterranean | The corridor of Egypt; navigable in stretches; historically THE line of communication of NE Africa |
| **Mississippi–Missouri** | Brower's Spring, Montana (Missouri) | ~6,275 | USA, Canada | Gulf of Mexico | Highly navigable; bisects the US; a strategic north–south axis |
| **Yangtze (Chang Jiang)** | Tibetan Plateau (Tanggula Mts), Qinghai | ~6,300 | China | East China Sea | Longest river entirely in one country; navigable deep into interior; a national line of communication |
| **Yellow (Huang He)** | Bayan Har Mts, Qinghai | ~5,464 | China | Bohai Sea | Silt-heavy, shifting course ("China's Sorrow"); less navigable; a defensive line in the north |
| **Mekong** | Tibetan Plateau (Qinghai) | ~4,350 | China, Myanmar, Laos, Thailand, Cambodia, Vietnam | South China Sea | Navigable in lower course; crosses 6 nations — a bounder between SE Asia states |
| **Ganges** | Gangotri glacier, Himalaya | ~2,500–2,700 | India, (Bangladesh via delta) | Bay of Bengal | Sacred, densely populated corridor; a classic defensive/agricultural line |
| **Indus** | Tibet (Himalaya), flows through Kashmir | ~3,180 | China, India, Pakistan | Arabian Sea | Lifetime of Pakistan; a strategic frontier and boundary (drainage separates India/Pakistan) |
| **Brahmaputra** | Tibetan Himalaya (Angsi glacier) | ~2,900 | China (Tibet), India, Bangladesh | Bay of Bengal (Ganges delta) | Huge seasonal flood; forms the mega-delta with the Ganges |
| **Ob–Irtysh** | Altai (Irtysh source, China), Altai/W. Siberia (Ob) | ~5,410 | Russia, China (Xinjiang), Kazakhstan | Gulf of Ob → Kara Sea (Arctic) | Long Siberian artery; mostly frozen much of year |
| **Yenisei–Angara** | Mongolia (Ider)/Lake Baikal | ~5,539 | Russia, Mongolia | Kara Sea (Arctic) | Largest Arctic-draining system; boundary east of the plain |
| **Lena** | Baikal Mts, SE Siberia | ~4,400 | Russia | Laptev Sea (Arctic) | Frozen NE-Siberian artery |
| **Volga** | Valdai Hills, European Russia | ~3,530 | Russia | Caspian Sea | Longest European river; the historic lifeline of Russia |
| **Danube** | Black Forest, Germany | ~2,850 | Germany, Austria, Slovakia, Hungary, Croatia, Serbia, Romania, Bulgaria, Ukraine, Moldova | Black Sea | Spans Central Europe to the Black Sea; navigable; a perennial front line across the Balkans/Black Sea approach |
| **Rhine** | Swiss Alps | ~1,230 | Switzerland, France, Germany, Netherlands | North Sea | Europe's busiest waterway; a defensive line in WW1/WW2 and the classic "west wall" river |
| **Tigris–Euphrates** | E. Anatolia (Turkey) | Euphrates ~2,800; Tigris ~1,950 | Turkey, Syria, Iraq (Iran drains into Tigris) | Shatt al-Arab → Persian Gulf | The cradle of civilization; a strategic double river system of Mesopotamia; partly navigable |
| **Congo** (Chambeshi source) | Zambia (Chambeshi) / Lualaba, DR Congo | ~4,700 | DR Congo, CAR, Rep. Congo, Angola, Cameroon, Zambia, Tanzania | Atlantic | The deepest river on Earth (>220 m); the only major river crossing the Equator twice; navigable in its middle course |
| **Niger** | Guinean Highlands | ~4,200 | Guinea, Mali, Niger, Nigeria | Gulf of Guinea | Boom/bend through the Sahel; a navigable west-African artery and the "bend" chokepoint |
| **Zambezi** | NW Zambia | ~2,657 | Zambia, Angola, Zimbabwe, Mozambique, (Namibia/Botswana) | Mozambique Channel (Indian Ocean) | Victoria Falls interrupts navigation; a Mozambican interior artery |
| **Murray–Darling** | Australian Alps | ~3,672 (system) | Australia | Southern Ocean (via Murray mouth) | Australia's only great river system (though low flow); the boundary of the once-fertile south-east inland |
| **Paraná–Paraguay** | Brazilian Highlands | ~4,880 | Brazil, Paraguay, Argentina | Río de la Plata → Atlantic | South America's #2 basin; navigable deep into the continent |
| **Amur (Heilong Jiang)** | Mongolia/Manchuria | ~4,444 | Russia, China, Mongolia | Sea of Okhotsk | Forms the long Russia–China border; a natural frontier line |
| **Colorado** | Rocky Mountains, Colorado | ~2,330 | USA, Mexico | Gulf of California | Arid-west lifeline; a boundary dividing basin states |
| **Columbia** | Rocky Mts, British Columbia | ~2,000 | Canada, USA | Pacific (near Astoria) | The Pacific NW artery separating the Cascades from the interior |

**Strategic river notes for gameplay**:
- **Rivers as defensive lines:** Because crossing is slow and exposed, rivers wonderfully model "lines of communication" and defense in depth. Historic examples: Rhine (Germany's west), Danube (Roman empire's border, and every Balkans war), Mississippi (US Civil War western theater), Vistula/Narew (Poland), Dnieper, Tigris.
- **Crossing chokepoints:** **Fords, bridges, ferries** are force-concentration points; the defender blows/guards them; the attacker seeks unguarded crossings. River crossing should approximate the historical rule: *costly, slow, exposed — but get over unopposed and it's a clean flank*.
- **The great river deltas (Ganges–Brahmaputra, Mekong, Niger, Nile)** are maze-like, network-of-channels terrain — excellent for concealment/flanking/guerrilla (Vietnam's Mekong Delta, Sundarbans).
- **The Amazon & Congo** are so vast that they resemble *impassable/very slow* corridors on any regional map — crossing the Amazon rainforest is historically near-impossible (it was bypassed, not crossed).

---

## 6. Sea / Strait Chokepoints & Island Chains

Maritime chokepoints shape **naval strategy and trade** in a naval-capable RTS. Each is a narrow passage between landmasses where trade and naval forces concentrate — and can be **blockaded** [Britannica: List of Important Straits], [Reuters], [Britannica: Bab el-Mandeb].

### The major chokepoints

| Chokepoint | Between (landmasses) | Approx. Lat/Long | Why it matters |
|---|---|---|---|
| **Strait of Hormuz** | Iran ↔ Oman / UAE | ~26.6°N, 56.3°E | Connects Persian Gulf & Gulf of Oman; ~20–30 km wide; ~1/5 of global oil/LNG transits it — the world's most critical naval chokepoint [Reuters, Britannica] |
| **Strait of Malacca** | Malay Peninsula (Malaysia/Thailand) ↔ Sumatra (Indonesia) | ~1–7°N, 95–103°E | ~900 km link between Indian & Pacific oceans; carries ~22–30% of global trade; world's busiest + largest oil transit chokepoint; narrows to ~2.7 km at Singapore (Phillips Channel) [Reuters] |
| **Strait of Bab-el-Mandeb** | Yemen ↔ Djibouti/Eritrea | ~12.5°N, 43.3°E | Connects Red Sea to the Gulf of Aden/Indian Ocean; ~32 km wide (2 channels split by Perim); 3rd-busiest oil chokepoint; half of container trade; the Suez-route gate [Britannica] |
| **Suez Canal** | Sinai ↔ Egypt mainland (artificial) | ~30–31°N, 32°E | Connects Mediterranean & Red Sea; eliminates the African circumnavigation (Cape of Good Hope adds ~3,500 nautical miles); fully artificial chokepoint [Britannica] |
| **Bosporus + Dardanelles (Turkish Straits)** | Europe (Thrace) ↔ Asia (Anatolia); Marmara between | ~40–41°N, 28–29°E | Connects Black Sea & Aegean/Mediterranean; the only exit for the Black-Sea navies; governed by treaty; a two-part strait with Constantinople/Istanbul at its throat |
| **Strait of Gibraltar** | Europe (Spain/Gibraltar) ↔ Africa (Morocco) | ~35.95°N, 5.5°W | Connects Mediterranean & Atlantic; 14.2 km narrowest; the pivot between the Atlantic world and the Mediterranean [Wikipedia] |
| **Panama Canal** | North/Central ↔ South America (Panama isthmus) | ~9°N, 79–80°W | Connects Atlantic & Pacific; eliminates the Cape Horn/Drake circumnavigation; artificial |
| **Strait of Dover (Pas de Calais)** | England ↔ France | ~51.0°N, 1.4°E | Narrowest part of the English Channel (~34 km); the pivot of every historic cross-Channel invasion (and the submarine/battleship gauntlet) [Wikidata/Britannica] |
| **Danish Straits (Kattegat / Skagerrak / Øresund)** | Scandinavia ↔ Denmark ↔ Germany | ~54–58°N, 8–12°E | The only exit/entrance of the Baltic Sea to the North Sea — choke the Baltic navies (historic Danish Sound Dues, both World Wars) |
| **Bering Strait** | Russia ↔ Alaska (USA) | ~65–66°N, 168–170°W | Connects Arctic & Pacific; ice-choked, remote — a cold-war symbolic and increasingly strategic Arctic passage |
| **Taiwan Strait** | China ↔ Taiwan | ~23–25°N, 119–120°E | ~180 km wide; the strategic flashpoint controlling access between East China Sea & South China Sea; ~21% of global maritime trade transits [Reuters] |
| **Korea Strait / Tsushima Strait** | Korea ↔ Japan | ~34–35°N, 129–130°E | Connects the Sea of Japan to the East China Sea; historic invasion corridor (Tsushima 1905) |
| **Luzon Strait** | Taiwan ↔ Luzon (Philippines) | ~21°N, 121°E | Main deep-water passage into/out of the South China Sea for US/Chinese fleets; the key to the "first island chain" |
| **Lombok Strait** | Bali ↔ Lombok (Indonesia) | ~8.5°S, 115.8°E | Deep-water alternate to Malacca for very large vessels; between the Java & Flores seas |
| **Sunda Strait** | Sumatra ↔ Java (Indonesia) | ~6.0°S, 105.5°E | Historic gate between the Indian Ocean & Java Sea (Krakatoa); an alternate to Malacca |
| **Drake Passage** | South America ↔ Antarctica | ~55–60°S, 65–75°W | The storm-choked gap between Atlantic & Pacific below Cape Horn; 800+ km wide — extreme-weather naval terrain |
| **Strait of Magellan** | Patagonia (mainland) ↔ Tierra del Fuego | ~53–54°S, 70–72°W | The historic (pre-Panama) passage from Atlantic to Pacific around the tip of South America |
| **Mozambique Channel** | Madagascar ↔ Mozambique (E. Africa) | ~12–26°S, 40–43°E | Wide but strategic Indian-Ocean passage between Africa & Madagascar; route to/from the Suez/Cape for east Africa |

**Why chokepoints matter (gameplay):** A naval warfare layer can treat these as **trade-concentration and blockade points** — a nation controlling one can tax/deny/blockade the "lines of communication" of a whole region. For the *land* game they matter less, but the straits (esp. Bosporus, Dardanelles, Gibraltar, Dover, Malacca, Hormuz, Bab-el-Mandeb, Suez) are natural **funnels** that concentrate movement — ideal "key terrain" and "defensive line" objectives.

---

## 7. Forests / Jungle / Taiga

Forests shape warfare through **concealment, slow/no-road movement, and logistics burden**. The game's `Forest/Jungle` layer (from land-cover data, §1) should be regional:

### 7.1 Amazon Rainforest (`~5°N–10°S, 50–75°W`)
- **Extent:** The largest tropical rainforest (~5.5–8 million km² basin; ~800 M ha as a "basin" figure cited by Congo comparison sources; Amazon biome sometimes quoted ~5.5 M km²).
- **Countries:** Brazil, Peru, Colombia, Venezuela, Ecuador, Bolivia, Guyana, Suriname, Fr. Guiana.
- **Bounding box:** `[5.8, −10] × [−75, −50]` (i.e. 5°N to 10°S, 50–75°W).
- **Warfare notes:** Dense canopy = the ultimate concealment (jungle guerrilla — see Vietnam, Chaco, rainforest insurgencies); near-total absence of roads = movement reduces to **rivers and trails**; immense attrition/immobilization for mechanized forces.

### 7.2 Congo Basin rainforest (`~5°N–5°S, 15–30°E`)
- **Extent:** World's 2nd-largest tropical forest; ~180–300 M ha; the humid forests ~1.6–2.0 M km².
- **Countries:** DR Congo, Rep. Congo, Gabon, Cameroon, CAR, Equatorial Guinea.
- **Bounding box:** `[6, −6] × [15, 30]`.
- **Warfare notes:** Same concealment/slow-motion logic as the Amazon, across the heart of Africa — the ultimate "green hell" attrition zone; the **Congo River** is the only real transport spine.

### 7.3 Siberian Taiga / Boreal (`~50–70°N, 30–180°E` across Russia; core `30–110°E` for western/central)
- **Extent:** The South Siberian + West/East Siberian taiga; worldwide taiga ≈ 17 million km² (11.5% of Earth's land) — largely in Russia and Canada [Wikipedia: Taiga/Boreal].
- **Country:** Russia (Siberia); also Scandinavia, Mongolia.
- **Bounding box (Russian core):** `[50, 70] × [60, 120]` (broad band runs ~50–65°N across the whole of Russia).
- **Warfare notes:** Vast roadless cold conifer swamp — extremely slow off-road movement, brutal winter attrition; the "natural fortress" of Russia's interior that defeated Napoleon and Hitler (a terrain+logistics effect, not a combat one).

### 7.4 Canadian Boreal (`~50–65°N, 55–130°W`)
- **Extent:** ~307 M ha of boreal forest in Canada (28% of the world's boreal zone); stretches Yukon→Newfoundland.
- **Country:** Canada (+Alaska).
- **Bounding box:** `[50, 65] × [130, 55]`.
- **Warfare notes:** Same slow/roadless/cold character as Siberian taiga; dense lakes/bogs (the Precambrian Shield).

### 7.5 Southeast Asian rainforests (`~2°S–20°N, 95–125°E`)
- **Extent:** Indonesian archipelago, Malay peninsula (Malaysia/Thailand), Borneo, Sumatra, New Guinea, plus the Indochinese monsoon forests.
- **Countries:** Indonesia, Malaysia, Thailand, Myanmar, Laos, Cambodia, Vietnam, Philippines, PNG.
- **Bounding box:** `[−3, 20] × [95, 130]`.
- **Warfare notes:** Dense jungle + mountains; the **Indochina/Vietnam** theater is the archetype of jungle counterinsurgency; rivers (Mekong, Irrawaddy) are the highways.

**Forest impact on warfare (synthesis):** Forests give **concealment** (units hard to spot/attack at range, ambush-friendly), **slow movement** (no roads, off-road penalty), and **reduced lines of communication** (supply harder). They should make defense/guerrilla viable and make open-mechanized blitzkrieg terrible. The game can model this as: *movement cost ×2–3, concealed until engaged, limited sight*. See §8, §10.

---

## 8. Open Terrain (Steppe / Plains)

Open, flat terrain is the realm of **rapid mechanized maneuver** — where speed, armor, and encirclement win.

| Region | Extent / bbox | Notes |
|---|---|---|
| **Eurasian Steppe** | `[45, 55] × [20, 115]` (broad belt, ~8,000 km) | The great grassland from Hungary→Ukraine→S. Russia→Kazakhstan→Mongolia→N. China; the historic "highway" of nomad cavalry (Scythians, Mongols, Cossacks) and of 20th-c. armor (WW2 Eastern Front) [Britannica: The Steppe], [Wikipedia: Eurasian Steppe] |
| **North European Plain** | `[48, 55] × [3, 30]` | Low (0–200 m) plain across Low Countries→Germany→Poland; the flat corridor between Central European highlands and the Baltic/North Sea; the traditional invasion "highway" into/out of Central Europe (Napoleon, WW1/WW2) [Wikipedia] |
| **Great Plains (US/Canada)** | `[37, 52] × [96, 105]` | The flat interior of North America east of the Rockies; the Civil War west + sweeping cavalry/armor country; also the "tornado/Alley" vastness |
| **Pampas (Argentina/Uruguay)** | `[28, 39] × [56, 65]` | The great temperate grassland of the Rio de la Plata basin — ideal open combat terrain |
| **Midwest / Great Plains interior (US)** | `[38, 47] × [85, 100]` | The flat agricultural heartland — combined with the Great Plains, forms the "container" of North American interior maneuver |
| **Hungarian / Pannonian Plain** | `[45, 48] × [16, 22]` | The flat basin ringed by the Carpathians & Alps — a natural "meeting ground"/battlefield in the center of Europe [Wikipedia: European Plain] |

**Why open terrain favors rapid mechanized maneuver:** flat, road-covered or roadless-but-driveable ground means high movement speed, good fields of fire, easy resupply, and encirclement possible via wide sweeping flanks. Contrast with forest/mountain/desert, which negate these advantages. This is why the "steppe corridor" and "northern European plain" have been the great war highways of history — and why the game should make them high-speed, high-visibility plains (movement cost 1.0, no concealment).

---

## 9. How Terrain Humanly Shapes Warfare

Beyond the physical mechanics above, terrain produces several *repeatable* military-psychological patterns. The game will feel "real" if these emerge from its rules:

### 9.1 Chokepoints, passes & defiles
- **Concept:** Where terrain constricts movement into a narrow corridor (a mountain pass, isthmus, bridge, strait), the defender gets a huge force-multiplier — a **"key terrain"** that both sides must fight for. Funneling reward: a small force can hold a large one, because only a few can fight at once (defile).
- **Examples:** Khyber, Bolan, Darial, Brenner, Thermopylae, the Furka/Gotthard, the Caucasus gates, the Cilician Gates, the Balkan passes, the naval straits (§6).
- **Game modelling:** Give passes a "bottleneck" property — defenders behind them get a *defense bonus + forts are worth more*; attackers spend movement to traverse and can't bring superiority to bear. Uncontestable = free flank.

### 9.2 River crossings
- **Concept:** A river is a **defensive line and a line of communication**. The defender holds the crossing points; a forced crossing is expensive *unless* unopposed (then it's a clean turning movement). Bridges/fords/ferries are the "chokepoints" of a river.
- **Examples:** Rhine, Danube, Vistula, Dnieper, Mississippi, Tigris, the Hudson/Champlain corridor.
- **Game modelling:** Crossing a river tile costs extra movement and leaves the crossing unit **exposed/vulnerable during the crossing turn**; destroyed bridges force either an engineering delay or finding a ford.

### 9.3 Mountain guerrilla / defensive advantage
- **Concept:** Mountains favor **defense, ambush, and guerrilla warfare**: rough ground negates armor and maneuver, concealment is abundant, and the defender on the high ground holds observation and fire advantage.
- **Examples:** Afghanistan (all history), the North-West Frontier, the Alps, the Carpathians, Dien Bien Phu, the Balkans (Yugoslav partisans), Vietnam's highlands, the Caucasus.
- **Game modelling:** Mountain/highland tiles grant the **defender a combat/HP bonus**, conceal attackers until engaged, slow armor, and resist being "broken" — so taking mountains is bloody and slow (the game already partially does this; expand it to a full defensive doctrine).

### 9.4 Desert logistics attrition
- **Concept:** Deserts don't defeat armies by combat — they defeat them by **logistics and attrition**: water/supply scarcity, extreme heat/cold, no cover, wide empty space that stretches supply lines to the breaking point.
- **Examples:** Alexander's Gedrosia march, Napoleon's 1798–99 Egypt/Syria, Rommel's North Africa, the Iraq-Iran war's "war of the cities" in the desert, the Gobi/Lut emptiness.
- **Game modelling:** Desert tiles increase **supply/attrition cost** (a per-turn upkeep penalty on units standing/supplying through them) and reduce/negate concealment & entrenchment benefit. This makes oases/rivers *vital* — they become the only sustainable routes.

### 9.5 Jungle/forest concealment
- **Concept:** Forest/jungle provide **concealment and ambush** and negate the range & speed advantages of mechanized/open warfare; no roads = slow logistics; the defender and guerrilla thrive.
- **Examples:** Vietnam, Malaya, Congo, Amazon insurgencies, the Ardennes.
- **Game modelling:** Forest/jungle tiles hide units until within short range, reduce sight/range, multiply movement cost, and make artillery/armor less effective.

### 9.6 Key concepts the game should expose
- **Key terrain** — a small piece of ground (a pass, a bridge, a hill, a strait, an oasis) whose control decides operations. The game should *flag* key terrain (passes, bridges, straits, oases) so players fight for them and the map "reads" strategically.
- **Lines of communication (LOC)** — the routes (roads, rivers, railroads, sea lanes) that supply an army. Severing LOC is how desert/mountain attrition works. Movement cost + supply range make this emergent.
- **Defense in depth** — successive prepared lines (rivers, ridgelines, fort belts) that trade space for time and bleed an attacker. If terrain slows attackers and rewards defenders, players will naturally build depth.

---

## 10. Game Implications — Concrete Recommendations

### 10.1 Refine the terrain algorithm to match real ranges

1. **Source a real global DEM** (NASADEM/SRTM for 60°N–56°S; Copernicus GLO-30/90 for high latitudes) and a **land-cover layer** (ESA Sentinel-2 / Copernicus / MODIS). Resample each to the game's tile resolution (one mean-elevation + dominant land-cover per map pixel). §2.
2. **Classify elevation into tiers** using the geomorphic thresholds: **Plains ≤300 m, Highland 300–1500 m, Mountain 1500–5000 m, Impassable >5000 m**. §1.
3. **Add a ruggedness (local slope/variance) pass** so *high-but-flat* regions (Tibetan Plateau, Andean Altiplano) read as Highland/Plateau rather than Mountain/Impassable. Compute ruggedness as the range or standard deviation of DEM elevations in the 3×3–5×5 neighbourhood. §1.
4. **Layer land-cover on top** to add: **Forest/Jungle** (from humid forest cover), **Desert** (from aridity class — *independent of elevation*), **Steppe** (from grassland). Use a lookup: `terrain = combine(elev_tier, rugged_tier, landcover_class)`. Ensure deserts appear even where low *and* where high (Gobi, Namib). §1, §4, §7.
5. **Carve the real ranges** by applying the thresholds globally: the Himalaya/Karakoram/Pamir/high-Andes/high-Caucasus cores naturally fall >5,000 m → **Impassable**, producing organic "mountain walls" with **passes** exactly where the DEM is lower (the bounding boxes in §3 tell the generator where these walls should be, and the DEM will confirm the actual gaps).
6. **Layer rivers from the land/water mask** along actual channels (use a river/water polygon dataset or the DEM's hydro-flat areas), not noise. Rivers should follow real courses so they line up with real borders/frontiers (Rhine, Danube, Indus, Volga). §5.
7. **Layer straits/chokepoints** as flagged maritime tiles at the coordinates in §6 for a naval layer; for land plays, mark the land **passes and defiles** from §3.6 and §4 oases. This auto-creates strategic geography.

### 10.2 Proposed combat rules — movement-cost & terrain-effects table

A concrete, implementable starting table (tune for balance; every tile has a **movement multiplier**, an **attrition/supply multiplier**, a **concealment** value, and a **defense bonus**):

| Terrain | Movement × | Attrition/Supply × | Concealment | Defense bonus | Notable rule |
|---|---|---|---|---|---|
| **Plains / Steppe** | 1.0 | 1.0 | none | 0 | fastest, open — armor/maneuver favored |
| **Highland** | 1.5 | 1.1 | partial | +1 | hills slow & slightly favor defense |
| **Mountain** | 2.5 | 1.5 | high | +2 | slow, bloody to take — defensive & guerrilla advantage |
| **Impassable (High Peak > ~5000 m)** | n/a (blocked) | n/a | n/a | n/a | cannot traverse; forms **walls** forcing use of passes |
| **River (crossing)** | 3.0 (while crossing) | 1.5 | none (exposed) | −1 on the defender of the crossing, defender behind gets + | crossing is slow & exposed; bridges/fords are chokepoints |
| **Forest / Jungle** | 2.0–3.0 | 1.3 | very high (hidden until short range) | +1 | concealment + slow; armor/artillery degraded; guerrilla favored |
| **Desert** | 2.0 (movement) | **2.0 (attrition per turn)** | none | −1 (can't entrench) | logistics attrition; oases/river corridors are the only sustainable routes |
| **Taiga / Boreal** | 2.5 | 1.5 + cold attrition | high | +1 | roadless, cold, swampy — very slow |
| **Ocean** | naval rules | n/a | n/a | n/a | straits act as lanes/blockades (§6) |

*Suggested modifiers on top of cost:* attacking into **Mountain/Jungle/Forest** grants the defender concealment (attacker can't see the full strength, takes ambush/defense penalties); **Plains/Steppe** grants the attacker full sight and wide-flank encirclement options; **Desert** adds a per-turn supply drain that punishes deep pushes without captured/controlled oases and river lines.

### 10.3 Use impassable terrain for highest peaks to force passes

- Apply an **"Impassable" tier to DEM cells > ~5,000 m** (and optionally to cold/glacier/ice sheets). This automatically makes **most of the Himalaya, Karakoram, high Andes, high Caucasus, and Pamir** impassable walls.
- Because those walls nearly ring the subcontinents, travel between regions is **forced through the lower pass tiles** (Khyber, Bolan, Khunjerab, Wakhjir, Darial, Derbent, the Silk Road Hexi corridor, alpine passes). §3.6 gives the coordinates so the generator can also **hand-flag** these pass tiles as low-elevation "gaps" even if DEM resolution doesn't show them distinctly (carve a 1–2 tile corridor at each pass).
- Mark these pass tiles with a **"Pass/Defile"** tag: movement through them remains slow (mountain), but they are the *only* way across — producing organic, geographically real chokepoints instead of arbitrary map borders.

### 10.4 Which natural chokepoints to highlight (priority order)

The game should visually flag and design around these (tag them "key terrain", give them fort/garrison value):

1. **Caucasus passes — Darial & Derbent** (the only two doors between the Eurasian steppe and the Middle East). §3.6.
2. **Khyber & Bolan** (the only practical gates between Afghanistan/Central Asia and India). §3.6.
3. **Khunjerab & Wakhjir** (the Karakoram/Pamir doors between Xinjiang and Pakistan/west — the extreme-altitude Silk Road slivers). §3.6.
4. **Central/North European gaps** — the flat corridors of the **North European Plain** and **Pannonian/Hungarian Plain** that funnel all movement across Central Europe (Brenner, Gotthard for the Alpine crossing; Dukla/Verecke for the Carpathians). §8, §3.6.
5. **Turkish Straits (Bosporus/Dardanelles)** — the only Baltic/Black-Sea–to-Mediterranean sea gate; and **Suez**, **Gibraltar**, **Dover** as the maritime funnels. §6.
6. **Maritime straits for naval play** — Hormuz, Malacca, Bab-el-Mandeb, Panama (trade/blockade points). §6.
7. **Desert oasis / river corridors** — the Nile, Tigris-Euphrates, Indus, Amu/Syr Darya, Hexi Corridor, and Gobi rim routes as the *only sustainable* trans-desert LOCs. §4, §5.
8. **Cilician Gates (Taurus)** and the **Zagros** gaps — the doors into Anatolia and the Iranian plateau. §3.4, §4.11.

### 10.5 Summary of implementable guidance

- **Data:** Download NASADEM (or SRTM) + Copernicus GLO-30 + a land-cover product; resample to tile resolution. Everything is free/public. §2.
- **Classification:** `Plains ≤300 m`, `Highland 300–1500 m`, `Mountain 1500–5000 m`, `Impassable >5000 m`, plus ruggedness to protect high plateaus; layer desert/forest/steppe from land-cover. §1, §10.1.
- **Rules:** one movement multiplier, one attrition multiplier, one concealment, and one defense bonus per terrain; rivers as exposed slow crossings; deserts as attrition sponges; forest/mountain as defender-friendly concealment; plains/steppe as fast obvious open ground. §10.2.
- **Chokepoints:** let impassable high peaks auto-create walls; hand-flag the historic passes/straits/oases from §3.6/§4/§6 as key terrain; these become the strategic bones of the map. §10.3–10.4.

---

## 11. Sources

Inline citations above reference the following sources (all consulted via web search for this report):

### Elevation / data
- **NASA JPL, Shuttle Radar Topography Mission (SRTM)** — science.jpl.nasa.gov/projects/srtm; earthdata.nasa.gov/data/instruments/srtm
- **NASA LP DAAC, NASADEM datasets** — data.nasa.gov (NASADEM_SHHP, NASADEM_HGT), NASA Open Data Portal
- **USGS, "Where can I get global elevation data?"** — usgs.gov faq (SRTM, ASTER GDEM v3, GMTED2010, GTOPO30, 3DEP)
- **USGS EROS, SRTM 1 Arc-Second Global** — data.usgs.gov / usgs.gov/centers/eros
- **Copernicus GLO-30 / GLO-90** (ESA/EU global DEM) — copernicus.eu / AWS registry
- **ESA Sentinel-2 / Copernicus Global Land Service; NASA MODIS** land-cover

### Ranges
- **Wikipedia: List of mountain ranges; List of mountain peaks of the US; List of mountains in the Andes**
- **Britannica:** Himalaya, Hindu Kush, Andes, Atlas Mountains, Rocky Mountain systems, Khyber Pass, Bolan Pass, Karakoram (compare), Ethiopian Highlands
- **Wikipedia:** Karakoram, Pamir, Hindu Kush, Tian Shan, Altai, Urals, Carpathians, Greater Caucasus, Alaska Range, Cascade Range (Simple), Rocky Mountains, Southern Alps, Great Dividing Range, Alborz, Drakensberg, Ethiopian Highlands, Verkhoyansk, Central Siberian Plateau (subranges), Pontic, Taurus
- **USGS** *Rocky Mountains* (publication), **LiveScience** *Andes: World's Longest Mountain Range*, **Infoplease** *Rocky Mountains*, **Euratlas** *World Atlas – Mountains* listing (Drakensberg, Alborz, Taurus, Pontic, Sayan, Zagros, etc.), **PeakVisor** *Karakoram, Great Dividing Range*, **NASA Earth Observatory** *Southern Alps*

### Deserts
- **Britannica:** Rub' al-Khali, Arabian Desert, Thar Desert, Kalahari Desert
- **Wikipedia:** List of deserts (by area), Taklamakan, Lut Desert, Gobi, Mojave, Kalahari; **desertsoftheworld.com** *Dasht-e Lut*

### Rivers
- **Britannica:** World's longest rivers; **Wikipedia:** List of river systems by length; **CountryReports** longest rivers; **Smart Water Magazine** top-10 rivers; **World Rivers** (Asia basins); **USGS** *Rivers of the World / World's Longest Rivers*; **Simple Wikipedia** *Mekong*

### Straits / maritime
- **Britannica:** List of Important Straits, Bab el-Mandeb Strait; **Reuters** *Hormuz crisis / Malacca Strait explainers* (2026); **Straits Times** *Malacca chokepoint*; **Wikipedia:** Strait of Gibraltar, Bab-el-Mandeb, Khunjerab (pass), Strait of Dover (wikidata)
- **US Energy Information Administration (EIA)** chokepoint statistics (referenced in Reuters)

### Warfare concepts
- Britannica's *The Steppe*; Wikipedia's *Eurasian Steppe*, *European Plain*, *North European Plain*, *South Pass* (Rockies), *Darial Gorge*, *Bolán Pass*, *Khyber Pass* — for the historic military-geography synthesis in §8–§9. General military-geography concepts (key terrain, lines of communication, defense in depth, chokepoints) are standard doctrine, summarized here for game design use.
