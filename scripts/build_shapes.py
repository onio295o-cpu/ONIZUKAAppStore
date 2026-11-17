#!/usr/bin/env python3
"""Add road-following geometry between consecutive bus stops.

GTFS-JP from 名古屋市交通局 has no shapes.txt, so the app would otherwise draw
straight lines from stop to stop. This asks an OSRM server for the driving
route through each stop pattern and keeps one polyline per stop-to-stop leg.

Usage: build_shapes.py DATA_DIR        (reads index.json + patterns.json)

Output: DATA_DIR/legs.json  {"lat,lon|lat,lon": "encoded polyline" or ""}
  Existing entries are reused, so only new legs are fetched on later runs.
  "" means routing failed or looked wrong; the app then draws a straight line.
"""
import json
import math
import os
import sys
import time
import urllib.request

OSRM = os.environ.get("OSRM_URL", "https://router.project-osrm.org")
CHUNK = 40          # waypoints per request (consecutive chunks overlap by one stop)
PAUSE = 1.1         # seconds between requests (public demo server: ~1 req/s)


def dist(a, b):
    """metres between (lat, lon) pairs"""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def decode(poly, precision=5):
    coords, lat, lon, i = [], 0, 0, 0
    factor = 10 ** precision
    while i < len(poly):
        for is_lat in (True, False):
            shift = result = 0
            while True:
                b = ord(poly[i]) - 63
                i += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(result >> 1) if result & 1 else result >> 1
            if is_lat:
                lat += d
            else:
                lon += d
        coords.append((lat / factor, lon / factor))
    return coords


def encode(coords):
    out, plat, plon = [], 0, 0
    for lat, lon in coords:
        ilat, ilon = round(lat * 1e5), round(lon * 1e5)
        for d in (ilat - plat, ilon - plon):
            v = ~(d << 1) if d < 0 else d << 1
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1F)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        plat, plon = ilat, ilon
    return "".join(out)


def simplify(coords, tol=4.0):
    """Douglas–Peucker in metres, keeps the ends"""
    if len(coords) < 3:
        return coords
    keep = [False] * len(coords)
    keep[0] = keep[-1] = True
    stack = [(0, len(coords) - 1)]
    while stack:
        a, b = stack.pop()
        best, idx = 0.0, None
        for k in range(a + 1, b):
            d = seg_dist(coords[k], coords[a], coords[b])
            if d > best:
                best, idx = d, k
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [c for c, k in zip(coords, keep) if k]


def seg_dist(p, a, b):
    # flat-earth distance from p to segment ab, fine at these scales
    ky, kx = 111320.0, 111320.0 * math.cos(math.radians(a[0]))
    px, py = (p[1] - a[1]) * kx, (p[0] - a[0]) * ky
    bx, by = (b[1] - a[1]) * kx, (b[0] - a[0]) * ky
    L = bx * bx + by * by
    t = 0 if L == 0 else max(0, min(1, (px * bx + py * by) / L))
    return math.hypot(px - t * bx, py - t * by)


def leg_key(a, b):
    return f"{a[0]},{a[1]}|{b[0]},{b[1]}"


def route(points):
    """per-leg coordinate lists for a route through points, or None"""
    coords = ";".join(f"{lon},{lat}" for lat, lon in points)
    url = f"{OSRM}/route/v1/driving/{coords}?overview=false&steps=true&geometries=polyline"
    req = urllib.request.Request(url, headers={"User-Agent": "ONIZUKAAppStore-bus-shapes"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.loads(r.read())
            if data.get("code") != "Ok":
                print("  osrm:", data.get("code"), data.get("message", ""))
                return None
            legs = []
            for leg in data["routes"][0]["legs"]:
                pts = []
                for step in leg["steps"]:
                    for c in decode(step["geometry"]):
                        if not pts or pts[-1] != c:
                            pts.append(c)
                legs.append(pts)
            return legs
        except Exception as e:  # noqa: BLE001 - retry, then give up on this chunk
            print(f"  request failed ({e}), retry {attempt + 1}")
            time.sleep(5 * (attempt + 1))
    return None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    data_dir = sys.argv[1]
    index = json.load(open(os.path.join(data_dir, "index.json"), encoding="utf-8"))
    patterns = json.load(open(os.path.join(data_dir, "patterns.json"), encoding="utf-8"))
    poles = [(p[1], p[2]) for p in index["poles"]]
    path = os.path.join(data_dir, "legs.json")
    legs = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}

    wanted = set()
    todo = []
    for pat in patterns:
        pts = [poles[i] for i in pat["s"]]
        keys = [leg_key(a, b) for a, b in zip(pts, pts[1:])]
        wanted.update(keys)
        if any(k not in legs for k in keys):
            todo.append(pts)
    print(f"patterns: {len(patterns)}, needing routing: {len(todo)}, known legs: {len(legs)}")

    fetched = failed = 0
    for n, pts in enumerate(todo, 1):
        for start in range(0, len(pts) - 1, CHUNK - 1):
            chunk = pts[start:start + CHUNK]
            keys = [leg_key(a, b) for a, b in zip(chunk, chunk[1:])]
            if all(k in legs for k in keys):
                continue
            result = route(chunk)
            time.sleep(PAUSE)
            if result is None:
                continue  # server trouble: leave these legs unknown so a later run retries
            for i, k in enumerate(keys):
                if k in legs:
                    continue
                a, b = chunk[i], chunk[i + 1]
                geom = result[i] if i < len(result) else None
                # reject detours (e.g. U-turns around a divided road) and bad snaps
                if geom and len(geom) >= 2:
                    length = sum(dist(p, q) for p, q in zip(geom, geom[1:]))
                    if length <= 2.5 * dist(a, b) + 250 and dist(geom[0], a) < 80 and dist(geom[-1], b) < 80:
                        legs[k] = encode(simplify([a] + geom + [b]))
                        fetched += 1
                        continue
                legs[k] = ""
                failed += 1
        if n % 25 == 0:
            print(f"  {n}/{len(todo)} patterns, {fetched} legs routed, {failed} straight")
            json.dump(legs, open(path, "w", encoding="utf-8"), ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"))

    legs = {k: v for k, v in legs.items() if k in wanted}  # drop legs no longer used
    with open(path, "w", encoding="utf-8") as f:
        json.dump(legs, f, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    print(f"done: {len(legs)} legs ({sum(1 for v in legs.values() if v)} road-following), "
          f"routed now {fetched}, straight now {failed}, {os.path.getsize(path)} bytes")


if __name__ == "__main__":
    main()
