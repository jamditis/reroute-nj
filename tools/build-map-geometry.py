#!/usr/bin/env python3
"""Build data/map-geometry.json from an NJ Transit rail GTFS feed.

Usage:
  python3 tools/build-map-geometry.py /path/to/gtfs-dir [--feed-date YYYY-MM-DD]

Expects stops.txt, trips.txt, stop_times.txt, and shapes.txt.

The committed JSON is the runtime source. Re-run this when NJ Transit
publishes a new rail GTFS if station coordinates or alignments change.
`--feed-date` is the day the GTFS zip was downloaded. `generated` is the
day this script writes the JSON.
"""
from __future__ import annotations

import csv
import json
import math
import os
import sys
from collections import defaultdict
from datetime import date


# Display name, GTFS stop_name, line id
STATIONS = [
    # Montclair-Boonton
    ("Hackettstown", "HACKETTSTOWN", "montclair-boonton"),
    ("Mount Olive", "MOUNT OLIVE", "montclair-boonton"),
    ("Netcong", "NETCONG", "montclair-boonton"),
    ("Lake Hopatcong", "LAKE HOPATCONG", "montclair-boonton"),
    ("Mount Arlington", "MOUNT ARLINGTON", "montclair-boonton"),
    ("Dover", "DOVER", "montclair-boonton"),
    ("Denville", "DENVILLE", "montclair-boonton"),
    ("Mountain Lakes", "MOUNTAIN LAKES", "montclair-boonton"),
    ("Boonton", "BOONTON", "montclair-boonton"),
    ("Towaco", "TOWACO", "montclair-boonton"),
    ("Lincoln Park", "LINCOLN PARK", "montclair-boonton"),
    ("Mountain View", "MOUNTAIN VIEW", "montclair-boonton"),
    ("Wayne/Route 23", "WAYNE/ROUTE 23 TRANSIT CENTER [RR]", "montclair-boonton"),
    ("Little Falls", "LITTLE FALLS", "montclair-boonton"),
    ("Montclair State University", "MSU", "montclair-boonton"),
    ("Montclair Heights", "MONTCLAIR HEIGHTS", "montclair-boonton"),
    ("Mountain Avenue", "MOUNTAIN AVENUE", "montclair-boonton"),
    ("Upper Montclair", "UPPER MONTCLAIR", "montclair-boonton"),
    ("Watchung Avenue", "WATCHUNG AVENUE", "montclair-boonton"),
    ("Walnut Street", "WALNUT STREET", "montclair-boonton"),
    ("Bay Street (Montclair)", "BAY STREET", "montclair-boonton"),
    ("Glen Ridge", "GLEN RIDGE", "montclair-boonton"),
    ("Bloomfield", "BLOOMFIELD", "montclair-boonton"),
    ("Watsessing Avenue", "WATSESSING AVENUE", "montclair-boonton"),
    # Morris & Essex — Morristown (west of Morristown retained on the shape)
    ("Mount Tabor", "MOUNT TABOR", "morris-essex"),
    ("Morris Plains", "MORRIS PLAINS", "morris-essex"),
    ("Morristown", "MORRISTOWN", "morris-essex"),
    ("Convent Station", "CONVENT", "morris-essex"),
    ("Madison", "MADISON", "morris-essex"),
    ("Chatham", "CHATHAM", "morris-essex"),
    ("Summit", "SUMMIT", "morris-essex"),
    ("Short Hills", "SHORT HILLS", "morris-essex"),
    ("Millburn", "MILLBURN", "morris-essex"),
    ("Maplewood", "MAPLEWOOD", "morris-essex"),
    ("South Orange", "SOUTH ORANGE", "morris-essex"),
    ("Mountain Station", "MOUNTAIN STATION", "morris-essex"),
    ("Highland Avenue", "HIGHLAND AVENUE", "morris-essex"),
    ("Orange", "ORANGE", "morris-essex"),
    ("Brick Church", "BRICK CHURCH", "morris-essex"),
    ("East Orange", "EAST ORANGE", "morris-essex"),
    ("Newark Broad Street", "NEWARK BROAD ST", "morris-essex"),
    # Gladstone Branch
    ("Gladstone", "GLADSTONE", "morris-essex"),
    ("Peapack", "PEAPACK", "morris-essex"),
    ("Far Hills", "FAR HILLS", "morris-essex"),
    ("Bernardsville", "BERNARDSVILLE", "morris-essex"),
    ("Basking Ridge", "BASKING RIDGE", "morris-essex"),
    ("Lyons", "LYONS", "morris-essex"),
    ("Millington", "MILLINGTON", "morris-essex"),
    ("Stirling", "STIRLING", "morris-essex"),
    ("Gillette", "GILLETTE", "morris-essex"),
    ("Berkeley Heights", "BERKELEY HEIGHTS", "morris-essex"),
    ("Murray Hill", "MURRAY HILL", "morris-essex"),
    ("New Providence", "NEW PROVIDENCE", "morris-essex"),
    # NEC
    ("Trenton", "TRENTON TRANSIT CENTER", "northeast-corridor"),
    ("Hamilton", "HAMILTON", "northeast-corridor"),
    ("Princeton Junction", "PRINCETON JCT.", "northeast-corridor"),
    ("Jersey Avenue", "JERSEY AVE.", "northeast-corridor"),
    ("New Brunswick", "NEW BRUNSWICK", "northeast-corridor"),
    ("Edison", "EDISON STATION", "northeast-corridor"),
    ("Metuchen", "METUCHEN", "northeast-corridor"),
    ("Metropark", "METROPARK", "northeast-corridor"),
    ("Rahway", "RAHWAY", "northeast-corridor"),
    ("Linden", "LINDEN", "northeast-corridor"),
    ("Elizabeth", "ELIZABETH", "northeast-corridor"),
    ("North Elizabeth", "NORTH ELIZABETH", "northeast-corridor"),
    ("Newark Airport", "NEWARK AIRPORT RAILROAD STATION", "northeast-corridor"),
    ("Newark Penn Station", "NEWARK PENN STATION", "northeast-corridor"),
    ("Secaucus Junction", "SECAUCUS LOWER LEVEL", "northeast-corridor"),
    # NJCL
    ("Bay Head", "BAY HEAD", "north-jersey-coast"),
    ("Point Pleasant Beach", "POINT PLEASANT", "north-jersey-coast"),
    ("Manasquan", "MANASQUAN", "north-jersey-coast"),
    ("Spring Lake", "SPRING LAKE", "north-jersey-coast"),
    ("Belmar", "BELMAR", "north-jersey-coast"),
    ("Bradley Beach", "BRADLEY BEACH", "north-jersey-coast"),
    ("Asbury Park", "ASBURY PARK", "north-jersey-coast"),
    ("Allenhurst", "ALLENHURST", "north-jersey-coast"),
    ("Elberon", "ELBERON", "north-jersey-coast"),
    ("Long Branch", "LONG BRANCH", "north-jersey-coast"),
    ("Little Silver", "LITTLE SILVER", "north-jersey-coast"),
    ("Red Bank", "RED BANK", "north-jersey-coast"),
    ("Middletown", "MIDDLETOWN NJ", "north-jersey-coast"),
    ("Hazlet", "HAZLET", "north-jersey-coast"),
    ("Aberdeen-Matawan", "ABERDEEN-MATAWAN", "north-jersey-coast"),
    ("South Amboy", "SOUTH AMBOY", "north-jersey-coast"),
    ("Perth Amboy", "PERTH AMBOY", "north-jersey-coast"),
    ("Woodbridge", "WOODBRIDGE", "north-jersey-coast"),
    ("Avenel", "AVENEL", "north-jersey-coast"),
    # RVL
    ("High Bridge", "HIGH BRIDGE", "raritan-valley"),
    ("Annandale", "ANNANDALE", "raritan-valley"),
    ("Lebanon", "LEBANON", "raritan-valley"),
    ("White House", "WHITE HOUSE", "raritan-valley"),
    ("North Branch", "NORTH BRANCH", "raritan-valley"),
    ("Raritan", "RARITAN", "raritan-valley"),
    ("Somerville", "SOMERVILLE", "raritan-valley"),
    ("Bridgewater", "BRIDGEWATER", "raritan-valley"),
    ("Bound Brook", "BOUND BROOK", "raritan-valley"),
    ("Dunellen", "DUNELLEN", "raritan-valley"),
    ("Plainfield", "PLAINFIELD", "raritan-valley"),
    ("Netherwood", "NETHERWOOD", "raritan-valley"),
    ("Fanwood", "FANWOOD", "raritan-valley"),
    ("Westfield", "WESTFIELD", "raritan-valley"),
    ("Garwood", "GARWOOD", "raritan-valley"),
    ("Cranford", "CRANFORD", "raritan-valley"),
    ("Roselle Park", "ROSELLE PARK", "raritan-valley"),
    ("Union", "UNION", "raritan-valley"),
]

