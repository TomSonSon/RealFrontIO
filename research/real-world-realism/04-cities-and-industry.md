# 04 — Cities & Industry: Real-World Placement Data for OpenFront

> **Purpose:** Provide research-grade geographic (lat/long), population, and defense-industrial data so OpenFront (a nation-simulation RTS on a real-world map) can place starting **City** and **Factory** structures at realistic locations per country. Coordinates are in decimal degrees (WGS84) and feed the game's lat/long → pixel mapping.
>
> **Date of research:** October 2026 (all population figures are 2025 estimates unless noted).
> **Primary sources:** UN World Urbanization Prospects 2025 ([UN 2025]), US Census Bureau Vintage 2025 ([Census 2025]), Worldometer/Statista city datasets ([Worldometer 2025], [Statista 2025]), citypopulation.de conventions, SIPRI Top 100 Arms-Producing Companies 2024 ([SIPRI 2024-12]), Walter Pincus / open-source defense site lists.
>
> **Citation style** used inline, e.g.: *[UN WUP 2025]*, *[Census 2025]*, *[SIPRI Top 100 2024]*, *[Worldometer 2025]*, *[Statista 2025]*, *[citypopulation.de 2025]*.

---

## 1. METHODOLOGY — How real-world data scales game structures

OpenFront treats **City** and **Factory** as buildable structures that generate resources (typically money/economy and military/industrial capacity respectively). To keep the simulation believable while staying playable, we recommend the following data model.

### 1.1 City structure — driven by metropolitan population + economic weight

- **Primary input:** *Metropolitan* (urban agglomeration) population, **not** city-proper population. A city's catch basin — its metro area — is what actually represents aggregate economic activity. E.g. São Paulo's *metro* (~23 M) versus its city-proper (~12 M) changes its tier [UN WUP 2025].
- **Secondary modifier — "economic hub" bonus:** Capital cities and global financial centers (NYC, London, Tokyo, Shanghai, Singapore, Frankfurt, Dubai, etc.) get an economy/resource multiplier because GDP-per-capita and financial/port throughput are disproportionate to population alone [Statista 2025].
- **Scaling (proposed):** A logarithmic tiering prevents megacities from being comically unbalanced.

| Metro population (2025) | Tier | Example | Suggested economy multiplier (relative to baseline tier 1 = 1.0) |
|---|---|---|---|
| ≥ 20 M | Tier 5 (Mega) | Tokyo, Delhi, Shanghai, São Paulo, Mexico City, New York | 5.0 |
| 10–20 M | Tier 4 (Global) | Moscow, London, Paris, Chicago, Rio, Lagos, Karachi | 3.5 |
| 5–10 M | Tier 3 (Major) | Toronto, Berlin, Madrid, Cairo, Nairobi, Tehran, Jakarta | 2.0 |
| 2–5 M | Tier 2 (Regional) | Vienna, Prague, Seattle, Atlanta, Bogotá, Accra | 1.3 |
| 0.5–2 M | Tier 1 (National) | Most capitals of smaller states, mid-size metros | 1.0 |

Rationale: real city economic output scales closer to a power law (roughly 0.8–1.0 exponent on population) than linearly, so a logarithmic tier table approximates reality without extreme imbalance [citypopulation.de 2025].

### 1.2 Factory structure — driven by defense-industrial capacity

- **Primary input:** presence/scale of arms production, shipbuilding, aerospace, and defense R&D at a location (see §3).
- **Secondary modifier — category:** Aircraft, armored vehicles, missiles/drones, naval/shipbuilding, ammunition, electronics/radar, space. Factories could yield different *kinds* of military output (e.g., a naval yard for ships, an aerospace plant for air units).
- **Scaling (proposed):** Defense-industrial output is heavily concentrated in a few "defense super-spots" per country [SIPRI Top 100 2024].

| Defense-industrial weight | Tier | Examples | Suggested output multiplier |
|---|---|---|---|
| Global prime (top-10 company HQ / flagship line) | Tier 4 | Fort Worth (F-35), Seattle/Boeing, Barrow-in-Furness (UK subs), National Harbor belt | 3.0 |
| National champion (major plant / shipyard) | Tier 3 | Marietta GA, Newport News, Izhevsk, Shenyang, Bangalore, Changwon | 2.2 |
| Major regional plant | Tier 2 | Huntsville, St. Louis, Wichita, Warton, Bordeaux-Mérignac | 1.5 |
| Secondary/repair hub | Tier 1 | Most ordnance/repair plants | 1.0 |

Factory placement should reward the realistic clusters: aerospace on certain metros, naval on coasts, armored in interior industrial belts.

---

## 2. MAJOR CITIES BY REGION

> All populations are **metropolitan / urban-agglomeration 2025 estimates**. Coordinates are decimal degrees, positive = N/E, negative = S/W. "Capital" flags the national capital; "▲" = major economic hub.

### 2.1 United States (metro pop: [Census 2025], [Worldometer 2025])

