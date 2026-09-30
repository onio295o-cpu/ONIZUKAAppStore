#!/usr/bin/env python3
"""Build the bus app's data files from GTFS(-JP) feeds (名古屋市営バス and neighbours).

Usage:
  build_nagoya_bus.py --feeds gtfs/feeds.json OUT_DIR   every feed in gtfs/feeds/ (市バス first)
  build_nagoya_bus.py FEED.zip OUT_DIR                  build from one local zip
  build_nagoya_bus.py --download OUT_DIR                find + download the 市バス feed, then build

Output (OUT_DIR):
  index.json      feed info, service calendars, stop names, poles
  patterns.json   distinct stop sequences (route + headsign + poles)
  stops/N.json    where you can board at stop name N: [[pattern, position], ...]
  trips/P.json    every trip of pattern P: [[service, first minute, gap, gap, ...], ...]
                  (service indexes index.json "services"; gaps are minutes between stops)
"""
import csv
import io
import json
import math
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


def dist_m(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


SAME_STOP_M = 1000  # same-named stops closer than this are one stop (e.g. 名古屋駅 of two operators)


def build(feeds, out_dir, source_url=""):
    """feeds: [{"id", "label", "area", "data": zip bytes}, …]; the first is the main
    feed (名古屋市営バス): its service ids and stop names are kept as they are."""
    parsed = []
    kana = {}
    calendar, exceptions = [], defaultdict(lambda: [[], []])
    publishers = []
    for fi, feed in enumerate(feeds):
        zf = zipfile.ZipFile(io.BytesIO(feed["data"]))
        pre = "" if fi == 0 else feed["id"] + ":"
        stops = {r["stop_id"]: r for r in read_table(zf, "stops.txt")}
        routes = {r["route_id"]: r for r in read_table(zf, "routes.txt")}
        trips = {r["trip_id"]: r for r in read_table(zf, "trips.txt")}
        info = (read_table(zf, "feed_info.txt") or [{}])[0]
        if fi == 0:
            main_info = info
        publishers.append(info.get("feed_publisher_name") or feed.get("label") or feed["id"])

        # hiragana readings (GTFS-JP translations.txt, both the old and new layouts)
        for r in read_table(zf, "translations.txt"):
            if (r.get("language") or r.get("lang")) != "ja-Hrkt":
                continue
            if "trans_id" in r:
                kana.setdefault(r["trans_id"], r["translation"])
            elif r.get("table_name") == "stops" and r.get("field_name") == "stop_name":
                key = r.get("field_value") or stops.get(r.get("record_id"), {}).get("stop_name")
                if key:
                    kana.setdefault(key.strip(), r["translation"])

        cal, exc = export_calendar(zf)
        calendar += [[pre + c[0]] + c[1:] for c in cal]
        for date, (added, removed) in exc.items():
            exceptions[date][0] += [pre + s for s in added]
            exceptions[date][1] += [pre + s for s in removed]

        by_trip = defaultdict(list)
        for r in read_table(zf, "stop_times.txt"):
            by_trip[r["trip_id"]].append(r)
        parsed.append((fi, pre, feed, stops, routes, trips, by_trip))
        print(f"{feed['id']}: {len(stops)} stops, {len(trips)} trips, {len(routes)} routes")

    # ---- stop names across feeds: same name + close together = one stop
    used = {}  # (feed, stop_id) -> stops.txt row, in first-seen order
    for fi, _, _, stops, _, _, by_trip in parsed:
        for rows in by_trip.values():
            for r in rows:
                if r["stop_id"] in stops:
                    used.setdefault((fi, r["stop_id"]), stops[r["stop_id"]])
    clusters = defaultdict(list)  # name -> [{"pts": [...], "feeds": set()}]
    cluster_of = {}
    for key, row in used.items():
        name = row["stop_name"].strip()
        pt = (float(row["stop_lat"]), float(row["stop_lon"]))
        for c in clusters[name]:
            centre = (sum(q[0] for q in c["pts"]) / len(c["pts"]), sum(q[1] for q in c["pts"]) / len(c["pts"]))
            if dist_m(pt, centre) < SAME_STOP_M:
                break
        else:
            c = {"pts": [], "feeds": set()}
            clusters[name].append(c)
        c["pts"].append(pt)
        c["feeds"].add(key[0])
        cluster_of[key] = (name, clusters[name].index(c))

    display = {}
    taken = set()
    for name, cs in clusters.items():
        for ci, c in enumerate(cs):
            if len(cs) == 1 or 0 in c["feeds"]:
                label = name
            else:
                label = f"{name}（{feeds[min(c['feeds'])]['area']}）"
            base, n = label, 2
            while label in taken:  # still ambiguous: number them
                label = f"{base}・{n}"
                n += 1
            taken.add(label)
            display[(name, ci)] = label

    names, name_idx, poles, pole_idx = [], {}, [], {}

    def pole(fi, stop_id, row):
        key = (fi, stop_id)
        if key not in pole_idx:
            base = row["stop_name"].strip()
            label = display[cluster_of[key]]
            if label not in name_idx:
                name_idx[label] = len(names)
                names.append({"n": label, "k": kana.get(base, ""), "lat": [], "lon": []})
            n = name_idx[label]
            lat, lon = round(float(row["stop_lat"]), 6), round(float(row["stop_lon"]), 6)
            names[n]["lat"].append(lat)
            names[n]["lon"].append(lon)
            pole_idx[key] = len(poles)
            poles.append([n, lat, lon])
        return pole_idx[key]

    patterns, pattern_idx = [], {}
    boardings = defaultdict(set)      # stop name -> {(pattern, position)}
    pattern_trips = defaultdict(list)  # pattern -> [(service, [minutes at each stop])]
    for fi, pre, feed, stops, routes, trips, by_trip in parsed:
        for trip_id, rows in by_trip.items():
            trip = trips.get(trip_id)
            if not trip or any(r["stop_id"] not in stops for r in rows) or len(rows) < 2:
                continue
            rows.sort(key=lambda r: int(r["stop_sequence"]))
            route = routes.get(trip["route_id"], {})
            label = (route.get("route_short_name") or route.get("route_long_name") or "").strip()
            label = " ".join(x for x in (feed.get("label", ""), label) if x)
            headsign = (trip.get("trip_headsign") or rows[0].get("stop_headsign") or "").strip()
            if not headsign:
                headsign = stops[rows[-1]["stop_id"]]["stop_name"].strip() + "ゆき"
            seq = tuple(pole(fi, r["stop_id"], stops[r["stop_id"]]) for r in rows)
            key = (label, headsign, seq)
            if key not in pattern_idx:
                pattern_idx[key] = len(patterns)
                patterns.append({"r": label, "h": headsign, "s": list(seq)})
            p = pattern_idx[key]
            times = []
            for k, r in enumerate(rows):
                # when the bus leaves each stop; at the last stop, when it arrives
                t = r.get("arrival_time") if k == len(rows) - 1 else r.get("departure_time")
                t = (t or r.get("departure_time") or r.get("arrival_time") or "").strip()
                times.append(to_minutes(t) if t else None)
            if None in times:
                continue
            pattern_trips[p].append((pre + trip["service_id"], times))
            for pos, r in enumerate(rows[:-1]):  # nobody boards at the last stop
                if r.get("pickup_type") != "1":
                    boardings[poles[seq[pos]][0]].add((p, pos))

    for n in names:
        n["lat"] = round(sum(n["lat"]) / len(n["lat"]), 6)
        n["lon"] = round(sum(n["lon"]) / len(n["lon"]), 6)

    for sub in ("stops", "trips"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
        for f in os.listdir(os.path.join(out_dir, sub)):
            os.remove(os.path.join(out_dir, sub, f))
    services = sorted({sid for trips_ in pattern_trips.values() for sid, _ in trips_})
    service_idx = {sid: i for i, sid in enumerate(services)}

    def dump(path, obj):
        with open(os.path.join(out_dir, path), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))

    for n, entries in boardings.items():
        dump(f"stops/{n}.json", [list(e) for e in sorted(entries)])
    for p, trips_ in pattern_trips.items():
        trips_.sort(key=lambda t: (t[1][0], t[0]))
        dump(f"trips/{p}.json", [
            [service_idx[sid], times[0]] + [b - a for a, b in zip(times, times[1:])]
            for sid, times in trips_
        ])
    dump("patterns.json", patterns)
    main_name = " ".join(x for x in (main_info.get("feed_publisher_name", "名古屋市交通局"), "GTFS-JP",
                                     main_info.get("feed_version", "")) if x)
    dump("index.json", {
        "generated_from": main_name + (f" ほか（{'・'.join(dict.fromkeys(publishers[1:]))}）" if len(feeds) > 1 else ""),
        "source_url": source_url,
        "valid": [main_info.get("feed_start_date", ""), main_info.get("feed_end_date", "")],
        "calendar": calendar,
        "services": services,
        "exceptions": dict(sorted(exceptions.items())),
        "names": [[n["n"], n["k"], n["lat"], n["lon"]] for n in names],
        "poles": poles,
    })
    print(f"stop names: {len(names)}, poles: {len(poles)}, patterns: {len(patterns)}, "
          f"trips: {sum(map(len, pattern_trips.values()))}")


def load_feeds(cfg_path):
    """feeds from gtfs/feeds.json with their zips in gtfs/feeds/ (<id>.zip, <id>-2.zip, …)"""
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    folder = os.path.join(os.path.dirname(cfg_path), "feeds")
    out = []
    for feed in cfg["feeds"]:
        n = 1
        while True:
            path = os.path.join(folder, f"{feed['id']}.zip" if n == 1 else f"{feed['id']}-{n}.zip")
            if not os.path.exists(path):
                break
            fid = feed["id"] if n == 1 else f"{feed['id']}-{n}"
            out.append({**feed, "id": fid, "data": open(path, "rb").read()})
            n += 1
        if n == 1:
            print(f"{feed['id']}: no zip, skipped")
    return out


def main():
    args = sys.argv[1:]
    one = {"id": "nagoya", "label": "", "area": "名古屋市"}
    if len(args) == 3 and args[0] == "--feeds":
        build(load_feeds(args[1]), args[2])
    elif len(args) == 2 and args[0] == "--download":
        data, url = download_feed()
        build([{**one, "data": data}], args[1], url)
    elif len(args) == 2:
        with open(args[0], "rb") as f:
            build([{**one, "data": f.read()}], args[1])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
