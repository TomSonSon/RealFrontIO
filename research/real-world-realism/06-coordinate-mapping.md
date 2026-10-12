# Mapping Real-World Lat/Long → World-Map Pixels

Every feature in this research folder is given in **decimal degrees (lat, long)**. This document explains how to convert those to the OpenFront **World** map's pixel coordinate system so real cities, bases, factories, and terrain can be placed accurately.

## 1. The World map's coordinate system

- The **World** map (`map-generator/assets/maps/world/image.png`) is **2000 pixels wide × 1000 pixels tall** (see `resources/maps/world/manifest.json`).
- Origin is **top-left**; **x increases to the right**, **y increases down** (this matches the game's tile grid and `info.json` nation coordinates).
- The projection is best treated as **equirectangular / plate carrée** (full ~360°×180° world): longitude maps linearly to x, latitude maps linearly to y.

### Conversion formulas

```
pixel_x = (longitude + 180) / 360 * 2000
pixel_y = (90 - latitude) / 180 * 1000
```

### Inverse (to check a map point against research)

```
longitude = pixel_x / 2000 * 360 - 180
latitude  = 90 - pixel_y / 1000 * 180
```

> These give a **first-pass estimate**, not exact placement. Always **snap to the nearest valid land tile** (the map has 651,569 land tiles; a derived coordinate may land on ocean or impassable peaks) and hand-tune.

## 2. Calibration against existing nation spawns

The World map's `info.json` already places ~72 nations. Below, each nation's approximate geographic **centroid** is converted with the formula and compared to the map's actual spawn coordinate. The **y (latitude) fit is tight**; **x (longitude)** deviates because map authors place spawns at *convenient central land cells*, not geometric centroids.

| Nation | Approx centroid (lat, lon) | Formula → (x, y) | Spawn in info.json | Δx | Δy |
|---|---|---|---|---|---|
| United States | 39.8, −98.6 | (452, 279) | [484, 284] | +32 | +5 |
| France | 46.6, 2.6 | (1014, 241) | [948, 221] | −66 | −20 |
| United Kingdom | 54, −2 | (989, 200) | [925, 186] | −64 | −14 |
| Brazil | −10.3, −51.9 | (711, 557) | [684, 574] | −27 | +17 |
| Japan | 35.7, 139.7 | (1776, 302) | [1710, 290] | −66 | −12 |
| Australia | −25, 134 | (1744, 639) | [1679, 657] | −65 | +18 |
| Indonesia | −6.2, 106.8 | (1593, 534) | [1511, 524] | −82 | −10 |
| Sri Lanka | 7, 80.8 | (1449, 461) | [1384, 466] | −65 | +5 |
| Egypt | 26.8, 30 | (1167, 351) | [1094, 340] | −73 | −11 |
| Argentina | −34, −64 | (644, 689) | [565, 737] | −79 | +48 |

**Readings:**
- **Latitude (y) is reliable** — |Δy| ≈ 5–20 px, and the ×1000 px / 180° scale means 1 px ≈ 0.18° lat. Even the Argentina outlier (+48 px) is correct: its spawn sits in Patagonia, well south of the centroid.
- **Longitude (x) carries a roughly −65 to −80 px bias** for Europe/Asia/Africa/Japan/Australia (spawns sit west of geometric centroids), while the US is near-exact and South America mixes. This is a **combination of spawn-placement choice and a slightly non-uniform x-scale**, not a pure equirect error.
- Because x is only approximate, **do not rely on the formula alone for east–west placement.**

## 3. Recommended placement workflow for features (cities, bases, factories)

1. Convert `(lat, lon)` → `(x, y)` with the formula.
2. Snap to the nearest **land** (non-ocean, non-impassable) tile via `GameMapImpl` (`isLand`/`isImpassable`).
3. **Local x-correction:** where the target is within ~±1° of a known spawn/coastline, apply a local offset to match the plotted coastline. In practice, use a small set of *coastline anchors* (e.g., well-known coastal cities already fixed on the map) to fit a per-region x-slope.
4. For terrain (ranges/deserts), the lat/long **bounding boxes** in `05-terrain-and-geography.md` are large; convert the box corners with the formula and, for mountain ranges, keep whatever tiles are *already* high-elevation inside the box. Prefer elevation data over the box alone (see `07-data-sources.md`).
5. Add a small regression test that snaps known capitals/coastlines to land, so regressions in map generation never drop a city into the ocean.

## 4. Why exactness matters (and how to achieve it)

- A ±5 tile error misplaces a city a few hundred in-game pixels — invisible for most purposes, but wrong for **terrain chokepoints**, where a pass a few tiles off shifts an entire defense line.
- The genuinely accurate path for terrain is to **derive it from a real DEM** (SRTM/GLO-30) rather than hand-convert range boxes. `05-terrain-and-geography.md` and `07-data-sources.md` describe how: resample the DEM to the 2000×1000 grid, classify by elevation threshold, encode the blue channel (Plains <0–9, Highland 10–19, Mountain 20–30, impassable >5000 m), then re-run `npm run gen-maps`. That automatically makes the Andes, Himalaya, Alps, Rockies, etc. appear exactly where they are on the map — this is the highest-fidelity approach and is what the implementation should aim for.

## 5. Regional maps

The same formulas apply to the regional maps only after re-deriving their projection & extent from each map's `manifest.json` dimensions and its coastline; the World map's formulas are not directly reusable on `Europe`, `NorthAmerica`, etc. Those maps should be handled separately, using the same snap-to-land + calibration approach with their own anchor points.
