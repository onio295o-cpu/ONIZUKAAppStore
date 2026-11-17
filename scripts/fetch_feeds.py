#!/usr/bin/env python3
"""Download the GTFS(-JP) feeds listed in gtfs/feeds.json into gtfs/feeds/<id>.zip.

A feed whose download fails keeps its previous zip, so one unreachable site
never takes routes out of the app. For 'gtfs-data' sources every feed of the
organization is merged into one zip-per-feed ("<id>.zip", "<id>-2.zip", …).

Usage: fetch_feeds.py [gtfs/feeds.json]
"""
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone

UA = {"User-Agent": "ONIZUKAAppStore-bus-feeds"}
TODAY = datetime.now(timezone(timedelta(hours=9))).strftime("%Y%m%d")


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def feed_start(data):
    """earliest date the feed has service, from feed_info or calendar"""
    zf = zipfile.ZipFile(io.BytesIO(data))
    names = {n.split("/")[-1]: n for n in zf.namelist()}
    for table, col in (("feed_info.txt", "feed_start_date"), ("calendar.txt", "start_date")):
        if table in names:
            rows = list(csv.DictReader(io.TextIOWrapper(zf.open(names[table]), encoding="utf-8-sig")))
            dates = [r.get(col, "") for r in rows if r.get(col)]
            if dates:
                return min(dates)
    return ""


def bodik(dataset):
    """newest zip of a data.bodik.jp dataset that is already in service"""
    meta = json.loads(get(f"https://data.bodik.jp/api/3/action/package_show?id={dataset}"))
    res = [r for r in meta["result"]["resources"]
           if r.get("url", "").lower().split("?")[0].endswith(".zip") or (r.get("format") or "").lower() == "zip"]
    res.sort(key=lambda r: r.get("created") or r.get("last_modified") or "", reverse=True)
    fallback = None
    for r in res[:6]:
        print("  candidate:", r.get("name"), r["url"])
        data = get(r["url"])
        start = feed_start(data)
        if start and start > TODAY:
            print(f"    starts {start}, not yet in service")
            fallback = fallback or data
            continue
        return [data]
    return [fallback] if fallback else []


CATALOGUE = None


def gtfs_data(org, match=None):
    global CATALOGUE
    if CATALOGUE is None:
        CATALOGUE = json.loads(get("https://api.gtfs-data.jp/v2/feeds"))["body"]
    out = []
    for f in CATALOGUE:
        if f.get("organization_id") != org:
            continue
        if match and match not in (f.get("feed_name") or "") + (f.get("feed_id") or ""):
            continue
        base = f"https://api.gtfs-data.jp/v2/organizations/{org}/feeds/{f['feed_id']}/files/feed.zip"
        print(f"  {f.get('feed_name')} ({f['feed_id']})")
        # the repository copy of the current revision, else the operator's own link, else the next revision
        urls = [base + "?rid=current", f.get("feed_src_gtfs_current_url"), base + "?rid=next",
                f.get("feed_src_gtfs_next_url")]
        for url in filter(None, urls):
            try:
                out.append(get(url))
                break
            except Exception as e:  # noqa: BLE001 - try the next source
                print(f"    {url}: {e}")
        else:
            print("    catalogue entry:", json.dumps({k: v for k, v in f.items() if "url" in k or "date" in k},
                                                  ensure_ascii=False))
    return out


def main():
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else "gtfs/feeds.json"
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    out_dir = os.path.join(os.path.dirname(cfg_path), "feeds")
    os.makedirs(out_dir, exist_ok=True)
    failures = 0
    for feed in cfg["feeds"]:
        print(f"{feed['id']}:")
        try:
            if feed["source"] == "bodik":
                blobs = bodik(feed["dataset"])
            else:
                blobs = gtfs_data(feed["org"], feed.get("feed_match"))
            if not blobs:
                raise RuntimeError("no feed found")
            for i, data in enumerate(blobs):
                zipfile.ZipFile(io.BytesIO(data)).testzip()
                name = f"{feed['id']}.zip" if i == 0 else f"{feed['id']}-{i + 1}.zip"
                path = os.path.join(out_dir, name)
                old = open(path, "rb").read() if os.path.exists(path) else None
                if old != data:
                    open(path, "wb").write(data)
                print(f"  -> {name} {len(data)} bytes{' (unchanged)' if old == data else ''}")
        except Exception as e:  # noqa: BLE001 - keep the previous zip
            failures += 1
            print(f"  FAILED ({e}); keeping the previous zip if there is one")
    print(f"done, {failures} failed")


if __name__ == "__main__":
    main()