# route_id -> (origin GTFS name, terminal GTFS name, line, branch)
ROUTE_TARGETS = {
    "2": ("HACKETTSTOWN", "HOBOKEN", "montclair-boonton", "boonton"),
    "7": ("MORRISTOWN", "HOBOKEN", "morris-essex", "morristown"),
    "8": ("GLADSTONE", "HOBOKEN", "morris-essex", "gladstone"),
    "10": ("TRENTON TRANSIT CENTER", "NEW YORK PENN STATION", "northeast-corridor", "nec"),
    "11": ("BAY HEAD", "NEW YORK PENN STATION", "north-jersey-coast", "njcl"),
    "16": ("HIGH BRIDGE", "NEWARK PENN STATION", "raritan-valley", "rvl"),
}

def nearest_idx(seq, target):
    return min(range(len(seq)), key=lambda i: dist2(seq[i], target))


def crop_to_terminals(raw, origin_pt, dest_pt):
    """Keep only the shape between two stops. GTFS shapes often continue past dest."""
    if len(raw) < 2:
        return raw
    i0, i1 = nearest_idx(raw, origin_pt), nearest_idx(raw, dest_pt)
    if i0 > i1:
        i0, i1 = i1, i0
    return raw[i0 : i1 + 1]


def dist2(a, b):
    lat = (a[0] + b[0]) / 2 * math.pi / 180
    dx = (a[1] - b[1]) * math.cos(lat) * 111320
    dy = (a[0] - b[0]) * 110540
    return dx * dx + dy * dy


