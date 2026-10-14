#!/usr/bin/env python3
"""Generate the 'Realistic World' map and its country raster.

Rasterizes Natural Earth 1:10m admin-0 countries (minus the 1:10m lakes,
which admin-0 treats as land) onto a 5000x2500
equirectangular grid (1 tile = 0.072 degrees) and writes
  - map-generator/assets/maps/realisticworld/image.png
  - resources/maps/realisticworld/{map,map4x,map16x}.bin, manifest.json,
    thumbnail.webp (byte-compatible with map-generator, which is not needed
    to run this script)
  - packages/engine-api/src/resources/RealWorldCountries.ts

Terrain magnitude comes from the stylized World map: the calibrated warp of
generate_world_countries.py is recomputed from the 1:50m countries and
inverted, so each new tile samples the old map where its lon/lat lands.

Requires numpy, Pillow and scipy. Usage:

  python3 scripts/realism/generate_realistic_world_map.py \
      NE_10M_GEOJSON NE_50M_GEOJSON NE_10M_LAKES_GEOJSON [--warp-cache FILE.npz]

Run `npx prettier --write` on the written manifest and TypeScript afterwards.
The output is deterministic for a given input.
"""
import argparse
import importlib.util
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

_spec = importlib.util.spec_from_file_location(
    "generate_world_countries", os.path.join(HERE, "generate_world_countries.py"))
old = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(old)

W, H = 5000, 2500
SS = 2
OW, OH = old.W, old.H
MIN_ISLAND = 30
MIN_LAKE = 200
MAX_MAG = 30
# Disputed or lease areas, glaciers and reefs: they are land, but not
# countries. Their tiles go to the nearest country.
NOT_COUNTRIES = {"SPI", "CNM", "KAS", "BRT", "PGA", "BJN", "SER", "SCR",
                 "KAB", "ESB", "WSB", "USG", "BRI"}
# Seas the 8 km grid cuts off from the ocean at narrow straits. Each entry is
# (lat, lon) points in two bodies of water and a padding in degrees. The
# bodies are compared inside the bounding box of the two points grown by the
# padding (None: the whole map); if they are not 4-connected there, the
# shortest gap between them is cut through land.
SEA_LINKS = [
    ((35.0, 18.0), (36.0, -12.0), None),  # Mediterranean - Atlantic (Gibraltar)
    ((40.8, 28.0), (39.0, 25.0), None),  # Marmara - Aegean (Dardanelles)
    ((42.5, 34.0), (40.8, 28.0), None),  # Black Sea - Marmara (Bosphorus)
    ((45.5, 36.0), (43.0, 34.0), None),  # Azov - Black Sea (Kerch)
    ((38.5, 15.5), (38.0, 15.5), 0.5),  # Tyrrhenian - Ionian (Messina)
    ((41.46, 8.95), (41.46, 9.5), 0.5),  # Sardinia - Corsica (Bonifacio)
    ((56.4, 12.2), (55.8, 12.7), 0.5),  # Kattegat - Baltic (Oresund)
]
# Canals as real (lat, lon) waypoints, carved as 2 tile wide water channels.
# The first and last waypoint lie in open sea so the canal joins the ocean.
CANALS = {
    "Suez": [(31.40, 32.31), (31.27, 32.31), (30.59, 32.27), (30.42, 32.34),
             (30.28, 32.38), (29.95, 32.55), (29.85, 32.56)],
    "Panama": [(9.50, -79.92), (9.36, -79.90), (9.22, -79.90), (9.14, -79.80),
               (9.06, -79.68), (8.95, -79.57), (8.82, -79.55)],
}


# ---------------------------------------------------------------- countries