| City | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|
| New York, NY | ~20.1 M | 40.71, -74.01 | ▲ Global financial hub |
| Los Angeles, CA | ~12.8 M | 34.05, -118.24 | ▲ West-coast hub / port |
| Chicago, IL | ~9.4 M | 41.88, -87.63 | ▲ Midwest industrial |
| Dallas–Fort Worth, TX | ~8.5 M | 32.78, -96.80 | ▲ Defense/tech |
| Houston, TX | ~7.9 M | 29.76, -95.37 | ▲ Energy/port |
| Atlanta, GA | ~6.5 M | 33.75, -84.39 | ▲ South hub |
| Washington DC | ~6.5 M | 38.90, -77.04 | Capital |
| Miami, FL | ~6.4 M | 25.76, -80.19 | ▲ South port |
| Philadelphia, PA | ~6.3 M | 39.95, -75.17 | ▲ Mid-Atlantic |
| Phoenix, AZ | ~5.2 M | 33.45, -112.07 | ▲ Sun Belt |
| Boston, MA | ~5.0 M | 42.36, -71.06 | ▲ Tech/edu hub |
| San Francisco Bay | ~4.6 M | 37.77, -122.42 | ▲ Tech hub |
| San Jose, CA | (part of SF CSA) | 37.34, -121.89 | ▲ Silicon Valley |
| Detroit, MI | ~4.4 M | 42.33, -83.05 | Auto/defense |
| Seattle, WA | ~4.2 M | 47.61, -122.33 | ▲ Boeing/aerospace |
| San Diego, CA | ~3.3 M | 32.72, -117.16 | ▲ Naval base |
| Denver, CO | ~3.1 M | 39.74, -104.99 | ▲ Mountain hub |
| San Antonio, TX | ~2.6 M | 29.42, -98.49 | Military city |

### 2.2 Canada [Statista 2025]

| City | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|
| Toronto, ON | ~7.1 M | 43.65, -79.38 | ▲ Largest / financial hub |
| Montréal, QC | ~4.5 M | 45.50, -73.57 | ▲ Major hub |
| Vancouver, BC | ~3.0 M | 49.28, -123.12 | ▲ Pacific port |
| Calgary, AB | ~1.6 M | 51.05, -114.07 | ▲ Energy |
| Ottawa, ON | ~1.5 M | 45.42, -75.70 | Capital |

### 2.3 Latin America [Visual Capitalist 2025 / Worldometer]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Mexico City | Mexico | ~22.8 M | 19.43, -99.13 | Capital ▲ |
| São Paulo | Brazil | ~23.0 M | -23.55, -46.63 | ▲ Largest in S. America |
| Rio de Janeiro | Brazil | ~13.9 M | -22.91, -43.17 | ▲ Hub |
| Buenos Aires | Argentina | ~15.8 M | -34.60, -58.38 | Capital ▲ |
| Bogotá | Colombia | ~11.8 M | 4.71, -74.07 | Capital ▲ |
| Lima | Peru | ~11.5 M | -12.05, -77.04 | Capital ▲ |
| Santiago | Chile | ~7.0 M | -33.45, -70.67 | Capital ▲ |
| Caracas | Venezuela | ~3.0 M | 10.48, -66.90 | Capital |
| Havana | Cuba | ~2.1 M | 23.11, -82.37 | Capital |
| Montevideo | Uruguay | ~1.8 M | -34.90, -56.16 | Capital ▲ |
| La Paz | Bolivia | ~2.0 M | -16.50, -68.15 | Admin capital |
| Brasília | Brazil | ~5.0 M | -15.79, -47.88 | Capital |

### 2.4 Europe [Statista 2025, NetValuator 2025]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Istanbul | Turkey | ~16.2 M | 41.01, 28.98 | ▲ Transcontinental hub |
| Moscow | Russia | ~12.7 M | 55.76, 37.62 | Capital ▲ |
| Paris | France | ~11.3 M | 48.86, 2.35 | Capital ▲ |
| London | UK | ~9.8 M | 51.51, -0.13 | Capital ▲ |
| Madrid | Spain | ~6.8 M | 40.42, -3.70 | Capital ▲ |
| Barcelona | Spain | ~5.7 M | 41.39, 2.17 | ▲ Hub |
| Saint Petersburg | Russia | ~5.6 M | 59.93, 30.34 | ▲ Naval hub |
| Berlin | Germany | ~5.5 M | 52.52, 13.40 | Capital ▲ |
| Rome | Italy | ~4.3 M | 41.90, 12.50 | Capital |
| Milan | Italy | ~3.2 M | 45.46, 9.19 | ▲ Industrial hub |
| Kyiv | Ukraine | ~3.0 M | 50.45, 30.52 | Capital ▲ |
| Warsaw | Poland | ~1.8 M | 52.23, 21.01 | Capital ▲ |
| Vienna | Austria | ~2.0 M | 48.21, 16.37 | Capital |
| Amsterdam | Netherlands | ~1.3 M | 52.37, 4.90 | ▲ Port hub |
| Rotterdam | Netherlands | ~1.0 M | 51.92, 4.48 | ▲ EU's #1 port |
| Brussels | Belgium | ~2.1 M | 50.85, 4.35 | Capital (EU HQ) |
| Prague | Czechia | ~1.3 M | 50.08, 14.44 | Capital |
| Zurich | Switzerland | ~1.5 M | 47.38, 8.54 | ▲ Financial |
| Stockholm | Sweden | ~1.7 M | 59.33, 18.07 | Capital |
| Oslo | Norway | ~1.1 M | 59.91, 10.75 | Capital |
| Athens | Greece | ~3.2 M | 37.98, 23.73 | Capital |
| Lisbon | Portugal | ~3.0 M | 38.72, -9.14 | Capital |
| Dublin | Ireland | ~1.3 M | 53.35, -6.26 | Capital |
| Helsinki | Finland | ~1.4 M | 60.17, 24.94 | Capital |

