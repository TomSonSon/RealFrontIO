# Data Sources & Licensing

Everything in this research folder is grounded in the sources below. This file is the master index: where the facts came from, what's **freely usable** in a shipped game, and the **geographic datasets** you need to actually rebuild OpenFront's terrain from real elevation.

## 1. Master source index by topic

| Topic | Primary sources used | Freely usable? |
|---|---|---|
| **Military capacity / budgets** | IISS *The Military Balance* (2024–26); SIPRI Military Expenditure Database & Yearbook (2024–26); World Bank | SIPRI public Fact Sheets ✅; World Bank ✅ (CC-BY); **IISS = paywalled/copyrighted** (use derived summaries only) |
| **Nuclear forces** | FAS *Status of World Nuclear Forces* / Nuclear Notebook; Arms Control Association; Center for Arms Control | ✅ both freely usable with citation |
| **Equipment cross-check** | Global Firepower; FlightGlobal/Cirium; USNI News; Oryx (Ukraine losses) | ⚠️ GFP explicit "not for reuse"; use only internally |
| **Countries / flag codes** | ISO 3166 list (Wikipedia) | ✅ |
| **City population 2025** | UN WUP, US Census, World Population Review, citypopulation.de, Statista | ✅ with citation (definitions differ — pick one) |
| **Arms-industry hubs** | SIPRI Top 100 arms producers; company annual reports; Wikipedia | ✅ (SIPRI Top 100 public) |
| **Bases (lat/long)** | US DoD, "List of United States military bases" (Wikipedia), CRS, Reuters, FAS, Naval News, USNI | ✅ factual locations |
| **Conflicts / alliances (2026)** | CFR Global Conflict Tracker, ISW/UnderstandingWar, UK House of Commons Library, Congress.gov CRS, Reuters/AP/CNN/ABC, Britannica, Wikipedia | ✅ factual — but **re-verify before shipping** (see README §4) |
| **Terrain / elevation / land-cover** | NASA SRTM/NASADEM, Copernicus GLO-30/90, ASTER GDEM, GMTED2010/GTOPO30, ESA Sentinel-2, MODIS, USGS EarthExplorer | ✅ all free & open (see §2) |

## 2. Geographic datasets — the key to a realistic terrain rebuild

This is the *actionable* part. OpenFront encodes terrain from a PNG's **blue channel** (`map-generator/assets/maps/world/image.png`): the taller the elevation, the higher the magnitude, split as Plains (mag 0–9), Highland (10–19), Mountain (20–30), and impassable (mag 31). To make real mountains appear where they really are, drive the blue channel from a real elevation model and add land-cover for desert/forest/steppe:

| Dataset | Type | Resolution / coverage | License | How to get it |
|---|---|---|---|---|
| **NASADEM / SRTM** | Elevation (DEM) | ~30 m (1 arc-sec), 60°N–56°S | Public domain (NASA/USGS) | NASA Earthdata, USGS EarthExplorer (free account) |
| **Copernicus GLO-30 / GLO-90** | Elevation (DEM) | 30 m / 90 m, **global incl. high latitudes** (better than SRTM north of 60°N) | Open (CC BY 4.0, ESA) | Copernicus Data Space / AWS Open Data |
| **ASTER GDEM** | Elevation (DEM) | 30 m, global 83°N–83°S | Free (METI/NASA) | USGS EarthExplorer |
| **GMTED2010 / GTOPO30** | Elevation (relief) | 250 m / 30 arc-sec, global | Public domain (USGS) | USGS |
| **ESA Sentinel-2** | Satellite imagery / land-cover input | 10 m, global | Open (CC BY-SA 3.0 IGO) | Copernicus Browser |
| **MODIS / ESA WorldCover** | Land cover (forest, desert, water) | 300 m (WorldCover) | Open (CC BY 4.0) | ESA WorldCover viewer |

**Recommended terrain pipeline:** resample a DEM (GLO-30 for high-lat completeness) to the 2000×1000 World grid → classify by hypsometric thresholds (see below) → write the blue channel → add a land-cover overlay for desert/forest coloring → run `npm run gen-maps`.

**Hypsometric threshold suggestion** (from `05-terrain-and-geography.md` §1, replace the current flat thresholds):

| TerrainType | Elevation | Impassable? |
|---|---|---|
| Plains | 0–300 m | no |
| Highland | 300–1500 m | no |
| Mountain | 1500–5000 m | no (slow) |
| Impassable (highest peaks) | >5000 m (most of the Himalaya–Karakoram–Hindu Kush high spine, high Andes) | **yes** (forces movement through passes) |

> Because >5000 m tiles become impassable walls, the Himalayas, Karakoram, Hindu Kush, and high Andes automatically become forbidden except at real passes (Khyber, Khunjerab, Bolan, Brenner, Darial…) — exactly the "you must go through the passes" behavior requested.

## 3. Mapping the sources into the game (quick cheat-sheet)

1. **Terrain → elevation DEM** (§2 above) + land-cover. *(freely downloadable, highest fidelity)*
2. **Nation strength → `02-military-capacity.md`** — MPI + the `troops = TROOP_SCALE·(tier_index^0.4)`, `gold = GOLD_SCALE·(budget^0.8)` formulas. *(SIPRI/FAS/World Bank)*
3. **Starting relations → `01-power-dynamics-and-alliances.md`** relationship matrix. *(CFR/ISW/country reporting)*
4. **Base start-structures → `03-military-bases.md`** lat/longs. *(DoD/Wikipedia/CRS)*
5. **Cities & factories → `04-cities-and-industry.md`** lat/longs + populations. *(UN/Census/SIPRI)*

## 4. Licensing for a shipped product

- **Safe to ship with attribution:** SIPRI public Fact Sheets & database-derived figures; FAS and Arms Control Association nuclear figures; World Bank data; **all the geographic datasets** listed in §2 (ESA/USGS NASA open licenses); factual coordinates.
- **Do NOT republish in-game:** IISS *Military Balance* tables (commercial/copyrighted), Global Firepower data (explicit no-reuse clause). If the game shows numbers derived from SIPRI/FAS/ACA, add an "About/Data sources: SIPRI, FAS, Arms Control Association, ESA CCO & NASA/USGS" credit line.

## 5. Data freshness

- SIPRI/IISS/FAS update **annually** — re-harvest military files each year to keep nation strength tracking reality.
- Geopolitical relations/conflicts move **monthly** — treat `01` as a point-in-time (late 2026) snapshot and re-verify before shipping.
- Terrain/elevation is essentially static (replaces once, occasionally check land-cover).