def load_polygons(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if d.get("type") != "FeatureCollection":
        raise SystemExit("not a GeoJSON FeatureCollection")
    props, polys = [], []
    for i, f in enumerate(d["features"]):
        g = f["geometry"]
        if g["type"] not in ("Polygon", "MultiPolygon"):
            raise SystemExit("unexpected geometry " + g["type"])
        props.append(f["properties"])
        parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for rings in parts:
            polys.append((i, rings))
    return props, polys


def ring_area(ring):
    xs = np.array([p[0] for p in ring])
    ys = np.array([p[1] for p in ring])
    return abs(np.dot(xs, np.roll(ys, -1)) - np.dot(ys, np.roll(xs, -1))) / 2


def load_lake_polygons(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if d.get("type") != "FeatureCollection":
        raise SystemExit("not a GeoJSON FeatureCollection")
    polys = []
    for i, f in enumerate(d["features"]):
        g = f["geometry"]
        if g["type"] not in ("Polygon", "MultiPolygon"):
            raise SystemExit("unexpected geometry " + g["type"])
        parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        polys.extend((i, rings) for rings in parts)
    return polys


def lake_mask(polys):
    """Tiles covered by at least half of their SS*SS sub-tiles by a lake.
    Islands in a lake are holes of its polygon and stay land."""
    sub = rasterize(polys)
    cells = [sub[a::SS, b::SS] > 0 for a in range(SS) for b in range(SS)]
    return sum(c.astype(np.uint8) for c in cells) * 2 >= SS * SS


def rasterize(polys):
    """Feature id + 1 per sub-tile at SS x resolution. Larger polygons are
    drawn first so enclaves win, and holes are cleared after their polygon."""
    img = Image.new("I", (W * SS, H * SS), 0)
    dr = ImageDraw.Draw(img)

    def xy(ring):
        return [((lon + 180) / 360 * W * SS - 0.5, (90 - lat) / 180 * H * SS - 0.5)
                for lon, lat in ring]

    for i, rings in sorted(polys, key=lambda p: -ring_area(p[1][0])):
        dr.polygon(xy(rings[0]), fill=i + 1)
        for hole in rings[1:]:
            dr.polygon(xy(hole), fill=0)
    return np.asarray(img, dtype=np.int16)


def tile_labels(sub, ownable):
    """Land mask (>= 50 percent of the SS*SS sub-tiles) and the most common
    ownable feature per tile."""
    h, w = H, W
    cells = [sub[a::SS, b::SS] for a in range(SS) for b in range(SS)]
    land = sum((c > 0).astype(np.uint8) for c in cells) * 2 >= SS * SS
    vote = [np.where(ownable[c], c, 0) for c in cells]
    best = np.zeros((h, w), dtype=np.int16)
    best_n = np.zeros((h, w), dtype=np.uint8)
    for v in vote:
        n = sum(((u == v) & (v > 0)).astype(np.uint8) for u in vote)
        better = n > best_n
        best = np.where(better, v, best)
        best_n = np.where(better, n, best_n)
    return land, best


def tile_of(lat, lon):
    return int((90 - lat) / 180 * H), int((lon + 180) / 360 * W)


def link_seas(land):
    for a, b, pad in SEA_LINKS:
        y0, x0 = tile_of(*a)
        y1, x1 = tile_of(*b)
        if pad is None:
            ys, xs = slice(0, H), slice(0, W)
        else:
            p = int(pad / 0.072)
            ys = slice(max(min(y0, y1) - p, 0), min(max(y0, y1) + p, H - 1) + 1)
            xs = slice(max(min(x0, x1) - p, 0), min(max(x0, x1) + p, W - 1) + 1)
        lab, _ = label4(~land[ys, xs])
        la, lb = lab[y0 - ys.start, x0 - xs.start], lab[y1 - ys.start, x1 - xs.start]
        if la == 0 or lb == 0:
            raise SystemExit("sea link point is on land: %s %s" % (a, b))
        if la == lb:
            continue
        # Nearest tile of body A for every tile of the window.
        dist, idx = ndimage.distance_transform_edt(lab != la, return_indices=True)
        d = np.where(lab == lb, dist, np.inf)
        by, bx = np.unravel_index(np.argmin(d), d.shape)
        ay, ax = idx[0][by, bx], idx[1][by, bx]
        y, x = int(ay) + ys.start, int(ax) + xs.start
        ty, tx = int(by) + ys.start, int(bx) + xs.start
        cut = 0
        while (y, x) != (ty, tx):
            if abs(ty - y) >= abs(tx - x):
                y += 1 if ty > y else -1
            else:
                x += 1 if tx > x else -1
            cut += int(land[y, x])
            land[y, x] = False
        print("sea link %s -> %s: cut %d land tiles" % (a, b, cut))


def carve_canals(land):
    for name, pts in CANALS.items():
        cut = 0
        for (la, lo), (lb, lp) in zip(pts, pts[1:]):
            y0, x0 = tile_of(la, lo)
            y1, x1 = tile_of(lb, lp)
            n = max(abs(y1 - y0), abs(x1 - x0), 1)
            for i in range(n + 1):
                y = y0 + round((y1 - y0) * i / n)
                x = x0 + round((x1 - x0) * i / n)
                cut += int(land[y:y + 2, x:x + 2].sum())
                land[y:y + 2, x:x + 2] = False
        print("canal %s: cut %d land tiles" % (name, cut))


# ------------------------------------------------------------------ terrain

def invert_warp(ux, uy, step=10):
    """Old-map continuous position for every new tile centre, as arrays
    (old_x, old_y) of shape (H, W) float32. Solves x + u(x) = q by fixed-point
    iteration on a coarse grid, then interpolates the displacement."""
    gx = np.arange(0, W + 1, step)
    gy = np.arange(0, H + 1, step)
    qx = (gx * (OW / W))[None, :].repeat(len(gy), 0)
    qy = (gy * (OH / H))[:, None].repeat(len(gx), 1)
    pad = 64
    px = np.pad(ux, ((0, 0), (pad, pad)), mode="wrap")
    py = np.pad(uy, ((0, 0), (pad, pad)), mode="wrap")

    def sample(f, x, y):
        return ndimage.map_coordinates(
            f, [np.clip(y - 0.5, 0, OH - 1), x - 0.5 + pad], order=1, mode="nearest")

    x, y = qx.copy(), qy.copy()
    for _ in range(40):
        x = qx - sample(px, x, y)
        y = qy - sample(py, x, y)
    resid = np.hypot(x + sample(px, x, y) - qx, y + sample(py, x, y) - qy)
    print("warp inversion: %.3f%% of nodes within 2 old px (folds in the Arctic "
          "and Antarctic coast remain)" % (100.0 * (resid <= 2).mean()))
    dx, dy = qx - x, qy - y
    return dx, dy, step


def sample_magnitude(old_land, old_mag, warp, ys, xs):
    """Magnitude for new tiles (xs, ys): normalized bilinear sampling of the
    old land magnitudes, nearest old land value where all neighbours are water."""
    dx, dy, step = warp
    cx, cy = (xs + 0.5) / step, (ys + 0.5) / step
    ox = (xs + 0.5) * (OW / W) - ndimage.map_coordinates(dx, [cy, cx], order=1)
    oy = (ys + 0.5) * (OH / H) - ndimage.map_coordinates(dy, [cy, cx], order=1)
    pad = 4
    lm = np.pad(old_land * old_mag, ((0, 0), (pad, pad)), mode="wrap")
    lw = np.pad(old_land.astype(np.float32), ((0, 0), (pad, pad)), mode="wrap")
    coords = [np.clip(oy - 0.5, 0, OH - 1), ox - 0.5 + pad]
    num = ndimage.map_coordinates(lm, coords, order=1, mode="nearest")
    den = ndimage.map_coordinates(lw, coords, order=1, mode="nearest")
    idx = ndimage.distance_transform_edt(
        ~old_land, return_distances=False, return_indices=True)
    ry = np.clip(np.floor(oy).astype(int), 0, OH - 1)
    rx = np.floor(ox).astype(int) % OW
    nearest = old_mag[idx[0][ry, rx], idx[1][ry, rx]]
    val = np.where(den > 1e-3, num / np.maximum(den, 1e-3), nearest)
    return np.clip(np.rint(val), 0, MAX_MAG).astype(np.uint8)


# ----------------------------------------------- map-generator port (bins)

def label4(mask):
    return ndimage.label(mask)  # default structure is 4-connectivity


def remove_small_islands(land, mag, min_size):
    lab, n = label4(land)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    small = (sizes < min_size) & (np.arange(n + 1) > 0)
    kill = small[lab]
    land = land & ~kill
    mag = np.where(kill, 0, mag)
    return land, mag


def process_water(land, mag, remove_small):
    """Ocean flag (largest water body) and, if asked, small lakes -> land."""
    lab, n = label4(~land)
    ocean = np.zeros_like(land)
    if n:
        sizes = np.bincount(lab.ravel(), minlength=n + 1)
        sizes[0] = 0
        big = int(np.argmax(sizes))
        ocean = lab == big
        if remove_small:
            lake = (sizes < MIN_LAKE) & (np.arange(n + 1) != big) & (sizes > 0)
            fill = lake[lab]
            land = land | fill
            mag = np.where(fill, 0, mag)
    return land, mag, ocean


def neighbor_any(mask):
    out = np.zeros_like(mask)
    out[1:] |= mask[:-1]
    out[:-1] |= mask[1:]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def pack(land, mag, ocean):
    shore_land = land & neighbor_any(~land)
    shore_water = ~land & neighbor_any(land)
    dist = ndimage.distance_transform_cdt(~land, metric="taxicab")
    wd = np.maximum(dist - 1, 0)
    out = np.where(land, np.minimum(mag, 31), np.minimum((wd + 1) // 2, 31))
    out = out.astype(np.uint8)
    out |= np.where(land, 0x80, 0).astype(np.uint8)
    out |= np.where(shore_land | shore_water, 0x40, 0).astype(np.uint8)
    out |= np.where(~land & ocean, 0x20, 0).astype(np.uint8)
    return out, wd, shore_land | shore_water


def mini(land, mag):
    """Water wins; a land block takes its bottom-right tile's magnitude."""
    wl = land[0::2, 0::2] & land[0::2, 1::2] & land[1::2, 0::2] & land[1::2, 1::2]
    return wl, np.where(wl, mag[1::2, 1::2], 0)


def build_bins(land, mag, remove_small=True):
    """Port of map-generator GenerateMap: returns the three packed maps, the
    final full-size (land, mag, ocean) and the thumbnail inputs."""
    if remove_small:
        land, mag = remove_small_islands(land, mag, MIN_ISLAND)
    land, mag, ocean = process_water(land, mag, remove_small)
    full = (land, mag, ocean)
    l4, m4 = mini(land, mag)
    if remove_small:
        l4, m4 = remove_small_islands(l4, m4, MIN_ISLAND // 2)
    l4, m4, o4 = process_water(l4, m4, False)
    l16, m16 = mini(l4, m4)
    l16, m16, o16 = process_water(l16, m16, False)
    p, _, _ = pack(land, mag, ocean)
    p4, wd4, sh4 = pack(l4, m4, o4)
    p16, _, _ = pack(l16, m16, o16)
    return (p, int(land.sum())), (p4, int(l4.sum())), (p16, int(l16.sum())), \
        full, (l4, m4, wd4, sh4)


def thumbnail(l4, m4, wd4, sh4):
    h, w = l4.shape
    th, tw = h // 2, w // 2
    s = (slice(0, th * 2, 2), slice(0, tw * 2, 2))
    land, mag, shore, wd = l4[s], m4[s].astype(np.float64), sh4[s], wd4[s]
    out = np.zeros((th, tw, 4), dtype=np.uint8)
    adj = 1 - np.minimum(wd / 2.0, 10)
    out[..., 0] = np.maximum(70 + adj, 0)
    out[..., 1] = np.maximum(132 + adj, 0)
    out[..., 2] = np.maximum(180 + adj, 0)
    plains, high = land & (mag < 10), land & (mag >= 10) & (mag < 20)
    peak = land & (mag >= 20)
    rgba = np.zeros_like(out)
    rgba[plains] = np.stack([np.full(mag.shape, 190), (220 - 2 * mag), np.full(mag.shape, 138),
                             np.full(mag.shape, 255)], -1).astype(np.uint8)[plains]
    rgba[high] = np.stack([200 + 2 * mag, 183 + 2 * mag, 138 + 2 * mag,
                           np.full(mag.shape, 255)], -1).astype(np.uint8)[high]
    g = np.floor(230 + mag / 2)
    rgba[peak] = np.stack([g, g, g, np.full(mag.shape, 255)], -1).astype(np.uint8)[peak]
    rgba[land & shore] = (204, 203, 158, 255)
    return np.where(land[..., None], rgba, out)


# ---------------------------------------------------------------- RLE / TS

def rle_encode(raster):
    return old.rle_encode(raster)


HEADER = """// Generated by scripts/realism/generate_realistic_world_map.py - do not edit.
// Source: Natural Earth 1:10m admin-0 countries and lakes (public domain),
// rasterized onto resources/maps/realisticworld/map.bin (5000x2500, equirectangular).
// Regenerate: python3 scripts/realism/generate_realistic_world_map.py \\
//   <ne_10m_admin_0_countries.geojson> <ne_50m_admin_0_countries.geojson> \\
//   <ne_10m_lakes.geojson>

export interface RealWorldCountry {
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
  /** Same tile as anchor. */
  readonly spawn: readonly [number, number];
  /** The most interior tile of the country's largest connected area. */
  readonly anchor: readonly [number, number];
}

export const REAL_WORLD_WIDTH = 5000;
export const REAL_WORLD_HEIGHT = 2500;

"""

RASTER_CODE = """const ALPHABET =
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
 * y * REAL_WORLD_WIDTH + x. Decoded once; callers must not mutate the result.
 */
export function decodeRealWorldCountryRaster(): Uint16Array {
  if (cached !== undefined) return cached;
  const digit = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    digit[ALPHABET.charCodeAt(i)] = i;
  }
  const out = new Uint16Array(REAL_WORLD_WIDTH * REAL_WORLD_HEIGHT);
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
    throw new Error("Real world country raster has the wrong size");
  }
  cached = out;
  return out;
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ne10")
    ap.add_argument("ne50")
    ap.add_argument("lakes")
    ap.add_argument("--warp-cache")
    ap.add_argument("--old-map", default=os.path.join(ROOT, "resources/maps/world/map.bin"))
    ap.add_argument("--assets", default=os.path.join(ROOT, "map-generator/assets/maps/realisticworld"))
    ap.add_argument("--out-dir", default=os.path.join(ROOT, "resources/maps/realisticworld"))
    ap.add_argument("--out-ts", default=os.path.join(
        ROOT, "packages/engine-api/src/resources/RealWorldCountries.ts"))
    ap.add_argument("--debug-dir")
    args = ap.parse_args()

    # Stylized map and the warp that registers Natural Earth onto it.
    t = np.frombuffer(open(args.old_map, "rb").read(), dtype=np.uint8)
    if t.size != OW * OH:
        raise SystemExit("old map has unexpected size")
    old_land = ((t >> 7) & 1).reshape(OH, OW).astype(bool)
    old_mag = (t & 31).reshape(OH, OW).astype(np.float32)
    if args.warp_cache and os.path.exists(args.warp_cache):
        z = np.load(args.warp_cache)
        ux, uy = z["ux"], z["uy"]
    else:
        feats50 = old.load_features(args.ne50)
        ne_mask = old.downsample((old.rasterize_labels(feats50) > 0).astype(np.float32), old.SS)
        for _, ux, uy in old.register(old_land.astype(np.float32), ne_mask):
            pass
        if args.warp_cache:
            np.savez(args.warp_cache, ux=ux, uy=uy)

    # Countries.
    props, polys = load_polygons(args.ne10)
    codes = [old.feature_code(p) for p in props]
    ownable = np.array([False] + [c not in NOT_COUNTRIES for c in codes])
    sub = rasterize(polys)
    land, label = tile_labels(sub, ownable)
    del sub
    land &= ~lake_mask(load_lake_polygons(args.lakes))
    link_seas(land)
    carve_canals(land)
    print("NE land tiles: %d" % land.sum())

    # Terrain for every NE land tile, then the map-generator cleanup.
    ys, xs = np.nonzero(land)
    warp = invert_warp(ux, uy)
    mag = np.zeros((H, W), dtype=np.uint8)
    mag[ys, xs] = sample_magnitude(old_land, old_mag, warp, ys.astype(np.float32),
                                   xs.astype(np.float32))
    full4 = build_bins(land, mag)
    (b1, n1), (b4, n4), (b16, n16), (fl, fm, fo), thumb_in = full4
    print("land tiles: map %d, map4x %d, map16x %d" % (n1, n4, n16))
    print("ocean tiles %d, lake tiles %d" % (fo.sum(), (~fl & ~fo).sum()))

    # Country raster on the final land mask: leftover land takes the nearest label.
    lab = np.where(fl, label, 0)
    idx = ndimage.distance_transform_edt(lab == 0, return_distances=False, return_indices=True)
    lab = np.where(fl, lab[idx[0], idx[1]], 0)
    counts = np.bincount(lab.ravel(), minlength=len(props) + 1)
    used = sorted((i for i in range(len(props)) if counts[i + 1] > 0), key=lambda i: codes[i])
    if len({codes[i] for i in used}) != len(used):
        raise SystemExit("duplicate country codes")
    remap = np.zeros(len(props) + 1, dtype=np.uint16)
    for n, i in enumerate(used):
        remap[i + 1] = n + 1
    raster = remap[lab]
    tiles = np.bincount(raster.ravel(), minlength=len(used) + 1)
    if tiles[0] != W * H - n1 or np.any(tiles[1:] == 0):
        raise SystemExit("raster inconsistent with land mask")
    print("countries: %d; features without land: %s" % (len(used), ", ".join(
        props[i]["NAME"] for i in range(len(props)) if i not in set(used))))

    # Files for map-generator and the engine.
    os.makedirs(args.assets, exist_ok=True)
    os.makedirs(args.out_dir, exist_ok=True)
    blue = np.where(fl, 140 + 2 * np.minimum(fm, MAX_MAG), 106).astype(np.uint8)
    Image.fromarray(blue).save(os.path.join(args.assets, "image.png"), optimize=True)
    for name, data in (("map.bin", b1), ("map4x.bin", b4), ("map16x.bin", b16)):
        data.tofile(os.path.join(args.out_dir, name))
    Image.fromarray(thumbnail(*thumb_in)).save(
        os.path.join(args.out_dir, "thumbnail.webp"), quality=45, method=4)
    with open(os.path.join(args.assets, "info.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    manifest["map"] = {"width": W, "height": H, "num_land_tiles": n1}
    manifest["map4x"] = {"width": W // 2, "height": H // 2, "num_land_tiles": n4}
    manifest["map16x"] = {"width": W // 4, "height": H // 4, "num_land_tiles": n16}
    with open(os.path.join(args.out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write("\n")

    # Country module.
    manifest_name = {v: k for k, v in old.MANIFEST_ISO.items()}
    entries = []
    for n, i in enumerate(used):
        p = props[i]
        mask = raster == n + 1
        ys_, xs_ = np.nonzero(mask)
        y0, y1, x0, x1 = ys_.min(), ys_.max() + 1, xs_.min(), xs_.max() + 1
        sl = mask[y0:y1, x0:x1]
        comp, k = label4(sl)
        biggest = np.argmax(np.bincount(comp.ravel())[1:]) + 1
        ax, ay = old.interior_tile(comp == biggest)
        ax, ay = ax + int(x0), ay + int(y0)
        mname = manifest_name.get(codes[i])
        name = mname or old.DISPLAY_NAME.get(p["NAME"], p["NAME"])
        entries.append(
            "  {\n"
            "    index: %d,\n    iso3: %s,\n    name: %s,\n    manifestName: %s,\n"
            "    sovereign: %s,\n    population: %d,\n    gdpMd: %d,\n"
            "    continent: %s,\n    subregion: %s,\n    tiles: %d,\n"
            "    spawn: [%d, %d],\n    anchor: [%d, %d],\n  },"
            % (n + 1, old.ts_str(codes[i]), old.ts_str(name),
               old.ts_str(mname) if mname else "null", old.ts_str(p["SOVEREIGNT"]),
               int(p["POP_EST"]), int(p["GDP_MD"]), old.ts_str(p["CONTINENT"]),
               old.ts_str(p["SUBREGION"]), int(tiles[n + 1]), ax, ay, ax, ay))
    rle = rle_encode(raster)
    chunks = [rle[k:k + 100] for k in range(0, len(rle), 100)]
    runs = int(np.count_nonzero(raster.ravel()[1:] != raster.ravel()[:-1]) + 1)
    out = HEADER + "export const REAL_WORLD_COUNTRIES: readonly RealWorldCountry[] = [\n"
    out += "\n".join(entries) + "\n];\n\n"
    out += RASTER_CODE.replace("@@RLE@@", ",\n  ".join(old.ts_str(c) for c in chunks))
    out = out.replace("@@ALPHABET@@", old.ALPHABET)
    with open(args.out_ts, "w", encoding="ascii") as f:
        f.write(out)
    print("RLE runs: %d, chars: %d, module bytes: %d" % (runs, len(rle), len(out)))

    if args.debug_dir:
        np.save(os.path.join(args.debug_dir, "raster.npy"), raster)
        np.save(os.path.join(args.debug_dir, "mag.npy"), fm)
        np.save(os.path.join(args.debug_dir, "land.npy"), fl)
        np.save(os.path.join(args.debug_dir, "ocean.npy"), fo)


if __name__ == "__main__":
    main()