### 2.5 Middle East [Wiki Middle East metros 2025, Worldometer]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Cairo | Egypt | ~25.6 M | 30.04, 31.24 | Capital ▲ (largest in region/Africa) |
| Tehran | Iran | ~17.2 M | 35.69, 51.39 | Capital ▲ |
| Baghdad | Iraq | ~8.0 M | 33.32, 44.37 | Capital ▲ |
| Riyadh | Saudi Arabia | ~7.9 M | 24.71, 46.68 | Capital ▲ |
| Dubai | UAE | ~6.7 M | 25.20, 55.27 | ▲ Trade/port hub |
| Ankara | Turkey | ~5.3 M | 39.93, 32.86 | Capital ▲ |
| Tel Aviv | Israel | ~4.4 M | 32.09, 34.78 | ▲ Economic hub |
| Jerusalem | Israel | ~1.0 M | 31.77, 35.22 | Capital |
| Damascus | Syria | ~2.9 M | 33.51, 36.30 | Capital |
| Amman | Jordan | ~6.3 M | 31.95, 35.93 | Capital |
| Kuwait City | Kuwait | ~4.8 M | 29.38, 47.98 | Capital ▲ |
| Abu Dhabi | UAE | ~1.5 M | 24.45, 54.38 | Capital |

### 2.6 Africa [Visual Capitalist Africa 2026, Statista 2025]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Lagos | Nigeria | ~17.2 M | 6.52, 3.38 | ▲ Economic hub |
| Kinshasa | DR Congo | ~17.8 M | -4.44, 15.27 | Capital |
| Cairo | Egypt | ~25.6 M | 30.04, 31.24 | Capital ▲ |
| Johannesburg | South Africa | ~15.1 M | -26.20, 28.05 | ▲ Economic hub |
| Nairobi | Kenya | ~6.1 M | -1.29, 36.82 | Capital ▲ |
| Addis Ababa | Ethiopia | ~6.7 M | 9.02, 38.75 | Capital |
| Algiers | Algeria | ~3.2 M | 36.75, 3.06 | Capital |
| Casablanca | Morocco | ~4.5 M | 33.57, -7.59 | ▲ Economic hub |
| Accra | Ghana | ~5.6 M | 5.60, -0.19 | Capital ▲ |
| Dakar | Senegal | ~3.9 M | 14.72, -17.47 | Capital |
| Luanda | Angola | ~11.4 M | -8.84, 13.23 | Capital |
| Dar es Salaam | Tanzania | ~7.8 M | -6.79, 39.21 | City (former capital) tech hub |
| Abidjan | Côte d'Ivoire | ~6.6 M | 5.36, -4.01 | Capital ▲ |
| Khartoum | Sudan | ~7.4 M | 15.50, 32.56 | Capital |
| Kampala | Uganda | ~4.9 M | 0.35, 32.58 | Capital |
| Cape Town | South Africa | ~4.5 M | -33.92, 18.42 | Legislative capital ▲ |

### 2.7 South Asia [UN WUP 2025, Worldometer]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Delhi (NCR) | India | ~30.2 M | 28.70, 77.10 | Capital ▲ |
| Mumbai | India | ~20.2 M | 19.08, 72.88 | ▲ Financial hub / port |
| Karachi | Pakistan | ~21.4 M | 24.86, 67.01 | ▲ Port hub |
| Dhaka | Bangladesh | ~36.6 M | 23.81, 90.41 | Capital ▲ |
| Lahore | Pakistan | ~15.2 M | 31.55, 74.34 | ▲ Hub |
| Bengaluru (Bangalore) | India | ~13.2 M | 12.97, 77.59 | ▲ Tech/defense |
| Kolkata | India | ~22.5 M | 22.57, 88.36 | ▲ Port hub |
| Chennai | India | ~11.2 M | 13.08, 80.27 | ▲ Port hub |
| Hyderabad | India | ~9.2 M | 17.39, 78.49 | ▲ Tech/space |
| Ahmedabad | India | ~8.6 M | 23.02, 72.57 | ▲ Industrial |
| Pune | India | ~7.1 M | 18.52, 73.86 | ▲ Defense/industry |
| Colombo | Sri Lanka | ~2.3 M | 6.93, 79.85 | Capital ▲ |
| Islamabad | Pakistan | ~1.3 M | 33.68, 73.05 | Capital |