def walk_toward(seq, i0, i1, meters):
    """Walk along seq from i0 toward i1 until about `meters` have elapsed."""
    if not seq or i0 == i1:
        return seq[i0]
    step = 1 if i1 > i0 else -1
    travelled = 0.0
    i = i0
    while i != i1:
        nxt = i + step
        d = math.sqrt(dist2(seq[i], seq[nxt]))
        if travelled + d >= meters:
            return seq[nxt]
        travelled += d
        i = nxt
    return seq[i1]


def parse_args(argv):
    gtfs = None
    feed_date = None
    args = argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--feed-date":
            if i + 1 >= len(args):
                raise SystemExit("usage: --feed-date YYYY-MM-DD")
            feed_date = args[i + 1]
            i += 2
            continue
        if args[i].startswith("-"):
            raise SystemExit("unknown option " + args[i])
        gtfs = args[i]
        i += 1
    if not gtfs:
        gtfs = "/tmp/reroute-nj-research/gtfs"
    if not feed_date:
        feed_date = date.today().isoformat()
    return gtfs, feed_date


def perpendicular_m(p, a, b):
    if a == b:
        return math.sqrt(dist2(p, a))
    lat0 = a[0] * math.pi / 180

    def xy(q):
        return ((q[1] - a[1]) * math.cos(lat0) * 111320, (q[0] - a[0]) * 110540)

    px, py = xy(p)
    bx, by = xy(b)
    denom = bx * bx + by * by
    t = 0 if denom == 0 else max(0, min(1, (px * bx + py * by) / denom))
    dx, dy = px - t * bx, py - t * by
    return math.sqrt(dx * dx + dy * dy)


def douglas_peucker(pts, epsilon_m):
    if len(pts) < 3:
        return pts
    max_d = -1.0
    idx = 0
    for i in range(1, len(pts) - 1):
        d = perpendicular_m(pts[i], pts[0], pts[-1])
        if d > max_d:
            max_d = d
            idx = i
    if max_d > epsilon_m:
        left = douglas_peucker(pts[: idx + 1], epsilon_m)
        right = douglas_peucker(pts[idx:], epsilon_m)
        return left[:-1] + right
    return [pts[0], pts[-1]]


def round_pt(pt):
    return [round(pt[0], 5), round(pt[1], 5)]


