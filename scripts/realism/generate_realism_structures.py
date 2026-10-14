#!/usr/bin/env python3
"""Generate packages/engine-api/src/resources/RealismStructures.ts.

Places the real world's infrastructure on the 5000x2500 equirectangular
Realistic World map (x = (lon + 180) / 360 * 5000, y = (90 - lat) / 180 * 2500,
tile = y * 5000 + x): cities, ports, factories, missile silos, SAM launchers
and defense posts, each on land owned by its country.

Sources:
  * Natural Earth 1:10m populated places (simple) and ports, public domain.
  * research/real-world-realism/03-military-bases.md and 04-cities-and-industry.md.
  * The proportional rules below, which top countries up where the research
    documents have no rows.
  * A small hand-curated table of public nuclear sites (SILO_SITES).

Requires numpy. Usage:

  python3 scripts/realism/generate_realism_structures.py \
      NE_POPULATED_PLACES_GEOJSON NE_PORTS_GEOJSON [--out FILE]

The output is deterministic for fixed inputs.
"""
import argparse
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
W, H = 5000, 2500
KINDS = ["city", "port", "factory", "silo", "sam", "post"]
MIN_SPACING = {"city": 4, "port": 6, "factory": 4, "silo": 8, "sam": 2, "post": 2}
CAP = {"factory": 50, "silo": 20, "sam": 35, "post": 60}
SILO_CAP = {"United States": 30, "Russia": 30, "China": 30}
CITY_POP = 400000
PORT_MAX_SCALERANK = 7
PORT_SNAP = 6
PORT_RESCUE = 12
NUCLEAR = {
    "United States", "Russia", "China", "United Kingdom", "France", "India",
    "Pakistan", "North Korea", "Israel",
}
# Offsets (in tiles) of the extra silos of a multi-silo field, centre first.
FIELD_OFFSETS = [(0, 0), (8, 0), (-8, 0), (4, 7), (-4, 7), (4, -7), (-4, -7), (16, 0)]
# Silos per field, by lowercase name fragment (public knowledge of field sizes).
FIELD_SIZE = {
    "malmstrom": 5, "minot": 5, "warren": 5, "kozelsk": 3, "tatishchevo": 3,
    "dombarovsky": 3, "uzhur": 3, "yumen": 6, "hami": 6,
}
# Public knowledge of well-known nuclear and strategic missile sites, used where
# the research documents have no coordinates: (name, lat, lon, silos).
SILO_SITES = [
    ("Ordos silo field", 44.60, 110.50, 4),
    ("Yulin silo field", 38.30, 109.70, 4),
    ("Jiuquan", 40.96, 100.30, 1),
    ("Luoyang", 34.62, 112.45, 1),
    ("Teykovo", 56.85, 40.54, 2),
    ("Barnaul", 53.35, 83.70, 2),
    ("Irkutsk", 52.30, 104.30, 2),
    ("Vypolzovo", 57.78, 33.30, 1),
    ("Plesetsk", 62.93, 40.58, 1),
    ("Vandenberg", 34.74, -120.57, 1),
    ("Cheyenne Mountain", 38.74, -104.85, 1),
    ("Aldermaston", 51.35, -1.15, 1),
    ("Valduc", 47.57, 4.83, 1),
    ("Sdot Micha", 31.77, 34.88, 1),
    ("Soreq", 31.95, 34.70, 1),
    ("Agra", 27.16, 78.07, 1),
    ("Pokhran", 27.10, 71.75, 1),
    ("Chandipur", 21.45, 87.00, 1),
    ("Trombay", 19.00, 72.92, 1),
    ("Kahuta", 33.62, 73.38, 1),
    ("Khushab", 32.00, 72.20, 1),
    ("Ras Koh", 28.90, 64.50, 1),
    ("Pyongyang Sunan", 39.22, 125.67, 1),
    ("Kaechon", 39.70, 125.91, 1),
]
# Natural Earth adm0_a3 codes that differ from the roster iso3.
ISO_ALIAS = {"ALD": "ALA", "IS1": "ISR", "PSX": "PSE", "SAH": "ESH"}
NAME_FIX = {"Kiev": "Kyiv", "Washington, D.C.": "Washington DC"}
CAPITAL_RANK = {"Admin-0 capital": 1, "Admin-0 region capital": 2, "Admin-0 capital alt": 3}
CLOSED = re.compile(r"closed|retired|returned|withdrawn", re.I)
COORD = re.compile(r"(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)")