### 2.8 East Asia [UN WUP 2025, Worldometer]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Tokyo | Japan | ~33.4 M | 35.68, 139.69 | Capital ▲ |
| Beijing | China | ~17.0 M | 39.90, 116.40 | Capital ▲ |
| Shanghai | China | ~29.6 M | 31.23, 121.47 | ▲ #1 world port |
| Seoul | South Korea | ~22.5 M | 37.57, 126.98 | Capital ▲ |
| Taipei | Taiwan | ~7.0 M | 25.03, 121.57 | Capital ▲ |
| Hong Kong | China (SAR) | ~7.5 M | 22.32, 114.17 | ▲ Port/finance |
| Chongqing | China | ~32.1 M (city) | 29.56, 106.55 | ▲ Huge metro |
| Guangzhou | China | ~27.6 M | 23.13, 113.26 | ▲ Port hub |
| Shenzhen | China | ~13.9 M | 22.54, 114.06 | ▲ Tech hub |
| Wuhan | China | ~11.3 M | 30.59, 114.31 | ▲ Industrial |
| Chengdu | China | ~16.3 M | 30.57, 104.07 | ▲ Defense/aviation |
| Xi'an | China | ~13.0 M | 34.34, 108.94 | ▲ Aviation hub |
| Osaka | Japan | ~13.0 M | 34.69, 135.50 | ▲ Industrial hub |
| Manila | Philippines | ~24.7 M | 14.60, 120.98 | Capital ▲ |
| Jakarta | Indonesia | ~41.9 M | -6.21, 106.85 | ▲ Largest metro on Earth |
| Kuala Lumpur | Malaysia | ~8.4 M | 3.14, 101.69 | Capital ▲ |
| Bangkok | Thailand | ~18.2 M | 13.76, 100.50 | Capital ▲ |
| Singapore | Singapore | ~6.0 M | 1.35, 103.82 | ▲ #2 port / hub |
| Ho Chi Minh City | Vietnam | ~14.1 M | 10.82, 106.63 | ▲ Economic hub |
| Hanoi | Vietnam | ~8.5 M | 21.03, 105.85 | Capital |
| Pyongyang | North Korea | ~3.2 M | 39.04, 125.76 | Capital ▲ (military city) |

### 2.9 Oceania [citypopulation.de 2025]

| City | Country | Metro pop 2025 | Lat, Lon | Notes |
|---|---|---|---|---|
| Sydney | Australia | ~5.5 M | -33.87, 151.21 | ▲ Largest |
| Melbourne | Australia | ~5.2 M | -37.81, 144.96 | ▲ Hub |
| Brisbane | Australia | ~2.6 M | -27.47, 153.03 | ▲ Port |
| Perth | Australia | ~2.2 M | -31.95, 115.86 | ▲ Resource port |
| Auckland | New Zealand | ~1.7 M | -36.85, 174.76 | ▲ Largest |

---

## 3. ARMS INDUSTRY / DEFENSE-INDUSTRIAL HUBS

> Organized by major power. Each hub lists the key factories/shipyards and its lat/long. Ranking/company basis: [SIPRI Top 100 Arms-Producing Companies 2024], released Dec 2025.

### 3.1 United States — largest defense-industrial base in the world (~$334B arms revenue across 39 Top-100 firms) [SIPRI Top 100 2024]

| Hub | Company/Program | Lat, Lon |
|---|---|---|
| **Fort Worth–Dallas, TX** | Lockheed Martin F-35 final assembly (largest US defense metro, >$70B); Bell Textron V-280 | 32.74, -97.35 (Fort Worth) |
| **Seattle–Renton/Everett, WA** | Boeing (KC-46, P-8, commercial/defense); top-3 US defense metro | 47.50, -122.20 |
| **St. Louis, MO** | Boeing F/A-18, F-15; General Dynamics | 38.63, -90.20 |
| **Marietta, GA** (Atlanta) | Lockheed Martin C-130J, F-35 center-wing, Skunk Works | 33.95, -84.55 |
| **Newport News, VA** | Huntington Ingalls (HII) — sole US aircraft-carrier builder, nuclear subs | 36.98, -76.43 |
| **Norfolk, VA (Hampton Roads)** | World's largest naval base; HII shipbuilding/repair | 36.85, -76.29 |
| **Groton–New London, CT** | Electric Boat (General Dynamics) — nuclear submarines; Sikorsky helicopters; Pratt & Whitney engines | 41.35, -72.08 |
| **Wichita, KS** | Spirit AeroSystems (Boeing/McDonnell airframe manufacturing) | 37.69, -97.34 |
| **Detroit–Ann Arbor, MI** | General Dynamics Land Systems (Abrams tanks), auto-defense conversion | 42.33, -83.05 |
| **Huntsville, AL** | "Rocket City": Redstone Arsenal, NASA Marshall, missile defense (Boeing, Lockheed, Northrop) | 34.73, -86.59 |
| **Palmdale, CA** | Lockheed Skunk Works, Northrop (B-2 / B-21), Edwards AFB nearby | 34.58, -118.12 |
| **Pascagoula, MS** | Ingalls Shipbuilding (HII) — Navy surface combatants | 30.37, -88.56 |
| **Mobile, AL** | Austal USA, BAE shipyard — Navy littoral combat ships | 30.69, -88.04 |
| **San Diego, CA** | Naval Information Warfare SysCom; ship repair (BAE, GD NASSCO) | 32.72, -117.16 |
| **Andover/Boston, MA** | Raytheon/RTX radars & missiles, MIT Lincoln Lab | 42.66, -71.14 |
| **Fort Meade, MD** | NSA, Cyber Command, defense-cyber belt (Defense corridor) | 39.10, -76.75 |

