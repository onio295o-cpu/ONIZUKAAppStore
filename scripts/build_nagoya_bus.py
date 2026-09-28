#!/usr/bin/env python3
"""Build the bus app's data files from a GTFS(-JP) feed (名古屋市交通局 市バス).

Usage:
  build_nagoya_bus.py FEED.zip OUT_DIR          build from a local zip
  build_nagoya_bus.py --download OUT_DIR        find + download the feed, then build

Output (OUT_DIR):
  index.json      feed info, service calendars, stop names, poles
  patterns.json   distinct stop sequences (route + headsign + poles)
  stops/N.json    departures at stop name N: [[pattern, position, {service_id: [minutes]}], ...]
"""
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile
from collections import defaultdict


# Known locations of the feed; the first that downloads wins. GTFS_URL overrides.
FEED_API = "https://api.gtfs-data.jp/v2/feeds"
FALLBACK_URLS = [
    "https://api.gtfs-data.jp/v2/organizations/nagoyacity/feeds/nagoyacitybus/files/feed.zip?rid=current",
]


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ONIZUKAAppStore-bus-builder"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def discover_feed_urls():
    """Look the feed up in the GTFSデータリポジトリ catalogue."""
    urls = []
    try:
        catalogue = json.loads(http_get(FEED_API))
    except Exception as e:  # noqa: BLE001 - log and fall back
        print(f"catalogue fetch failed: {e}")
        return urls

    def walk(node):
        if isinstance(node, dict):
            text = json.dumps(node, ensure_ascii=False)
            if "名古屋市交通局" in text and "organization_id" in node and "feed_id" in node:
                print("catalogue match:", {k: node.get(k) for k in
                      ("organization_id", "organization_name", "feed_id", "feed_name", "file_url")})
                if "バス" in str(node.get("feed_name", "")) or "bus" in str(node.get("feed_id", "")):
                    if node.get("file_url"):
                        urls.append(node["file_url"])
                    urls.append("https://api.gtfs-data.jp/v2/organizations/"
                                f"{node['organization_id']}/feeds/{node['feed_id']}/files/feed.zip?rid=current")
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(catalogue)
    if not urls:
        # log anything Nagoya-related so the right ids can be found
        seen = set()

        def dump(node):
            if isinstance(node, dict):
                text = json.dumps(node, ensure_ascii=False)
                if "名古屋" in text and len(text) < 3000 and text not in seen:
                    seen.add(text)
                    print("catalogue entry:", text[:600])
                for v in node.values():
                    dump(v)
            elif isinstance(node, list):
                for v in node:
                    dump(v)
        dump(catalogue)
        print("catalogue top-level:", type(catalogue).__name__, str(catalogue)[:300])
    urls += scrape_zip_links()
    return urls


# 名古屋市交通局 open data pages that link the GTFS zip
OPEN_DATA_PAGES = [
    "https://www.kotsu.city.nagoya.jp/jp/pc/ABOUT/TRP0001435.htm",
    "https://www.kotsu.city.nagoya.jp/jp/pc/ABOUT/TRP0001281.htm",
    "https://www.kotsu.city.nagoya.jp/jp/pc/opendata/",
    "https://www.city.nagoya.jp/kotsu/page/0000158235.html",
]


def scrape_zip_links():
    import re
    from urllib.parse import urljoin
    found = []
    for page in OPEN_DATA_PAGES:
        try:
            html = http_get(page).decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            print(f"page {page}: {e}")
            continue
        links = re.findall(r'href="([^"]+\.zip[^"]*)"', html, re.I)
        print(f"page {page}: {len(links)} zip links", links[:10])
        title = re.search(r"<title>(.*?)</title>", html, re.S)
        print("  title:", title.group(1).strip() if title else "")
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
            text = re.sub(r"<[^>]+>", "", m.group(2)).strip()
            if re.search(r"gtfs|GTFS|オープンデータ|opendata|odpt|ダウンロード", m.group(1) + text):
                print("  link:", text[:60], "->", m.group(1))
        found += [urljoin(page, l) for l in links if "gtfs" in l.lower() or "bus" in l.lower()]
    return found


def download_feed():
    candidates = ([os.environ["GTFS_URL"]] if os.environ.get("GTFS_URL") else []) \
        + discover_feed_urls() + FALLBACK_URLS
    for url in candidates:
        try:
            print("trying", url)
            data = http_get(url)
            zipfile.ZipFile(io.BytesIO(data)).namelist()  # must be a valid zip
            print(f"downloaded {len(data)} bytes from {url}")
            return data, url
        except Exception as e:  # noqa: BLE001 - try the next candidate
            print(f"  failed: {e}")
    sys.exit("could not download the GTFS feed from any known location")


