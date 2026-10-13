#!/usr/bin/env python3
"""Generate packages/engine-api/src/resources/WorldCountries.ts.

Rasterizes Natural Earth 1:50m admin-0 countries onto the World map's
2000x1000 grid, warps them onto the map's own (stylized) coastlines with a
coarse-to-fine demons registration, and writes a run-length encoded country
raster plus country metadata.

Requires numpy, Pillow and scipy. Usage:

  python3 scripts/realism/generate_world_countries.py \
      NE_GEOJSON [--map resources/maps/world/map.bin] \
      [--manifest resources/maps/world/manifest.json] \
      [--out packages/engine-api/src/resources/WorldCountries.ts] \
      [--debug-dir DIR]

The output is deterministic for a given input.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

W, H = 2000, 1000
SS = 2  # label raster supersampling
NEAR_NE = 30 * SS

# Manifest nation name -> ISO_A3 of the Natural Earth country it is.
MANIFEST_ISO = {
    "United States": "USA", "Canada": "CAN", "Mexico": "MEX", "Cuba": "CUB",
    "Colombia": "COL", "Venezuela": "VEN", "Argentina": "ARG", "Brazil": "BRA",
    "Antarctica": "ATA", "Greenland": "GRL", "Iceland": "ISL",
    "United Kingdom": "GBR", "Ireland": "IRL", "Spain": "ESP", "Italy": "ITA",
    "France": "FRA", "Germany": "DEU", "Sweden": "SWE", "Poland": "POL",
    "Belarus": "BLR", "Romania": "ROU", "T\u00fcrkiye": "TUR", "Norway": "NOR",
    "Finland": "FIN", "Ukraine": "UKR", "Russia": "RUS", "Mongolia": "MNG",
    "China": "CHN", "India": "IND", "Kazakhstan": "KAZ", "Iran": "IRN",
    "Saudi Arabia": "SAU", "Australia": "AUS", "New Zealand": "NZL",
    "Algeria": "DZA", "Libya": "LBY", "Egypt": "EGY", "Niger": "NER",
    "Sudan": "SDN", "DR Congo": "COD", "Ethiopia": "ETH",
    "South Africa": "ZAF", "Madagascar": "MDG", "Chad": "TCD",
    "Namibia": "NAM", "Philippines": "PHL", "Thailand": "THA",
    "Taiwan": "TWN", "Japan": "JPN", "Peru": "PER", "Zambia": "ZMB",
    "Latvia": "LVA", "Bhutan": "BTN", "Indonesia": "IDN", "Oman": "OMN",
    "Morocco": "MAR", "Uruguay": "URY", "Bolivia": "BOL", "Benin": "BEN",
    "Senegal": "SEN", "Kenya": "KEN", "Pakistan": "PAK", "Sri Lanka": "LKA",
}
# Manifest sub-regions map to their parent country (no splitting in this phase).
SUB_REGION_PARENT = {
    "Alaska": "United States", "California": "United States",
    "Texas": "United States", "Nunavut": "Canada", "Yukon": "Canada",
    "Quebec": "Canada", "Siberia": "Russia",
    "West Antarctica": "Antarctica", "East Antarctica": "Antarctica",
}
# Natural Earth NAME -> display name used by the game.
DISPLAY_NAME = {
    "United States of America": "United States",
    "Dem. Rep. Congo": "DR Congo",
    "Turkey": "T\u00fcrkiye",
    "Czechia": "Czechia",
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    "Central African Rep.": "Central African Republic",
    "Dominican Rep.": "Dominican Republic",
    "Eq. Guinea": "Equatorial Guinea",
    "W. Sahara": "Western Sahara",
    "S. Sudan": "South Sudan",
    "Falkland Is.": "Falkland Islands",
    "Fr. S. Antarctic Lands": "French Southern Lands",
    "Solomon Is.": "Solomon Islands",
    "N. Cyprus": "Northern Cyprus",
    "eSwatini": "Eswatini",
    "Macedonia": "North Macedonia",
}
# A manifest spawn that lands in a neighbouring country within this many tiles
# of its own country gets a small disc painted around it; further off, the
# spawn is reported and left alone rather than distorting the border.
SPAWN_PATCH_MAX = 6

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


def feature_code(p):
    if p["ISO_A3"] != "-99":
        return p["ISO_A3"]
    if p["ISO_A3_EH"] != "-99" and p["ADM0_A3"] == p["ISO_A3_EH"]:
        return p["ISO_A3_EH"]
    return p["ADM0_A3"]


def load_features(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if d.get("type") != "FeatureCollection":
        raise SystemExit("not a GeoJSON FeatureCollection")
    feats = []
    for f in d["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        rings = [poly[0] for poly in polys]
        feats.append((f["properties"], rings))
    return feats


def ring_area(ring):
    a = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        a += x0 * y1 - x1 * y0
    return abs(a) / 2


def rasterize_labels(feats):
    """Label image at SS x resolution. Smaller features are drawn last so
    enclaves (Lesotho, ...) win over their surroundings."""
    img = Image.new("I", (W * SS, H * SS), 0)
    dr = ImageDraw.Draw(img)
    order = sorted(
        range(len(feats)),
        key=lambda i: -sum(ring_area(r) for r in feats[i][1]),
    )
    for i in order:
        for ring in feats[i][1]:
            pts = [
                ((lon + 180) / 360 * W * SS, (90 - lat) / 180 * H * SS)
                for lon, lat in ring
            ]
            dr.polygon(pts, fill=i + 1)
    return np.asarray(img, dtype=np.int32)


def downsample(a, s):
    h, w = a.shape
    return a.reshape(h // s, s, w // s, s).mean(axis=(1, 3))


def warp(img, ux, uy, pad=64):
    """Backward warp: out(x, y) = img(x + ux, y + uy), x wraps, y clamps."""
    h, w = img.shape
    p = np.pad(img, ((0, 0), (pad, pad)), mode="wrap")
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cy = np.clip(yy + uy, 0, h - 1)
    cx = xx + ux + pad
    return ndimage.map_coordinates(p, [cy, cx], order=1, mode="nearest")


def demons(fixed, moving, ux, uy, iters, sigma, max_step=1.0):
    gy, gx = np.gradient(fixed)
    for _ in range(iters):
        mw = warp(moving, ux, uy)
        diff = mw - fixed
        my, mx = np.gradient(mw)
        sx, sy = (gx + mx) / 2, (gy + my) / 2
        den = sx * sx + sy * sy + diff * diff * 4 + 1e-6
        dx = -diff * sx / den
        dy = -diff * sy / den
        n = np.maximum(np.sqrt(dx * dx + dy * dy), 1e-9)
        k = np.minimum(1.0, max_step / n)
        ux = ux + dx * k * 4
        uy = uy + dy * k * 4
        ux = ndimage.gaussian_filter(ux, sigma, mode=("nearest", "wrap"))
        uy = ndimage.gaussian_filter(uy, sigma, mode=("nearest", "wrap"))
    return ux, uy


def register(fixed_full, moving_full):
    """Displacement field u (in full-res pixels): map(x) ~ ne(x + u)."""
    ux = uy = None
    for s, iters, sigma in ((8, 300, 1.5), (4, 150, 1.5),
                            (2, 60, 1.2), (1, 40, 1.0)):
        f = downsample(fixed_full, s).astype(np.float32)
        m = downsample(moving_full, s).astype(np.float32)
        if ux is None:
            ux = np.zeros_like(f)
            uy = np.zeros_like(f)
        else:
            z = (f.shape[0] / ux.shape[0], f.shape[1] / ux.shape[1])
            ux = ndimage.zoom(ux, z, order=1) * z[1]
            uy = ndimage.zoom(uy, z, order=1) * z[0]
        ux, uy = demons(f, m, ux.astype(np.float32), uy.astype(np.float32),
                        iters, sigma)
        yield s, ux * s, uy * s


def iou(a, b):
    u = np.count_nonzero(a | b)
    return np.count_nonzero(a & b) / u if u else 1.0


def warped_coords(ux, uy):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sx = np.floor((xx + ux + 0.5) * SS).astype(np.int64) % (W * SS)
    sy = np.clip(np.floor((yy + uy + 0.5) * SS).astype(np.int64), 0, H * SS - 1)
    return sy, sx


def assign_labels(labels, ux, uy, land):
    """Country label per land tile. Tiles whose warped position misses every
    polygon take the polygon nearest to that position (islands the warp
    left slightly off shore); if none is within NEAR_NE source pixels, the
    nearest assigned tile on the map."""
    sy, sx = warped_coords(ux, uy)
    raw = labels[sy, sx]
    dist, idx = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    near = labels[idx[0][sy, sx], idx[1][sy, sx]]
    lab = np.where(raw > 0, raw, np.where(dist[sy, sx] <= NEAR_NE, near, 0))
    lab = np.where(land, lab, 0)
    idx = ndimage.distance_transform_edt(
        lab == 0, return_distances=False, return_indices=True
    )
    return raw, np.where(land, lab[idx[0], idx[1]], 0)


def varint(n):
    """5 data bits per character, bit 5 set when more characters follow."""
    out = ""
    while True:
        d = n & 31
        n >>= 5
        out += ALPHABET[d | (32 if n else 0)]
        if not n:
            return out


def rle_encode(raster):
    flat = raster.ravel()
    starts = np.concatenate(([0], np.flatnonzero(flat[1:] != flat[:-1]) + 1))
    lengths = np.diff(np.concatenate((starts, [flat.size])))
    return "".join(varint(int(flat[s])) + varint(int(n - 1))
                   for s, n in zip(starts, lengths))


def ts_str(s):
    return json.dumps(s, ensure_ascii=True)


def interior_tile(mask):
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = np.pad(mask[y0:y1, x0:x1], 1)
    dist = ndimage.distance_transform_edt(sub)[1:-1, 1:-1]
    iy, ix = np.unravel_index(np.argmax(dist), dist.shape)
    return int(x0 + ix), int(y0 + iy)


def nearest_tile(mask, x, y):
    ys, xs = np.nonzero(mask)
    d = (xs - x) ** 2 + (ys - y) ** 2
    i = int(np.argmin(d))
    return int(xs[i]), int(ys[i]), float(np.sqrt(d[i]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("geojson")
    ap.add_argument("--map", default="resources/maps/world/map.bin")
    ap.add_argument("--manifest", default="resources/maps/world/manifest.json")
    ap.add_argument("--out", default="packages/engine-api/src/resources/WorldCountries.ts")
    ap.add_argument("--debug-dir")
    args = ap.parse_args()

    terrain = np.frombuffer(open(args.map, "rb").read(), dtype=np.uint8)
    if terrain.size != W * H:
        raise SystemExit("map.bin has unexpected size")
    land = ((terrain >> 7) & 1).reshape(H, W).astype(bool)

    feats = load_features(args.geojson)
    labels = rasterize_labels(feats)
    ne_mask = downsample((labels > 0).astype(np.float32), SS)
    continent = ["-"] + [f[0]["CONTINENT"] for f in feats]
    cont_ids = {c: i for i, c in enumerate(sorted(set(continent)))}
    cont_of = np.array([cont_ids[c] for c in continent], dtype=np.int32)

    for _, ux, uy in register(land.astype(np.float32), ne_mask):
        pass
    raw, lab = assign_labels(labels, ux, uy, land)
    if args.debug_dir:
        np.save(os.path.join(args.debug_dir, "ux.npy"), ux)
        np.save(os.path.join(args.debug_dir, "uy.npy"), uy)

    with open(args.manifest, encoding="utf-8") as f:
        manifest = json.load(f)

    # Stable country indices (sorted by code), only countries that own land.
    counts = np.bincount(lab.ravel(), minlength=len(feats) + 1)
    used = [i for i in range(len(feats)) if counts[i + 1] > 0]
    codes = {i: feature_code(feats[i][0]) for i in range(len(feats))}
    if len({codes[i] for i in used}) != len(used):
        raise SystemExit("duplicate country codes")
    used.sort(key=lambda i: codes[i])
    remap = np.zeros(len(feats) + 1, dtype=np.uint16)
    for n, i in enumerate(used):
        remap[i + 1] = n + 1
    raster = remap[lab]
    code_to_index = {codes[i]: n + 1 for n, i in enumerate(used)}
    index_to_code = {v: k for k, v in code_to_index.items()}

    # Quality report.
    final_feat = np.zeros(len(feats) + 1, dtype=np.int32)
    for n, i in enumerate(used):
        final_feat[n + 1] = i + 1
    map_cont = np.where(raster > 0, cont_of[final_feat[raster]], -1)
    before_cont = np.where(labels[::SS, ::SS] > 0, cont_of[labels[::SS, ::SS]], -1)
    after_cont = np.where(land & (raw > 0), cont_of[raw], -1)
    print("IoU before warp: %.4f" % iou(labels[::SS, ::SS] > 0, land))
    print("IoU after warp:  %.4f" % iou(raw > 0, land))
    for c, ci in cont_ids.items():
        if c in ("-", "Seven seas (open ocean)"):
            continue
        fm = map_cont == ci
        print("  %-24s before %.4f  after %.4f" % (
            c, iou(before_cont == ci, fm), iou(after_cont == ci, fm)))
    print("land tiles with no polygon (nearest-country fill): %d" % np.count_nonzero(land & (raw == 0)))
    print("country features without land tiles: %s" % ", ".join(
        feats[i][0]["NAME"] for i in range(len(feats)) if i not in set(used)))

    # Manifest spawns.
    spawn = {}
    problems = []
    yy, xx = np.mgrid[0:H, 0:W]
    for nat in manifest["nations"]:
        name = nat["name"]
        parent = SUB_REGION_PARENT.get(name, name)
        iso = MANIFEST_ISO[parent]
        x, y = nat["coordinates"]
        want = code_to_index[iso]
        if name == parent:
            spawn[iso] = (x, y)
        if raster[y, x] == want:
            continue
        nx, ny, d = nearest_tile(raster == want, x, y)
        if d <= SPAWN_PATCH_MAX:
            r = max(1, int(np.ceil(d)))
            disc = land & ((xx - x) ** 2 + (yy - y) ** 2 <= r * r)
            raster[disc] = want
            problems.append((name, iso, x, y, "patched r=%d (d=%.1f)" % (r, d)))
        else:
            problems.append((name, iso, x, y, "NOT patched, nearest own tile %d,%d d=%.1f" % (nx, ny, d)))
    print("spawn mismatches: %d" % len(problems))
    for name, iso, x, y, note in problems:
        print("  %s (%s) at %d,%d: %s" % (name, iso, x, y, note))

    tiles = np.bincount(raster.ravel(), minlength=len(used) + 1)
    if tiles[0] != W * H - np.count_nonzero(land) or np.any(tiles[1:] == 0):
        raise SystemExit("raster inconsistent with land mask")

    manifest_name = {MANIFEST_ISO[n]: n for n in MANIFEST_ISO}
    entries = []
    for n, i in enumerate(used):
        p = feats[i][0]
        code = codes[i]
        mask = raster == n + 1
        sp = spawn.get(code)
        if sp is not None and mask[sp[1], sp[0]]:
            anchor = sp
        elif sp is not None:
            anchor = nearest_tile(mask, *sp)[:2]
        else:
            anchor = interior_tile(mask)
        mname = manifest_name.get(code)
        name = mname or DISPLAY_NAME.get(p["NAME"], p["NAME"])
        entries.append(
            "  {\n"
            "    index: %d,\n    iso3: %s,\n    name: %s,\n    manifestName: %s,\n"
            "    sovereign: %s,\n    population: %d,\n    gdpMd: %d,\n"
            "    continent: %s,\n    subregion: %s,\n    tiles: %d,\n"
            "    spawn: %s,\n    anchor: [%d, %d],\n  },"
            % (n + 1, ts_str(code), ts_str(name),
               ts_str(mname) if mname else "null", ts_str(p["SOVEREIGNT"]),
               int(p["POP_EST"]), int(p["GDP_MD"]), ts_str(p["CONTINENT"]),
               ts_str(p["SUBREGION"]), int(tiles[n + 1]),
               "[%d, %d]" % sp if sp else "null", anchor[0], anchor[1]))

    rle = rle_encode(raster)
    chunks = [rle[k:k + 100] for k in range(0, len(rle), 100)]
    out = HEADER
    out += "export const WORLD_COUNTRIES: readonly WorldCountry[] = [\n"
    out += "\n".join(entries) + "\n];\n\n"
    out += RASTER_CODE.replace("@@RLE@@", ",\n  ".join(ts_str(c) for c in chunks))
    out = out.replace("@@ALPHABET@@", ALPHABET)
    with open(args.out, "w", encoding="ascii") as f:
        f.write(out)
    print("countries: %d, runs encoded chars: %d, wrote %s (%d bytes)" % (
        len(used), len(rle), args.out, len(out)))

    if args.debug_dir:
        np.save(os.path.join(args.debug_dir, "raster.npy"), raster)
        np.save(os.path.join(args.debug_dir, "land.npy"), land)
        with open(os.path.join(args.debug_dir, "codes.json"), "w") as f:
            json.dump(code_to_index, f)


HEADER = """// Generated by scripts/realism/generate_world_countries.py - do not edit.
// Source: Natural Earth 1:50m admin-0 countries (public domain), rasterized
// and warped onto the coastlines of resources/maps/world/map.bin.
// Regenerate: python3 scripts/realism/generate_world_countries.py \\
//   <ne_50m_admin_0_countries.geojson>