def js_round(v):
    return int(math.floor(v + 0.5))


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def to_xy(lat, lon):
    x = clamp(int((lon + 180.0) / 360.0 * W), 0, W - 1)
    y = clamp(int((90.0 - lat) / 180.0 * H), 0, H - 1)
    return x, y


def clean(text):
    text = re.sub(r"\*+|`.*?`|\[.*?\]", "", text)
    text = re.sub(r"\s*\(.*?\)", "", text)
    return re.sub(r"\s+", " ", text).strip(" |:-")


def load_countries():
    src = (ROOT / "packages/engine-api/src/resources/RealWorldCountries.ts").read_text()
    body = src[src.index("export const REAL_WORLD_COUNTRIES"):src.index("const ALPHABET")]
    pat = re.compile(
        r'index: (\d+),\s+iso3: "(\w+)",\s+name: ("[^"]*"),\s+manifestName: [^,]*,\s+'
        r'sovereign: ("[^"]*"),\s+population: (\d+),\s+gdpMd: (\d+),[^}]*?'
        r"tiles: (\d+),\s+spawn: [^\n]*\n\s+anchor: \[(\d+), (\d+)\]"
    )
    out = []
    for m in pat.finditer(body):
        out.append({
            "index": int(m[1]), "iso3": m[2], "name": json.loads(m[3]),
            "sovereign": json.loads(m[4]), "pop": int(m[5]), "gdp": int(m[6]),
            "tiles": int(m[7]), "anchor": (int(m[8]), int(m[9])),
        })
    alphabet = re.search(r'const ALPHABET =\s+"([^"]+)"', src)[1]
    rle = "".join(re.findall(r'^\s+"([^"]*)",?$', src[src.index("const RLE"):], re.M))
    digit = {c: i for i, c in enumerate(alphabet)}
    raster = np.zeros(W * H, dtype=np.uint16)
    pos = tile = 0

    def varint():
        nonlocal pos
        value = shift = 0
        while True:
            d = digit[rle[pos]]
            pos += 1
            value |= (d & 31) << shift
            if not d & 32:
                return value
            shift += 5

    while pos < len(rle):
        c = varint()
        end = tile + varint() + 1
        raster[tile:end] = c
        tile = end
    assert tile == W * H, "raster has the wrong size"
    return out, raster.reshape(H, W)


def parse_doc03():
    """Rows (name, lat, lon, type text) of the military bases research doc."""
    rows = []
    heading = section_type = ""
    in_appendix = False
    header = None
    for line in (ROOT / "research/real-world-realism/03-military-bases.md").read_text().splitlines():
        if line.startswith("## Appendix A"):
            in_appendix = True
        elif line.startswith("## Appendix B"):
            in_appendix = False
        if line.startswith("###") or line.startswith("## "):
            heading = clean(line.lstrip("# ").split("\u2014")[0])
            bold = re.findall(r"\*\*(.+?)\*\*", line)
            section_type = bold[-1] if bold and "\u2014" in line else ""
            header = None
            continue
        if line.startswith("- Type:") or line.startswith("- **Type"):
            section_type += " " + line
            continue
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                continue
            if header is None:
                header = [c.lower() for c in cells]
                continue
            if CLOSED.search(line):
                continue
            nums = [c for c in cells if re.fullmatch(r"-?\d{1,3}\.\d+", c)]
            if in_appendix and len(nums) == 2:
                rows.append((clean(cells[0]), float(nums[0]), float(nums[1]), clean(cells[0])))
                continue
            coord_idx = next((i for i, c in enumerate(cells) if COORD.search(c)), None)
            if coord_idx is None:
                continue
            m = COORD.search(cells[coord_idx])
            type_idx = next((i for i, h in enumerate(header) if h.startswith("type")), None)
            text = cells[type_idx] if type_idx is not None and type_idx < len(cells) else " ".join(cells[1:])
            rows.append((clean(cells[0]), float(m[1]), float(m[2]), text))
            continue
        header = None
        if CLOSED.search(line) and ("status" in line.lower() or "closed" in line.lower()):
            pass
        for m in re.finditer(r"\*\*([^*:]+?):\s*(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)\*\*", line):
            label = clean(m[1])
            name = heading if label.lower() == "lat/long" else label
            rows.append((name, float(m[2]), float(m[3]), section_type + " " + heading))
    return rows


