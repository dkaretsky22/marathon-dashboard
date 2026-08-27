#!/usr/bin/env python3
"""
strava_sync.py  -  pull recent Strava activities, merge into data/activities.json,
regenerate data/data.js. Safe to run repeatedly (it's what launchd runs every 30 min).

Usage:
    python3 scripts/strava_sync.py            # last ~200 activities
    python3 scripts/strava_sync.py --deep     # walk further back (all pages)
"""

import sys
from datetime import datetime, timezone

import requests

from _common import (
    FEET_PER_METER,
    METERS_PER_MILE,
    load_activities,
    load_config,
    regen_data_js,
    save_activities,
    save_config,
)

TOKEN_URL = "https://www.strava.com/oauth/token"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

RUN_TYPES = {"Run", "TrailRun", "VirtualRun"}


def get_access_token(config):
    if not config.get("refresh_token"):
        raise SystemExit("No refresh_token in config.json - run scripts/strava_auth.py first.")
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "refresh_token": config["refresh_token"],
            "grant_type": "refresh_token",
        },
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    # Strava rotates refresh tokens - persist the new one or the next run breaks.
    if data.get("refresh_token") and data["refresh_token"] != config["refresh_token"]:
        config["refresh_token"] = data["refresh_token"]
        save_config(config)
    return data["access_token"]


def fetch_activities(access_token, deep=False):
    headers = {"Authorization": f"Bearer {access_token}"}
    out = []
    max_pages = 100 if deep else 4
    for page in range(1, max_pages + 1):
        resp = requests.get(
            ACTIVITIES_URL,
            headers=headers,
            params={"per_page": 100, "page": page},
            timeout=20,
        )
        if resp.status_code == 429:
            print("Hit Strava rate limit - stopping early, will catch up next run.")
            break
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        out.extend(batch)
    return out


def normalize(a):
    sport = a.get("sport_type") or a.get("type") or "Unknown"
    dist_mi = (a.get("distance") or 0) / METERS_PER_MILE
    moving = a.get("moving_time") or 0
    pace = (moving / 60) / dist_mi if dist_mi > 0.1 else None
    start_local = (a.get("start_date_local") or "").replace("Z", "")
    return {
        "id": str(a["id"]),
        "source": "strava",
        "name": a.get("name") or "",
        "sport": sport,
        "is_run": sport in RUN_TYPES,
        "start_date": start_local,
        "date": start_local[:10],
        "distance_mi": round(dist_mi, 2),
        "moving_time_s": moving,
        "elapsed_time_s": a.get("elapsed_time") or moving,
        "pace_min_per_mi": round(pace, 2) if pace else None,
        "avg_hr": a.get("average_heartrate"),
        "max_hr": a.get("max_heartrate"),
        "elev_gain_ft": round((a.get("total_elevation_gain") or 0) * FEET_PER_METER, 1),
        "avg_speed_mph": round((a.get("average_speed") or 0) * 2.23694, 2),
        "suffer_score": a.get("suffer_score"),
        "workout_type": a.get("workout_type"),
    }


def main():
    deep = "--deep" in sys.argv
    config = load_config()
    token = get_access_token(config)
    raw = fetch_activities(token, deep=deep)

    by_id = load_activities()
    before = len(by_id)
    new_count = 0
    for a in raw:
        key = str(a["id"])
        if key not in by_id or by_id[key].get("source") != "strava":
            new_count += 1
        by_id[key] = normalize(a)

    save_activities(by_id)
    synced_at = datetime.now(timezone.utc).isoformat()
    total = regen_data_js(synced_at=synced_at)

    print(
        f"[{synced_at}] pulled {len(raw)} from Strava, "
        f"{new_count} new/updated, {before} -> {total} total. data.js regenerated."
    )


if __name__ == "__main__":
    main()