export interface WorldCountry {
  /** 1-based; the value of this country's tiles in the decoded raster. */
  readonly index: number;
  readonly iso3: string;
  readonly name: string;
  /** Name of the matching nation in the World manifest, if any. */
  readonly manifestName: string | null;
  /** Name of the sovereign state (differs for dependent territories). */
  readonly sovereign: string;
  readonly population: number;
  readonly gdpMd: number;
  readonly continent: string;
  readonly subregion: string;
  /** Number of land tiles the country owns in the raster. */
  readonly tiles: number;
  /** Manifest spawn [x, y] of the matching nation, if any. */
  readonly spawn: readonly [number, number] | null;
  /** A tile owned by the country: the spawn if it is inside, else the owned
   * tile nearest to the spawn, else the most interior tile. */
  readonly anchor: readonly [number, number];
}

"""

RASTER_CODE = """const RASTER_WIDTH = 2000;
const RASTER_HEIGHT = 1000;
const ALPHABET =
  "@@ALPHABET@@";

// Run-length encoded raster, row-major. Each run is a country index followed
// by the run length minus one, both as varints of 5 data bits per character
// (bit 5 set when more characters follow).
const RLE = [
  @@RLE@@,
].join("");

let cached: Uint16Array | undefined;

/**
 * Country index per tile (0 = ocean or lake), row-major, tile index
 * y * 2000 + x. Decoded once; callers must not mutate the result.
 */
export function decodeWorldCountryRaster(): Uint16Array {
  if (cached !== undefined) return cached;
  const digit = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    digit[ALPHABET.charCodeAt(i)] = i;
  }
  const out = new Uint16Array(RASTER_WIDTH * RASTER_HEIGHT);
  let pos = 0;
  const readVarint = (): number => {
    let value = 0;
    let shift = 0;
    for (;;) {
      const d = digit[RLE.charCodeAt(pos++)];
      value |= (d & 31) << shift;
      if ((d & 32) === 0) return value;
      shift += 5;
    }
  };
  let tile = 0;
  while (pos < RLE.length) {
    const country = readVarint();
    const end = tile + readVarint() + 1;
    out.fill(country, tile, end);
    tile = end;
  }
  if (tile !== out.length) {
    throw new Error("World country raster has the wrong size");
  }
  cached = out;
  return out;
}
"""


if __name__ == "__main__":
    main()
