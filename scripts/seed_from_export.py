#!/usr/bin/env python3
"""
seed_from_export.py  -  ONE-TIME backfill.

Parses data/_seed/activities.csv (your Strava bulk export) into
data/activities.json so the dashboard has full history on day one.
Later strava_sync.py runs merge fresher API data on top (same activity ids).

Usage:
    python3 scripts/seed_from_export.py
"""

import csv
import os
from datetime import datetime

from _common import (
    FEET_PER_METER,
    METERS_PER_MILE,
    SEED_CSV,
    load_activities,
    regen_data_js,
    save_activities,
)

# Column indices in the Strava export CSV (metric block, cols 15+).
I_ID, I_DATE, I_NAME, I_TYPE = 0, 1, 2, 3
I_ELAPSED_TOP = 5
I_ELAPSED_S, I_MOVING_S, I_DIST_M = 15, 16, 17
I_AVG_SPEED_MS, I_ELEV_GAIN_M = 19, 20
I_MAX_HR, I_AVG_HR, I_REL_EFFORT = 30, 31, 37
I_COMPETITION, I_LONG_RUN = 95, 96

RUN_TYPES = {"Run", "TrailRun", "VirtualRun"}


def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def parse_row(row):
    try:
        dt = datetime.strptime(row[I_DATE], "%b %d, %Y, %I:%M:%S %p")
    except ValueError:
        return None
    dist_m = f(row[I_DIST_M]) or 0.0
    moving = f(row[I_MOVING_S]) or f(row[I_ELAPSED_S]) or f(row[I_ELAPSED_TOP]) or 0.0
    dist_mi = dist_m / METERS_PER_MILE
    pace = (moving / 60) / dist_mi if dist_mi > 0.1 else None
    sport = row[I_TYPE] or "Unknown"

    wtype = None
    if (f(row[I_COMPETITION]) or 0) >= 1:
        wtype = 1
    elif (f(row[I_LONG_RUN]) or 0) >= 1:
        wtype = 2

    return {
        "id": str(row[I_ID]),
        "source": "export",
        "name": row[I_NAME] or "",
        "sport": sport,
        "is_run": sport in RUN_TYPES,
        "start_date": dt.isoformat(),
        "date": dt.date().isoformat(),
        "distance_mi": round(dist_mi, 2),
        "moving_time_s": int(moving),
        "elapsed_time_s": int(f(row[I_ELAPSED_S]) or moving),
        "pace_min_per_mi": round(pace, 2) if pace else None,
        "avg_hr": f(row[I_AVG_HR]),
        "max_hr": f(row[I_MAX_HR]),
        "elev_gain_ft": round((f(row[I_ELEV_GAIN_M]) or 0) * FEET_PER_METER, 1),
        "avg_speed_mph": round((f(row[I_AVG_SPEED_MS]) or 0) * 2.23694, 2),
        "suffer_score": f(row[I_REL_EFFORT]),
        "workout_type": wtype,
    }


def main():
    if not os.path.exists(SEED_CSV):
        raise SystemExit(f"Seed CSV not found at {SEED_CSV}")

    by_id = load_activities()
    seeded = 0
    with open(SEED_CSV, newline="") as fh:
        reader = csv.reader(fh)
        next(reader, None)  # header
        for row in reader:
            if len(row) < 40:
                continue
            act = parse_row(row)
            if not act:
                continue
            # don't clobber anything strava_sync already fetched
            if by_id.get(act["id"], {}).get("source") == "strava":
                continue
            by_id[act["id"]] = act
            seeded += 1

    save_activities(by_id)
    total = regen_data_js()
    print(f"Seeded {seeded} activities from export. {total} total in data/activities.json.")


if __name__ == "__main__":
    main()