def read_table(zf, name):
    for n in zf.namelist():
        if n.split("/")[-1] == name:
            with zf.open(n) as f:
                return list(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")))
    return []


def to_minutes(hms):
    h, m = hms.strip().split(":")[:2]
    return int(h) * 60 + int(m)


def export_calendar(zf):
    """Service calendars as the app evaluates them per date (calendar + calendar_dates)."""
    calendar = [[r["service_id"],
                 "".join(r[k] for k in ("monday", "tuesday", "wednesday", "thursday",
                                        "friday", "saturday", "sunday")),
                 r["start_date"], r["end_date"]]
                for r in read_table(zf, "calendar.txt")]
    exceptions = defaultdict(lambda: [[], []])  # date -> [added, removed]
    for r in read_table(zf, "calendar_dates.txt"):
        exceptions[r["date"]][0 if r["exception_type"] == "1" else 1].append(r["service_id"])
    return calendar, dict(sorted(exceptions.items()))


def build(zip_bytes, out_dir, source_url=""):
    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))

    stops = {r["stop_id"]: r for r in read_table(zf, "stops.txt")}
    routes = {r["route_id"]: r for r in read_table(zf, "routes.txt")}
    trips = {r["trip_id"]: r for r in read_table(zf, "trips.txt")}
    feed_info = (read_table(zf, "feed_info.txt") or [{}])[0]

    # hiragana readings (GTFS-JP translations.txt, both the old and new layouts)
    kana = {}
    for r in read_table(zf, "translations.txt"):
        if r.get("language") != "ja-Hrkt":
            continue
        if "trans_id" in r:
            kana[r["trans_id"]] = r["translation"]
        elif r.get("table_name") == "stops" and r.get("field_name") == "stop_name":
            key = r.get("field_value") or stops.get(r.get("record_id"), {}).get("stop_name")
            if key:
                kana[key] = r["translation"]

    calendar, exceptions = export_calendar(zf)

    # group stop_times by trip
    by_trip = defaultdict(list)
    for r in read_table(zf, "stop_times.txt"):
        by_trip[r["trip_id"]].append(r)

    names, name_idx, poles, pole_idx = [], {}, [], {}

    def pole(stop_id):
        if stop_id not in pole_idx:
            s = stops[stop_id]
            name = s["stop_name"].strip()
            if name not in name_idx:
                name_idx[name] = len(names)
                names.append({"n": name, "k": kana.get(name, ""), "lat": [], "lon": []})
            n = name_idx[name]
            lat, lon = round(float(s["stop_lat"]), 6), round(float(s["stop_lon"]), 6)
            names[n]["lat"].append(lat)
            names[n]["lon"].append(lon)
            pole_idx[stop_id] = len(poles)
            poles.append([n, lat, lon])
        return pole_idx[stop_id]

    patterns, pattern_idx = [], {}
    # departures[name][(pattern, position)][service_id] -> minutes
    departures = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for trip_id, rows in by_trip.items():
        trip = trips.get(trip_id)
        if not trip:
            continue
        rows.sort(key=lambda r: int(r["stop_sequence"]))
        route = routes.get(trip["route_id"], {})
        label = (route.get("route_short_name") or route.get("route_long_name") or "").strip()
        headsign = (trip.get("trip_headsign") or rows[0].get("stop_headsign") or "").strip()
        if not headsign:
            headsign = stops[rows[-1]["stop_id"]]["stop_name"].strip() + "ゆき"
        seq = tuple(pole(r["stop_id"]) for r in rows)
        key = (label, headsign, seq)
        if key not in pattern_idx:
            pattern_idx[key] = len(patterns)
            patterns.append({"r": label, "h": headsign, "s": list(seq)})
        p = pattern_idx[key]
        for pos, r in enumerate(rows[:-1]):  # nobody boards at the last stop
            t = r.get("departure_time") or r.get("arrival_time")
            if not t or r.get("pickup_type") == "1":
                continue
            departures[poles[seq[pos]][0]][(p, pos)][trip["service_id"]].append(to_minutes(t))

    for n in names:
        n["lat"] = round(sum(n["lat"]) / len(n["lat"]), 6)
        n["lon"] = round(sum(n["lon"]) / len(n["lon"]), 6)

    os.makedirs(os.path.join(out_dir, "stops"), exist_ok=True)
    for f in os.listdir(os.path.join(out_dir, "stops")):
        os.remove(os.path.join(out_dir, "stops", f))

    def dump(path, obj):
        with open(os.path.join(out_dir, path), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))

    for n, entries in departures.items():
        dump(f"stops/{n}.json", [
            [p, pos, {sid: sorted(ts) for sid, ts in by_service.items()}]
            for (p, pos), by_service in sorted(entries.items())
        ])
    dump("patterns.json", patterns)
    dump("index.json", {
        "generated_from": " ".join(x for x in (feed_info.get("feed_publisher_name", "名古屋市交通局"),
                                                "GTFS-JP", feed_info.get("feed_version", "")) if x),
        "source_url": source_url,
        "valid": [feed_info.get("feed_start_date", ""), feed_info.get("feed_end_date", "")],
        "calendar": calendar,
        "exceptions": exceptions,
        "names": [[n["n"], n["k"], n["lat"], n["lon"]] for n in names],
        "poles": poles,
    })
    print(f"stop names: {len(names)}, poles: {len(poles)}, patterns: {len(patterns)}, "
          f"stop files: {len(departures)}")


def main():
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--download":
        data, url = download_feed()
        build(data, args[1], url)
    elif len(args) == 2:
        with open(args[0], "rb") as f:
            build(f.read(), args[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
