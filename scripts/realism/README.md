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