def parse_doc04():
    """Industrial hub rows (name, lat, lon) of section 3 of the cities doc."""
    rows = []
    active = False
    for line in (ROOT / "research/real-world-realism/04-cities-and-industry.md").read_text().splitlines():
        if line.startswith("## 3."):
            active = True
        elif line.startswith("## 4."):
            break
        if not active or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        m = COORD.search(cells[-1])
        if m:
            rows.append((clean(cells[0]), float(m[1]), float(m[2])))
    return rows


def classify(name, text):
    t = (text or name).lower()
    kinds = []
    if re.search(r"silo|icbm|enrichment|plutonium|nuclear (test|site|program)", t):
        kinds.append("silo")
    air = re.search(r"\bair\b|air force|airbase|airfield|\bafb\b|radar|early warning|s-400|\bsam\b", t)
    ground = re.search(r"port|navy|naval|army|fleet|shipyard|submarine|ssbn|homeport|base", t)
    if air:
        kinds.append("sam")
    if (ground and not air) or (ground and re.search(r"port|navy|naval|army", t)) or not kinds:
        kinds.append("post")
    return kinds


class Spacing:
    def __init__(self):
        self.cells = defaultdict(list)

    def add(self, x, y):
        self.cells[(x >> 4, y >> 4)].append((x, y))

    def ok(self, x, y, d):
        r = (d >> 4) + 1
        for cx in range((x >> 4) - r, (x >> 4) + r + 1):
            for cy in range((y >> 4) - r, (y >> 4) + r + 1):
                for px, py in self.cells.get((cx, cy), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < d * d:
                        return False
        return True


class World:
    def __init__(self, countries, own, bits):
        self.countries = countries
        self.own = own
        land = (bits >> 7) & 1
        ocean = ((bits >> 5) & 1).astype(bool)
        assert not ((own > 0) & (land == 0)).any(), "owned tile that is not land"
        near_ocean = np.zeros_like(ocean)
        near_ocean[1:, :] |= ocean[:-1, :]
        near_ocean[:-1, :] |= ocean[1:, :]
        near_ocean[:, 1:] |= ocean[:, :-1]
        near_ocean[:, :-1] |= ocean[:, 1:]
        self.coast = (own > 0) & near_ocean
        self.occ = np.zeros((H, W), dtype=bool)
        self.spacing = {k: Spacing() for k in KINDS}
        self.placed = []
        self.by = defaultdict(lambda: defaultdict(list))

    def add(self, kind, c, x, y, name, capital=False, pop=0):
        assert not self.occ[y, x] and self.own[y, x] == c["index"]
        self.occ[y, x] = True
        self.spacing[kind].add(x, y)
        rec = {"kind": kind, "c": c["index"], "name": name, "x": x, "y": y, "capital": capital, "pop": pop}
        self.placed.append(rec)
        self.by[c["index"]][kind].append(rec)
        return rec

    def count(self, c, kind):
        return len(self.by[c["index"]][kind])

    def crowded(self, x, y):
        return self.occ[max(0, y - 1):y + 2, max(0, x - 1):x + 2].any()

    def nearest(self, x, y, radius, mask_fn):
        x0, x1 = max(0, x - radius), min(W, x + radius + 1)
        y0, y1 = max(0, y - radius), min(H, y + radius + 1)
        ys, xs = np.nonzero(mask_fn(y0, y1, x0, x1))
        if len(xs) == 0:
            return None
        xs = xs + x0
        ys = ys + y0
        d = (xs - x) ** 2 + (ys - y) ** 2
        keep = d <= radius * radius
        if not keep.any():
            return None
        xs, ys, d = xs[keep], ys[keep], d[keep]
        i = np.lexsort((xs, ys, d))[0]
        return int(xs[i]), int(ys[i])

    def owner_near(self, x, y, radius):
        hit = self.nearest(x, y, radius, lambda y0, y1, x0, x1: self.own[y0:y1, x0:x1] > 0)
        return None if hit is None else self.own[hit[1], hit[0]]

    def place_near(self, kind, c, cx, cy, rmin, rmax, angle0=0.0):
        """Free tile of country c at distance rmin..rmax from (cx, cy), nearest first."""
        ci = c["index"]
        spacing = MIN_SPACING[kind]
        for lo, hi, strict in ((rmin, rmax, True), (0, rmax + 4, True), (0, rmax + 10, False)):
            cands = []
            for dy in range(-hi, hi + 1):
                y = cy + dy
                if y < 0 or y >= H:
                    continue
                for dx in range(-hi, hi + 1):
                    x = cx + dx
                    d = math.hypot(dx, dy)
                    if x < 0 or x >= W or d < lo or d > hi:
                        continue
                    if self.own[y, x] != ci or self.occ[y, x]:
                        continue
                    if not self.spacing[kind].ok(x, y, spacing):
                        continue
                    if strict and self.crowded(x, y):
                        continue
                    ang = (math.atan2(dy, dx) - angle0) % (2 * math.pi)
                    cands.append((round(d), ang, y, x))
            if cands:
                cands.sort()
                return cands[0][3], cands[0][2]
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("places")
    ap.add_argument("ports")
    ap.add_argument("--out", default=str(ROOT / "packages/engine-api/src/resources/RealismStructures.ts"))
    args = ap.parse_args()

    countries, own = load_countries()
    bits = np.fromfile(ROOT / "resources/maps/realisticworld/map.bin", dtype=np.uint8).reshape(H, W)
    by_index = {c["index"]: c for c in countries}
    by_iso = {c["iso3"]: c for c in countries}
    w = World(countries, own, bits)
    dropped = defaultdict(list)

    def load_geojson(path):
        data = json.load(open(path))
        assert data.get("type") == "FeatureCollection"
        for f in data["features"]:
            assert f["geometry"]["type"] == "Point"
        return data["features"]

    places = load_geojson(args.places)
    ports = load_geojson(args.ports)

    # 1. Cities
    cities = []
    for f in places:
        p = f["properties"]
        lon, lat = f["geometry"]["coordinates"]
        cities.append({
            "name": NAME_FIX.get(p["nameascii"], p["nameascii"] or p["name"]), "pop": p["pop_max"] or 0, "lat": lat, "lon": lon,
            "cap": 0 if p["adm0cap"] == 1 else CAPITAL_RANK.get(p["featurecla"], 9), "iso": ISO_ALIAS.get(p["adm0_a3"], p["adm0_a3"]), "id": p["ne_id"],
        })
    cities.sort(key=lambda r: (-r["pop"], r["name"], r["id"]))
    fallback_capital = []
    capital_ids = set()
    for c in countries:
        cand = sorted(
            (r for r in cities if r["cap"] < 9 and r["iso"] == c["iso3"]),
            key=lambda r: (r["cap"], -r["pop"], r["name"]),
        )
        pos = None
        name = None
        if cand:
            r = cand[0]
            x, y = to_xy(r["lat"], r["lon"])
            for radius in (15, 80):
                pos = w.nearest(x, y, radius, lambda y0, y1, x0, x1, ci=c["index"]: own[y0:y1, x0:x1] == ci)
                if pos is not None:
                    break
            name = r["name"]
            capital_ids.add(r["id"])
        if pos is None:
            ax, ay = c["anchor"]
            pos = (ax, ay)
            name = c["name"] if name is None else name
            fallback_capital.append(c["name"])
        w.add("city", c, pos[0], pos[1], name, capital=True, pop=cand[0]["pop"] if cand else 0)
    for r in cities:
        if r["pop"] < CITY_POP or r["id"] in capital_ids:
            continue
        x, y = to_xy(r["lat"], r["lon"])
        if own[y, x] == 0:
            hit = w.nearest(x, y, 8, lambda y0, y1, x0, x1: own[y0:y1, x0:x1] > 0)
            if hit is None:
                dropped["city: no land within 8 tiles"].append(r["name"])
                continue
            x, y = hit
        c = by_index[int(own[y, x])]
        if w.occ[y, x] or not w.spacing["city"].ok(x, y, MIN_SPACING["city"]):
            dropped["city: within 4 tiles of a larger city or capital"].append(r["name"])
            continue
        w.add("city", c, x, y, r["name"], pop=r["pop"])

    # 2. Ports
    plist = sorted(
        (f["properties"] for f in ports if f["properties"]["scalerank"] <= PORT_MAX_SCALERANK),
        key=lambda p: (p["scalerank"], p["name"]),
    )
    coords = {id(p): f["geometry"]["coordinates"] for f in ports for p in [f["properties"]]}
    rescued = []
    for p in plist:
        lon, lat = coords[id(p)]
        x, y = to_xy(lat, lon)
        hit = w.nearest(x, y, PORT_SNAP, lambda y0, y1, x0, x1: w.coast[y0:y1, x0:x1] & ~w.occ[y0:y1, x0:x1])
        rescue = hit is None
        if rescue:
            owner = w.owner_near(x, y, PORT_RESCUE)
            if owner is not None:
                hit = w.nearest(
                    x, y, PORT_RESCUE,
                    lambda y0, y1, x0, x1, ci=owner: w.coast[y0:y1, x0:x1] & ~w.occ[y0:y1, x0:x1] & (own[y0:y1, x0:x1] == ci),
                )
            if hit is None:
                dropped["port: no free coast within 12 tiles"].append(p["name"])
                continue
        if not w.spacing["port"].ok(hit[0], hit[1], MIN_SPACING["port"]):
            dropped["port: within 6 tiles of another port"].append(p["name"])
            continue
        w.add("port", by_index[int(own[hit[1], hit[0]])], hit[0], hit[1], p["name"])
        if rescue:
            rescued.append(p["name"])

    # Doc rows
    def place_row(kind, lat, lon, name):
        x, y = to_xy(lat, lon)
        ci = int(own[y, x])
        if ci == 0:
            ci = w.owner_near(x, y, 6)
            if ci is None:
                dropped[f"{kind}: row in water"].append(name)
                return
        c = by_index[int(ci)]
        if kind == "silo" and c["name"] not in NUCLEAR:
            kind = "post"
        if kind != "silo" and w.count(c, kind) >= CAP.get(kind, 10**9):
            dropped[f"{kind}: country cap"].append(f"{name} ({c['name']})")
            return
        hit = w.place_near(kind, c, x, y, 0, 3, 0.0)
        if hit is None:
            dropped[f"{kind}: no free tile"].append(f"{name} ({c['name']})")
            return
        w.add(kind, c, hit[0], hit[1], name)

    rows03 = parse_doc03()
    seen = set()
    sorted_rows = []
    for name, lat, lon, text in rows03:
        key = (round(lat, 1), round(lon, 1))
        if key in seen:
            continue
        seen.add(key)
        sorted_rows.append((name, lat, lon, text))
    row_kinds = [(r, classify(r[0], r[3])) for r in sorted_rows]

    # 4. Silos: doc rows classified as silo, then the curated table
    def place_field(name, lat, lon, size):
        x0, y0 = to_xy(lat, lon)
        ci = int(own[y0, x0]) or w.owner_near(x0, y0, 6)
        if not ci or by_index[int(ci)]["name"] not in NUCLEAR:
            return False
        c = by_index[int(ci)]
        n = 0
        for dx, dy in FIELD_OFFSETS:
            if n == size or w.count(c, "silo") >= SILO_CAP.get(c["name"], CAP["silo"]):
                break
            x, y = x0 + dx, y0 + dy
            if not (0 <= x < W and 0 <= y < H) or own[y, x] != c["index"] or w.occ[y, x]:
                continue
            if not w.spacing["silo"].ok(x, y, MIN_SPACING["silo"]):
                continue
            w.add("silo", c, x, y, name if n == 0 else f"{name} {n + 1}")
            n += 1
        if n == 0:
            dropped["silo: no free tile or country cap"].append(name)
        return True

    for (name, lat, lon, text), kinds in row_kinds:
        if "silo" in kinds:
            size = next((s for k, s in FIELD_SIZE.items() if k in name.lower()), 1)
            if not place_field(name, lat, lon, size):
                dropped["silo: country is not nuclear"].append(name)
                place_row("post", lat, lon, name)
    for name, lat, lon, size in SILO_SITES:
        place_field(name, lat, lon, size)

    # 3a. Factories from doc rows
    for name, lat, lon in parse_doc04():
        place_row("factory", lat, lon, name)
    doc_factory_countries = {r["c"] for r in w.placed if r["kind"] == "factory"}

    # 5, 6. SAM and post doc rows
    for (name, lat, lon, text), kinds in row_kinds:
        for kind in kinds:
            if kind in ("sam", "post"):
                place_row(kind, lat, lon, name)

    # Proportional rules
    def city_spots(c):
        cs = sorted(w.by[c["index"]]["city"], key=lambda r: (not r["capital"], -r["pop"], r["name"]))
        return cs

    ANGLE = {"factory": 4.19, "sam": 0.0, "post": 2.09}
    for c in countries:
        cs = city_spots(c)
        gdp_bn = c["gdp"] / 1000.0
        n = clamp(js_round(math.sqrt(gdp_bn) / 5), 0, 16)
        if c["index"] not in doc_factory_countries and cs:
            for k in range(n):
                if w.count(c, "factory") >= CAP["factory"]:
                    break
                city = cs[k % len(cs)]
                hit = w.place_near("factory", c, city["x"], city["y"], 2, 5, ANGLE["factory"] + k // len(cs))
                if hit:
                    w.add("factory", c, hit[0], hit[1], f"{city['name']} industrial area")
                else:
                    dropped["factory: no room near city"].append(f"{city['name']} ({c['name']})")
        n = clamp(js_round(math.sqrt(gdp_bn) / 6), 0, 12)
        k = 0
        while cs and w.count(c, "sam") < min(n, CAP["sam"]) and k < 3 * n + 3:
            city = cs[k % len(cs)]
            hit = w.place_near("sam", c, city["x"], city["y"], 2, 4, ANGLE["sam"] + k // len(cs))
            if hit:
                w.add("sam", c, hit[0], hit[1], f"{city['name']} air defense")
            k += 1
        n = clamp(js_round(math.sqrt(c["pop"] / 1e6) / 1.3), 1, 25)
        port_list = sorted(w.by[c["index"]]["port"], key=lambda r: r["name"])
        city_i = port_i = k = 0
        while w.count(c, "post") < min(n, CAP["post"]) and k < 4 * n + 4:
            want_port = port_list and k % 2 == 1
            k += 1
            if want_port:
                src = port_list[port_i % len(port_list)]
                label = f"{src['name']} naval post"
                port_i += 1
            elif cs:
                src = cs[city_i % len(cs)]
                label = f"{src['name']} garrison"
                city_i += 1
            else:
                break
            hit = w.place_near("post", c, src["x"], src["y"], 2, 4, ANGLE["post"] + k // 7)
            if hit:
                w.add("post", c, hit[0], hit[1], label)

    # Emit
    order = {k: i for i, k in enumerate(KINDS)}
    placed = sorted(w.placed, key=lambda r: (r["c"], order[r["kind"]], r["name"], r["x"], r["y"]))
    lines = []
    for r in placed:
        name = r["name"].replace("|", " ").replace("\\", " ")
        lines.append(f"{r['c']}|{order[r['kind']]}|{r['x']}|{r['y']}|{1 if r['capital'] else 0}|{name}")
    body = "\n".join(f"  {json.dumps(l, ensure_ascii=True)}," for l in lines)
    header = f"""// Generated by scripts/realism/generate_realism_structures.py - do not edit.
// Sources: Natural Earth 1:10m populated places and ports (public domain),
// research/real-world-realism/03-military-bases.md and 04-cities-and-industry.md,
// and the proportional rules documented in scripts/realism/README.md.
// Regenerate: python3 scripts/realism/generate_realism_structures.py \\
//   <ne_10m_populated_places_simple.geojson> <ne_10m_ports.geojson>
import {{ REAL_WORLD_COUNTRIES }} from "./RealWorldCountries";

export type RealismStructureKind =
  | "city"
  | "port"
  | "factory"
  | "silo"
  | "sam"
  | "post";

export interface RealismStructure {{
  readonly kind: RealismStructureKind;
  /** Country name as in REAL_WORLD_COUNTRIES. */
  readonly country: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly capital?: boolean;
}}

const KINDS: readonly RealismStructureKind[] = [
  "city",
  "port",
  "factory",
  "silo",
  "sam",
  "post",
];

// country index | kind | x | y | capital | name
const DATA: readonly string[] = [
{body}
];

function decode(): RealismStructure[] {{
  const names = new Map(REAL_WORLD_COUNTRIES.map((c) => [c.index, c.name]));
  return DATA.map((line) => {{
    const [country, kind, x, y, capital, ...name] = line.split("|");
    const base = {{
      kind: KINDS[Number(kind)],
      country: names.get(Number(country)) as string,
      name: name.join("|"),
      x: Number(x),
      y: Number(y),
    }};
    return capital === "1" ? {{ ...base, capital: true }} : base;
  }});
}}

/** Ordered by country index, then kind, then name. */
export const REALISM_STRUCTURES: readonly RealismStructure[] = decode();

let byCountry: Map<string, RealismStructure[]> | undefined;

function index(): Map<string, RealismStructure[]> {{
  if (byCountry === undefined) {{
    byCountry = new Map();
    for (const s of REALISM_STRUCTURES) {{
      const list = byCountry.get(s.country);
      if (list === undefined) byCountry.set(s.country, [s]);
      else list.push(s);
    }}
  }}
  return byCountry;
}}

const NONE: readonly RealismStructure[] = [];

export function realismStructuresFor(country: string): readonly RealismStructure[] {{
  return index().get(country) ?? NONE;
}}

export function realismCapitalFor(country: string): RealismStructure | undefined {{
  return realismStructuresFor(country).find((s) => s.capital === true);
}}

export function realismCityCount(country: string): number {{
  return realismStructuresFor(country).filter((s) => s.kind === "city").length;
}}
"""
    Path(args.out).write_text(header)

    # Report
    tot = defaultdict(int)
    for r in w.placed:
        tot[r["kind"]] += 1
    print("totals:", dict(tot), "all:", len(w.placed))
    print("capitals from anchor fallback:", len(fallback_capital), fallback_capital)
    for k, v in sorted(dropped.items()):
        print(f"dropped {k}: {len(v)}", v[:12])
    sample = ["Germany", "France", "Poland", "United States", "China", "Russia", "India", "Brazil",
              "Luxembourg", "United Kingdom", "Japan", "Egypt", "Ukraine", "Sweden", "Greece"]
    for s in sample:
        c = next((c for c in countries if c["name"] == s), None)
        if c:
            print(s, {k: w.count(c, k) for k in KINDS})
    unmatched = sorted({r["iso"] for r in cities if r["cap"] == 0} - set(by_iso))
    print("capital iso codes without a roster country:", unmatched)
    print("ports rescued:", len(rescued), rescued)
    print("doc03 rows:", len(sorted_rows), "doc04 rows:", len(parse_doc04()))


if __name__ == "__main__":
    sys.exit(main())