def load_csv(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main():
    gtfs, feed_date = parse_args(sys.argv)
    generated = date.today().isoformat()
    out_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "map-geometry.json",
    )

    stops_rows = load_csv(os.path.join(gtfs, "stops.txt"))
    by_name = {}
    sid_name = {}
    for row in stops_rows:
        sid_name[row["stop_id"]] = row["stop_name"]
        by_name[row["stop_name"]] = {
            "lat": float(row["stop_lat"]),
            "lng": float(row["stop_lon"]),
        }

    stations = []
    missing = []
    for display, gtfs_name, line in STATIONS:
        rec = by_name.get(gtfs_name)
        if not rec:
            missing.append(gtfs_name)
            continue
        stations.append(
            {
                "name": display,
                "lat": round(rec["lat"], 6),
                "lng": round(rec["lng"], 6),
                "line": line,
            }
        )
    if missing:
        raise SystemExit("Missing GTFS stops: " + ", ".join(missing))

    def hub(gtfs_name, hid, name, desc):
        rec = by_name[gtfs_name]
        return {
            "id": hid,
            "name": name,
            "lat": round(rec["lat"], 6),
            "lng": round(rec["lng"], 6),
            "desc": desc,
            "type": "hub",
        }

    hubs = [
        hub("HOBOKEN", "hoboken", "Hoboken Terminal", "NJ Transit, PATH, ferry, Bus 126"),
        hub("NEWARK PENN STATION", "newark-penn", "Newark Penn Station", "NJ Transit, PATH, buses"),
        hub("SECAUCUS LOWER LEVEL", "secaucus", "Secaucus Junction", "NJ Transit transfer station"),
        hub(
            "NEW YORK PENN STATION",
            "nyp",
            "Penn Station New York",
            "NJ Transit, Amtrak, LIRR, subway",
        ),
        hub(
            "NEWARK BROAD ST",
            "newark-broad",
            "Newark Broad Street",
            "Morris & Essex and Montclair-Boonton hub",
        ),
        {
            "id": "path-33",
            "name": "33rd Street PATH",
            "lat": 40.7489,
            "lng": -73.9885,
            "desc": "PATH from Hoboken",
            "type": "hub",
        },
        {
            "id": "ferry-39",
            "name": "W. 39th St ferry terminal",
            "lat": 40.7596,
            "lng": -74.0001,
            "desc": "NY Waterway from Hoboken",
            "type": "hub",
        },
        {
            "id": "pabt",
            "name": "Port Authority Bus Terminal",
            "lat": 40.7569,
            "lng": -73.9903,
            "desc": "Bus 126 from Hoboken",
            "type": "hub",
        },
        {
            "id": "wtc",
            "name": "World Trade Center PATH",
            "lat": 40.7127,
            "lng": -74.0099,
            "desc": "PATH from Newark",
            "type": "hub",
        },
    ]

    needed_names = set()
    for origin, dest, _line, _branch in ROUTE_TARGETS.values():
        needed_names.add(origin)
        needed_names.add(dest)

    trip_hits = defaultdict(set)
    with open(os.path.join(gtfs, "stop_times.txt"), newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            name = sid_name.get(row["stop_id"])
            if name in needed_names:
                trip_hits[row["trip_id"]].add(name)

    trip_meta = {}
    with open(os.path.join(gtfs, "trips.txt"), newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            trip_meta[row["trip_id"]] = (row["route_id"], row["shape_id"])

    shape_len = defaultdict(int)
    with open(os.path.join(gtfs, "shapes.txt"), newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            shape_len[row["shape_id"]] += 1

    best = {}
    for tid, names in trip_hits.items():
        meta = trip_meta.get(tid)
        if not meta:
            continue
        rid, sid = meta
        if rid not in ROUTE_TARGETS:
            continue
        origin, dest, line, branch = ROUTE_TARGETS[rid]
        if origin in names and dest in names:
            n = shape_len.get(sid, 0)
            key = (line, branch)
            if key not in best or n > best[key][1]:
                best[key] = (sid, n)

    need_ids = {sid for sid, _n in best.values()}
    shape_pts = defaultdict(list)
    with open(os.path.join(gtfs, "shapes.txt"), newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["shape_id"] in need_ids:
                shape_pts[row["shape_id"]].append(
                    (
                        int(row["shape_pt_sequence"]),
                        float(row["shape_pt_lat"]),
                        float(row["shape_pt_lon"]),
                    )
                )
    for sid in shape_pts:
        shape_pts[sid].sort()

    terminals = {}
    for origin, dest, line, branch in ROUTE_TARGETS.values():
        terminals[(line, branch)] = (
            (by_name[origin]["lat"], by_name[origin]["lng"]),
            (by_name[dest]["lat"], by_name[dest]["lng"]),
        )

    routes = []
    for (line, branch), (sid, _n) in sorted(best.items()):
        raw = [(lat, lng) for _seq, lat, lng in shape_pts[sid]]
        ends = terminals.get((line, branch))
        # Only RVL GTFS shapes continue past the displayed dest (Newark Penn
        # on to Penn Station NY). Cropping every line would cut the Morristown
        # Line at Morristown and drop Morris Plains and Mount Tabor.
        if ends and line == "raritan-valley":
            raw = crop_to_terminals(raw, ends[0], ends[1])
        simp = douglas_peucker(raw, 70)
        if len(simp) > 160:
            simp = douglas_peucker(raw, 120)
        routes.append(
            {
                "line": line,
                "branch": branch,
                "coords": [round_pt(p) for p in simp],
            }
        )
        print(f"{line}/{branch} shape {sid} raw={len(raw)} simp={len(simp)}")

    nec_sid = best[("northeast-corridor", "nec")][0]
    nec_raw = [(lat, lng) for _seq, lat, lng in shape_pts[nec_sid]]
    newark = (by_name["NEWARK PENN STATION"]["lat"], by_name["NEWARK PENN STATION"]["lng"])
    secaucus = (by_name["SECAUCUS LOWER LEVEL"]["lat"], by_name["SECAUCUS LOWER LEVEL"]["lng"])

    i0, i1 = nearest_idx(nec_raw, newark), nearest_idx(nec_raw, secaucus)
    if i0 > i1:
        i0, i1 = i1, i0
    corridor_raw = nec_raw[i0 : i1 + 1]
    corridor = [round_pt(p) for p in douglas_peucker(corridor_raw, 25)]

    # New Portal North Bridge sits on the current NEC alignment over the Hackensack.
    # Pick the corridor point nearest 40.745, -74.118 (river crossing on the new span).
    target = (40.745, -74.118)
    plat, plng = min(corridor_raw, key=lambda p: dist2(p, target))
    portal = {
        "lat": round(plat, 5),
        "lng": round(plng, 5),
        "name": "Portal North Bridge",
    }

    # 1910 swing span sits immediately south of Portal North Bridge at the
    # same Hackensack crossing. Wikipedia's infobox (40.75361, -74.09472) is
    # too coarse to plot; snap ~150 m toward Newark along the NEC shape.
    portal_idx = nearest_idx(corridor_raw, (plat, plng))
    newark_idx = nearest_idx(corridor_raw, newark)
    old_lat, old_lng = walk_toward(corridor_raw, portal_idx, newark_idx, 150)
    old_portal = {
        "lat": round(old_lat, 5),
        "lng": round(old_lng, 5),
        "name": "Old Portal Bridge",
    }

    hoboken = (hubs[0]["lat"], hubs[0]["lng"])
    geo = {
        "source": (
            "NJ Transit rail GTFS (stops.txt + shapes.txt). "
            "Downloaded from https://www.njtransit.com/rail_data.zip on "
            + feed_date
            + ". "
            "Portal North Bridge is the NEC shape point over the Hackensack River. "
            "Old Portal Bridge is ~150 m toward Newark on that same alignment."
        ),
        "generated": generated,
        "portal": portal,
        "oldPortal": old_portal,
        "hubs": hubs,
        "stations": stations,
        "routes": routes,
        "cutoverCorridor": corridor,
        "alternatives": [
            {
                "id": "path-hoboken-33",
                "name": "PATH Hoboken–33rd St",
                "coords": [round_pt(hoboken), [40.7489, -73.9885]],
            },
            {
                "id": "ferry-hoboken-39",
                "name": "NY Waterway Hoboken–W. 39th St",
                "coords": [round_pt(hoboken), [40.7596, -74.0001]],
            },
            {
                "id": "bus-126",
                "name": "Bus 126 Hoboken–Port Authority",
                "coords": [round_pt(hoboken), [40.7569, -73.9903]],
            },
            {
                "id": "path-newark-wtc",
                "name": "PATH Newark–WTC",
                "coords": [
                    [hubs[1]["lat"], hubs[1]["lng"]],
                    [40.7127, -74.0099],
                ],
            },
        ],
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(geo, fh, indent=2)
        fh.write("\n")
    print("wrote", out_path, "bytes", os.path.getsize(out_path))
    print("portal", portal, "corridor", len(corridor))


if __name__ == "__main__":
    main()