### 3.2 Russia — state-owned Rostec umbrella + United Shipbuilding Corp [SIPRI Top 100 2024; GlobalSecurity]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Izhevsk, Udmurtia** | Kalashnikov (Izhmash/Izhmekh) small arms; IEMZ-Kupol (Almaz-Antey SAM) | 56.85, 53.21 |
| **Nizhny Tagil, Sverdlovsk** | UralVagonZavod — largest tank plant in the world (T-90M, T-14 Armata) | 57.91, 59.97 |
| **Moscow region** | MiG, Sukhoi OKB, Almaz-Antey air-defense (NPO Almaz), KRET electronics | 55.76, 37.62 |
| **Novosibirsk** | Sukhoi VPK (Suairs), Chkalov aircraft plant | 55.03, 82.92 |
| **Omsk** | Omsktransmash (T-80 modernization) | 54.99, 73.37 |
| **Kurgan** | Kurganmashzavod (BMP infantry fighting vehicles) | 55.45, 65.32 |
| **Perm** | Aviadvigatel / Perm Motors (aero engines) | 58.01, 56.25 |
| **St. Petersburg** | United Shipbuilding (Admiralty Shipyard, Baltic, Severnaya Verf); Obukhov (Almaz-Antey) | 59.93, 30.34 |
| **Arzamas, Nizhny Novgorod Oblast** | Arzamas machine plant (BTR-82) | 55.39, 43.81 |
| **Chelyabinsk** | Tractor plant / armor (ChTZ) | 55.16, 61.40 |

### 3.3 China — AVIC, NORINCO, CSSC, CASC, CETC [SIPRI Top 100 2024; COMAC/AVIC sources]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Shenyang, Liaoning** | Shenyang Aircraft (AVIC SAC) — J-15/J-16/J-35 fighters; Liming aero-engines | 41.80, 123.43 |
| **Chengdu, Sichuan** | Chengdu Aircraft (AVIC CAC) — J-20 stealth fighter, J-10 | 30.67, 104.07 |
| **Xi'an (Yanliang), Shaanxi** | Xi'an Aircraft (AVIC XAC) — Y-20 transport, H-6 bomber; aviation city | 34.66, 109.24 |
| **Harbin, Heilongjiang** | Harbin Aircraft (HAIG) — Z-20/Z-9 helicopters | 45.80, 126.53 |
| **Shanghai** | COMAC (C919 final assembly); Jiangnan Shipyard (aircraft carriers, submarines); CSSC | 31.23, 121.47 |
| **Dalian, Liaoning** | Dalian Shipbuilding (Liaoning carrier, Type 055 destroyers) | 38.91, 121.61 |
| **Wuhan, Hubei** | Wuhan Shipbuilding, missile/electronics | 30.59, 114.31 |
| **Mianyang, Sichuan** | China Academy of Engineering Physics (nuclear weapons R&D) | 31.47, 104.74 |
| **Beijing** | CETC electronics/radar, CASC space HQ, NORINCO HQ | 39.90, 116.40 |

### 3.4 India — DRDO + DPSUs (HAL, BEL, BDL, shipyards) [DRDO 2025, India Defence Wire]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Bengaluru, Karnataka** | Hindustan Aeronautics (HAL) — Tejas fighter; BEL electronics; DRDO aeronautics labs | 12.97, 77.59 |
| **Mumbai, Maharashtra** | Mazagon Dock Shipbuilders (MDL) — destroyers/frigates/submarines | 18.97, 72.83 |
| **Hyderabad, Telangana** | Bharat Dynamics (BDL) — missiles; DRDO missile complex; MIDHANI materials | 17.39, 78.49 |
| **Kolkata, W. Bengal** | Garden Reach Shipbuilders (GRSE) — warships; ordnance | 22.57, 88.36 |
| **Kochi (Cochin), Kerala** | Cochin Shipyard — navy ships; naval sonar lab NPOL | 9.93, 76.27 |
| **New Delhi** | DRDO HQ; BrahMos JV; defense ministry | 28.61, 77.21 |
| **Pune, Maharashtra** | Ordnance / Armoured Vehicles Nigam; MIDHANI | 18.52, 73.86 |
| **Chennai, Tamil Nadu** | AVNL (armoured vehicles), ordnance (OFB legacy) | 13.08, 80.27 |
| **Visakhapatnam, AP** | Hindustan Shipyard (submarines); Eastern Naval Command | 17.69, 83.22 |
| **Kanpur, UP** | Ordnance factories (small arms, ammunition) | 26.45, 80.33 |

### 3.5 United Kingdom — BAE Systems (#4 globally) [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Warton & Samlesbury, Lancashire** | BAE Typhoon final assembly; Tempest/GCAP fighter program | 53.76, -2.70 |
| **Brough, East Yorkshire** | BAE aerospace (wing components) | 53.73, -0.57 |
| **Barrow-in-Furness, Cumbria** | BAE Submarines — Astute & Dreadnought nuclear subs (Devonshire Dock Hall) | 54.11, -3.23 |
| **Glasgow (Govan & Scotstoun), Scotland** | BAE Naval Ships — Type 26 frigates (Clyde shipyards) | 55.86, -4.31 |
| **Telford, Shropshire** | Rheinmetall BAE Systems Land (RBSL) — Boxer, Challenger 3 | 52.68, -2.45 |

