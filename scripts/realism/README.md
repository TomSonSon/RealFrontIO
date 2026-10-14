# Realistic World country raster

`generate_world_countries.py` regenerates
`packages/engine-api/src/resources/WorldCountries.ts`: for every land tile of
the World map (`resources/maps/world/map.bin`) the real-world country that owns
it, plus country metadata (ISO code, name, population, GDP, continent, land
tile count, manifest spawn).

## Source and license

Natural Earth 1:50m admin-0 countries, public domain
(https://www.naturalearthdata.com/about/terms-of-use/). The GeoJSON is not
committed; download it once:

    curl -fsSL -o ne_50m_admin_0_countries.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson

## Run

Needs Python 3 with numpy, Pillow and scipy (not part of the repo's tooling).

    python3 scripts/realism/generate_world_countries.py ne_50m_admin_0_countries.geojson
    npx prettier --write packages/engine-api/src/resources/WorldCountries.ts

Options: `--map`, `--manifest`, `--out`, `--debug-dir` (writes numpy dumps of
the raster and warp field). The run prints IoU against the map's land mask,
manifest spawn mismatches, and countries too small to own a tile. Output is
deterministic for fixed inputs and library versions.

## How it works

1. Country polygons (exterior rings, smallest drawn last so enclaves win) are
   rasterized at 4000x2000, equirectangular. This projection only roughly
   matches the stylized World map (IoU about 0.50).
2. A coarse-to-fine demons registration (scales 8, 4, 2, 1) fits a smooth
   displacement field that moves the Natural Earth land mask onto the map's
   land mask (IoU about 0.975). Country labels are sampled through that field.
3. Land tiles the warp leaves without a country take the polygon nearest to
   their warped position, else the nearest assigned tile on the map. Ocean and
   lake tiles are 0.
4. A manifest spawn that lands in a neighbouring country within 6 tiles of its
   own country gets a small disc painted around it. Larger offsets (Bhutan,
   Benin, Pakistan) are left alone: the manifest coordinate is what is off.
5. The raster is run-length encoded (country index, run length - 1, as 5-bit
   varints in a 64 character alphabet) and embedded as a string.

## Known weak spots

Small island nations far from big coastlines (Pacific, Indian Ocean,
Caribbean) are poorly constrained by the smooth warp: many have no tile of
their own and a few are attributed to a neighbouring island group.

# Realistic World map

`generate_realistic_world_map.py` builds the 5000x2500 `Realistic World` map
(equirectangular, 1 tile = 0.072 degrees, about 8 km) and
`packages/engine-api/src/resources/RealWorldCountries.ts`. It writes
`map-generator/assets/maps/realisticworld/image.png` and
`resources/maps/realisticworld/{map,map4x,map16x}.bin`, `manifest.json` and
`thumbnail.webp`. The bins come from a Python port of the map-generator
(island and lake removal, shorelines, water depth, 2x2 downsampling) that is
byte-identical to the Go output for the World, Europe and Giant World maps, and
`image.png` is already cleaned, so `npm run gen-maps` reproduces the same bins.

Natural Earth 1:10m admin-0 countries (public domain, about 13 MB) and the 1:50m
file used for the old World warp are not committed:

    curl -fsSL -o ne_10m_admin_0_countries.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson

    curl -fsSL -o ne_10m_lakes.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson

    python3 scripts/realism/generate_realistic_world_map.py \
      ne_10m_admin_0_countries.geojson ne_50m_admin_0_countries.geojson \
      ne_10m_lakes.geojson
    npx prettier --write resources/maps/realisticworld/manifest.json \
      packages/engine-api/src/resources/RealWorldCountries.ts

`--warp-cache FILE.npz` stores the recomputed World warp between runs.

- Land is the 10m polygons rasterized at 2x2 sub-tiles (a tile is land at 50
  percent coverage; the most common country wins the tile). Disputed areas,
  glaciers and leases (`NOT_COUNTRIES`) are land but take the nearest country.
- The Natural Earth countries include inland lakes, so the 1:10m lakes
  (public domain, about 5 MB) are carved out of the land mask the same way.
  The map-generator then keeps water bodies of at least 200 tiles as lakes
  and fills smaller ones, so only larger lakes survive. Lake tiles have country 0. Narrow straits the grid closes are cut so every sea stays part of the
  single world ocean (4-connected); the Caspian is a lake.
- Terrain magnitude is sampled from the World map: the old warp is inverted by
  fixed-point iteration and each tile takes the normalized bilinear land
  magnitude at its position, or the nearest old land value where the old map is
  water. There is no noise, so relief is as smooth as a 2.5x upscale.
- Islands under 30 tiles are removed like any map-generator map, so small island
  states (Malta, Maldives, ...) have no land.

# Realism structures

`generate_realism_structures.py` regenerates
`packages/engine-api/src/resources/RealismStructures.ts`: the real world's
cities, ports, factories, silos, SAM launchers and defense posts on the
5000x2500 Realistic World map (`x = (lon + 180) / 360 * 5000`,
`y = (90 - lat) / 180 * 2500`). Every structure sits on land owned by its
country, on its own tile.

## Sources and license

Natural Earth 1:10m populated places (simple) and ports, public domain. Not
committed; download once:

    curl -fsSL -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson
    curl -fsSL -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_ports.geojson

Plus `research/real-world-realism/03-military-bases.md` and
`04-cities-and-industry.md` (parsed from their tables and bold coordinates) and
a small curated table of public nuclear sites in the script.

## Run

Needs Python 3 with numpy. Run `generate_realistic_world_map.py` first.

    python3 scripts/realism/generate_realism_structures.py \
      ne_10m_populated_places_simple.geojson ne_10m_ports.geojson
    npx prettier --write packages/engine-api/src/resources/RealismStructures.ts

It prints totals, per-country samples and every dropped structure with its
reason. Output is deterministic.

## Rules

- City: every place with pop_max >= 400000, plus one capital per country
  (Natural Earth capital, else the country anchor). Spacing 4 tiles, capitals
  always kept.
- Port: Natural Earth ports with scalerank <= 7, snapped within 6 tiles to a
  land tile with a 4-neighbour ocean tile (lakes do not count). If that fails,
  the nearest such tile of the owning country within 12 tiles of the port is
  used. Spacing 6.
- Factory: rows of doc 04 section 3; countries without rows get
  `clamp(round(sqrt(gdpBn) / 5), 0, 16)` next to their largest cities. Cap 50,
  spacing 4.
- Silo: nuclear states only; doc 03 silo rows, multi-silo fields, curated
  sites. Cap 20 (30 for the United States, Russia and China), spacing 8.
- SAM: doc 03 air rows, topped up to `clamp(round(sqrt(gdpBn) / 6), 0, 12)` at
  the capital and largest cities. Cap 35.
- Post: doc 03 army and naval rows, topped up to
  `clamp(round(sqrt(popM) / 1.3), 1, 25)` at the largest cities, alternating
  with ports in coastal countries. Cap 60.
- Doc rows are placed first; a row that falls in water or finds no free tile
  within a few tiles is dropped.