### 3.6 France — Dassault, Thales, Naval Group, MBDA, Safran [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Bordeaux–Mérignac** | Dassault Aviation — Rafale final assembly & flight test | 44.85, -0.69 |
| **Cherbourg, Normandy** | Naval Group — nuclear submarines (SSBN) | 49.64, -1.62 |
| **Brest, Brittany** | Naval Group / French Navy dockyard (carrier & ship support) | 48.39, -4.49 |
| **Toulouse** | Airbus, MBDA missiles; aerospace cluster | 43.60, 1.44 |
| **Paris region** | Thales, Dassault HQ; Safran | 48.86, 2.35 |
| **Le Plessis-Robinson / Selles** | MBDA (missiles) | 48.78, 2.26 |

### 3.7 Germany — Rheinmetall, KMW/KNDS, ThyssenKrupp, Airbus [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Munich, Bavaria** | Krauss-Maffei Wegmann (KMW — Leopard 2); Airbus Helicopters Donauwörth (nearby); Diehl | 48.14, 11.58 |
| **Kassel, Hesse** | Rheinmetall/KMW — armored vehicles; KMW plant | 51.32, 9.50 |
| **Düsseldorf** | Rheinmetall HQ (Rheinmetall Platz 1) | 51.23, 6.77 |
| **Kiel, Schleswig-Holstein** | ThyssenKrupp Marine Systems — submarines & frigates | 54.32, 10.14 |
| **Hamburg** | Airbus, Blohm+Voss, NVL shipbuilding | 53.55, 9.99 |
| **Unterlüß, Lower Saxony** | Rheinmetall main ammunition/vehicle plant | 52.85, 10.27 |

### 3.8 Türkiye — ASELSAN, TAI, Baykar, BMC, Roketsan [SIPRI Top 100 2024; Breaking Defense]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Ankara** | ASELSAN (electronics/radar, Oğulbey campus), Turkish Aerospace Industries (TAI — KAAN 5th-gen), Roketsan HQ, HAVELSAN | 39.93, 32.86 |
| **Istanbul (Tuzla / Pendik)** | Istanbul Naval Shipyard, Sedef, Anadolu shipyards; Baykar (Bayraktar drones) — Istanbul | 41.01, 28.98 |
| **İzmir** | BMC (land vehicles) | 38.42, 27.14 |
| **Sakarya / Adapazarı** | Otokar (land vehicles) | 40.78, 30.40 |

### 3.9 South Korea — Hanwha, KAI, Hyundai Heavy, Hanwha Ocean (ex-DSME) [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Changwon, South Gyeongsang** | Hanwha Aerospace HQ (Changwon plants — artillery, missiles); Hanwha Defense | 35.23, 128.68 |
| **Sacheon, South Gyeongsang** | Korea Aerospace Industries (KAI) — KF-21, FA-50, T-50 | 35.00, 128.06 |
| **Ulsan** | Hyundai Heavy Industries (HHI) shipyard — navy & commercial ships | 35.54, 129.34 |
| **Geoje (Okpo)** | Hanwha Ocean (formerly DSME) — submarines, destroyers, large ships | 34.85, 128.60 |
| **Seongnam/Pangyo** | Hanwha R&D campus; defense-electronics | 37.39, 127.12 |
| **Busan** | shipbuilding cluster & naval base | 35.18, 129.08 |

### 3.10 Japan — Mitsubishi Heavy Industries, Kawasaki [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Nagoya, Aichi** | MHI Nagoya Aerospace (F-35 final assembly, fighters); Kawasaki | 35.18, 136.91 |
| **Kobe, Hyogo** | MHI Kobe Shipyard (submarines, naval ships) | 34.68, 135.19 |
| **Kawasaki/Yokohama** | Kawasaki Heavy Industries (aircraft, submarines); MHI Yokohama yard | 35.53, 139.70 |
| **Tokyo** | MHI, IHI HQ; defense electronics | 35.68, 139.69 |

### 3.11 Ukraine — Ukroboronprom / Ukrainian Defense Industry [Ukroboronprom 2026]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Kyiv** | Ukrainian Defense Industry HQ; Antonov (aircraft); Arsenal; Kyiv armored-vehicle plant | 50.45, 30.52 |
| **Kharkiv** | Malyshev Plant (tanks, BMPs) + Kharkiv Morozov bureau (T-84); many AFV/engine plants | 49.99, 36.23 |
| **Lviv, W. Ukraine** | Lviv armored-vehicle plant; aircraft repair; relocated arms capacity (post-2022) | 49.84, 24.03 |
| **Zaporizhzhia** | Motor Sich (aero-engines); MiGremont / Ivchenko-Progress bureau | 47.84, 35.14 |
| **Dnipro (Dnipropetrovsk)** | Yuzhmash / PA Pivdenmash (missiles, launch vehicles); Antares | 48.46, 35.04 |
| **Mykolaiv** | Mykolaiv shipyards (naval); Zorya-Mashproekt (gas turbines) | 46.98, 31.99 |
| **Pavlohrad** | Pavlohrad Chemical Plant (solid rocket propellant) | 48.53, 35.87 |

### 3.12 Israel — Rafael, IAI, Elbit, IMI [SIPRI Top 100 2024]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Haifa** | Rafael HQ (Iron Dome, missiles); Elbit; naval | 32.79, 34.99 |
| **Lod / Tel Aviv** | Israel Aerospace Industries (IAI — HQ Lod, near Tel Aviv) | 31.95, 34.90 |
| **Tel Aviv region** | Elbit Systems HQ; IMI small arms | 32.09, 34.78 |
| **Beersheba / Ashkelon** | Elbit/IAI radar & defense plants (south cluster) | 31.25, 34.79 |
| **Dimona / Yavne** | Strategic/missile cluster (Rafael Yavne) | 31.87, 34.73 |

### 3.13 Pakistan — HIT, POF, PAC, NESCOM, KSEW [FAS Pakistan facilities]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Karachi** | Karachi Shipyard & Engineering Works (KSEW); naval base & dockyard | 24.86, 67.01 |
| **Taxila (Taxilia), Punjab** | Heavy Industries Taxila (HIT) — tanks (Al-Khalid); Wah ordnance complex | 33.75, 72.82 |
| **Kamra, Punjab** | Pakistan Aeronautical Complex (PAC) + Air Weapon Complex — aircraft & air weapons; near Attock | 33.86, 72.40 |
| **Wah Cantonment** | Pakistan Ordnance Factories (POF) — ammunition/small arms | 33.77, 72.71 |
| **Islamabad / Kahuta** | NESCOM (nuclear R&D, missiles); Kahuta Research Labs | 33.68, 73.05 |

### 3.14 North Korea — weapons complexes [open-source]

| Hub | Facility/Program | Lat, Lon |
|---|---|---|
| **Pyongyang** | Capital; defense HQ | 39.04, 125.76 |
| **Sunchon / Kusong** | Missile production & test complexes | 39.42, 125.93 (Sunchon) |
| **Hamhung** | Feb 8 Vinalon/chemical-weapons & munitions complex | 39.90, 127.54 |
| **Pyongsong** | Defense-industry cluster (north of Pyongyang) | 39.25, 125.87 |

---

## 4. STRATEGIC CHOKEPOINTS / TRADE CITIES

> Ports and maritime chokepoints are critical for a naval/shipping mechanic. Container-volume basis: [World Shipping Council / Lloyd's List 2025], [Container News 2025].

### 4.1 World's busiest container ports (2025 TEU)

| Port | Country | 2025 TEU | Lat, Lon | Strategic note |
|---|---|---|---|---|
| Shanghai | China | ~55.1 M | 31.23, 121.47 | #1 gateway port |
| Singapore | Singapore | ~44.7 M | 1.26, 103.84 | #1 transshipment hub; Strait of Malacca |
| Ningbo–Zhoushan | China | ~43.9 M | 29.87, 121.54 | #1 by total cargo; near Shanghai |
| Shenzhen | China | ~35.4 M | 22.60, 114.29 | #1 export gateway |
| Qingdao | China | ~32.9 M | 36.07, 120.30 | N. China gateway |
| Guangzhou | China | ~27.7 M | 23.10, 113.42 | Pearl River Delta |
| **Busan** | South Korea | ~24.9 M | 35.10, 129.06 | NE Asia transshipment; most reliable mega-hub |
| Tianjin | China | ~24.0 M | 39.00, 117.72 | Beijing's port |
| **Jebel Ali (Dubai)** | UAE | ~15.6 M | 25.02, 55.06 | Middle East hub; Strait of Hormuz |
| Port Klang | Malaysia | ~15.1 M | 2.90, 101.39 | Malacca transshipment |
| **Rotterdam** | Netherlands | ~14.2 M | 51.95, 4.14 | EU's #1 port (Europe's largest) |
| Antwerp–Bruges | Belgium | ~13.6 M | 51.27, 4.34 | EU #2 |
| **Hong Kong** | China SAR | ~12.9 M | 22.29, 114.16 | Declining but key S. China transshipment |
| **Los Angeles / Long Beach** | USA | ~20.1 M (combined) | 33.73, -118.27 | US's biggest gateway |
| New York / New Jersey | USA | ~8.9 M | 40.66, -74.04 | US E. coast gateway |

### 4.2 Maritime chokepoints

| Chokepoint | Country | Lat, Lon | Significance |
|---|---|---|---|
| Strait of Hormuz | Iran/UAE/Oman | 26.57, 56.25 | Oil superhighway (~20% global oil) |
| Strait of Malacca | Malaysia/Singapore | 2.5, ~101 | ~30% global shipping; energy & containers |
| Suez Canal (Port Said / Suez) | Egypt | 31.26, 32.30 (Port Said) | Asia–Europe shortcut |
| Bab-el-Mandeb | Djibouti/Yemen | 12.59, 43.35 | Red Sea gateway |
| Bosporus / Dardanelles | Türkiye | 41.04, 29.00 (Istanbul) | Black Sea access |
| Panama Canal | Panama | 9.08, -79.68 | Atlantic–Pacific |
| Strait of Gibraltar | Spain/Morocco | 36.00, -5.60 | Med–Atlantic |
| Malacca / Lombok alternatives | Indonesia | -8.7, 115.2 | S. chokepoint alternative |
| Cape of Good Hope | South Africa | -34.36, 18.47 | Route around Africa |

---

## 5. GAME IMPLICATIONS — concrete placement recommendations

### 5.1 Starting "City" structures — capitals + top ~3 per major power

Recommend a weighted table so each playable major has a realistic set of starting cities. Below are the recommended starting cities per major power (capital + top economic priorities), using metro population tiers from §2.

**United States:** New York (T5), Los Angeles (T5), Chicago (T4), Washington DC (T3, capital), Houston (T4), Dallas–Fort Worth (T4), Seattle (T3), Boston (T3), San Francisco (T3), Atlanta (T3), Miami (T3), San Diego (T3), Detroit (T3).

**China:** Shanghai (T5), Beijing (T5, capital), Guangzhou (T5), Shenzhen (T4), Chongqing (T5), Chengdu (T4), Wuhan (T4), Xi'an (T4), Tianjin (T4), Hong Kong (T4).

**Russia:** Moscow (T5, capital), Saint Petersburg (T4), Novosibirsk (T3), Yekaterinburg (T3), Nizhny Novgorod (T3), Kazan (T3).

**India:** Delhi (T5, capital), Mumbai (T5), Kolkata (T5), Bengaluru (T4), Chennai (T4), Hyderabad (T4), Pune (T3), Ahmedabad (T3).

**Japan:** Tokyo (T5, capital), Osaka (T4), Nagoya (T3), Yokohama/Tokyo metro.

**Germany:** Berlin (T3, capital), Hamburg (T3), Munich (T3), Rhine-Ruhr (T3), Frankfurt (T2), Cologne (T3).

**UK:** London (T4, capital), Birmingham (T3), Manchester (T3), Glasgow (T3).

**France:** Paris (T4, capital), Lyon (T3), Marseille (T3), Toulouse (T2).

**Brazil:** São Paulo (T5), Rio (T4), Brasília (T4, capital), Belo Horizonte (T3).

**Türkiye:** Istanbul (T5), Ankara (T3, capital), Izmir (T3).

**Each other sovereign state:** capital only (or capital + 1 largest economic city).

### 5.2 Starting "Factory" structures — defense hubs

Place starting Factories at the Tier-3/4 defense hubs of §3. Recommended per major power:

- **US:** Fort Worth (F-35), Seattle (Boeing), Marietta (Lockheed C-130), Newport News (carriers/subs), Groton (subs), St. Louis (Boeing fighters), Huntsville (missiles), Wichita (airframe), Detroit (tanks), Norfolk (naval), Palmdale (stealth).
- **China:** Shenyang, Chengdu, Xi'an, Harbin (aircraft), Shanghai (Jiangnan yard), Dalian (yard), Wuhan (yard), Mianyang (nuclear).
- **Russia:** Izhevsk (Kalashnikov), Nizhny Tagil (tanks), Novosibirsk, Omsk, Kurgan, Perm, St. Petersburg (yards), Moscow (AVICs/missiles).
- **India:** Bengaluru (HAL/BEL), Mumbai (MDL), Hyderabad (BDL/missiles), Kolkata (GRSE), Kochi (Cochin yard), Visakhapatnam (subs), Pune (ordnance).
- **UK:** Warton (Typhoon), Barrow-in-Furness (subs), Glasgow (frigates).
- **France:** Bordeaux-Mérignac (Rafale), Cherbourg (subs), Brest (naval), Toulouse (Airbus/MBDA).
- **Germany:** Munich (KMW/Leopard 2), Kassel, Kiel (TKMS subs), Düsseldorf (Rheinmetall), Unterlüß.
- **Türkiye:** Ankara (ASELSAN/TAI/Roketsan), Istanbul (shipyards/Baykar).
- **South Korea:** Changwon (Hanwha), Sacheon (KAI), Ulsan (HHI), Geoje (Hanwha Ocean).
- **Japan:** Nagoya (MHI aerospace), Kobe (MHI subs), Yokohama/Kawasaki.
- **Ukraine:** Kyiv (Antonov/Arsenal), Kharkiv (Malyshev tanks), Lviv, Zaporizhzhia (Motor Sich), Dnipro (missiles).
- **Israel:** Haifa (Rafael), Lod/Tel Aviv (IAI), Yavne.
- **Pakistan:** Karachi (KSEW), Taxila (HIT), Kamra (PAC), Wah (POF).
- **North Korea:** Pyongyang, Sunchon, Hamhung.

### 5.3 Scaling suggestion (concrete)

Apply the tier tables from §1 via a global lookup:
1. **City tier ↔ economy multiplier:** map each starting city's metro population to Tier 1–5 (see §1.1 table). Cap the maximum multiplier so megacities are strong but beatable.
2. **Factory tier ↔ output multiplier:** map defense hubs to Tier 1–4 (see §1.2 table). Track which *category* (air/naval/armor/missile/ammo) each factory produces so late-game builds feel nationally distinct.
3. **Weight balance:** A country's total starting "power" should approximate its real-world ranking: US ≈ China ≈ Russia > UK, France, Germany, India, Japan > South Korea, Türkiye, Israel, etc. Use the tier assignments to auto-balance starting loads, then let players expand.

This gives OpenFront a realistic, data-backed starting board while keeping full design freedom on how City/Factory resource output numbers map into actual gameplay.

---

*Report compiled October 2026. Population figures are 2025 UN/Census estimates; arms-industry data reflects SIPRI Top 100 (2024 revenues, published Dec 2025). Coordinates are WGS84 decimal degrees and are approximate for military/defense sites (many are sensitive; use for game placement only).*
