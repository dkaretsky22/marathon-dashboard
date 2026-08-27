#!/usr/bin/env python3
"""
build_plan.py  -  generate data/training_plan.json

22-week plan to the Life Time Miami Marathon, Sun Jan 31 2027, goal 3:45:00.
Built around Dan's fall classes, drinking days (Wed/Fri/Sat), travel
(Barcelona, Vegas, NYC) and Florida home football games.

Re-runnable. After running, refresh the dashboard bundle:
    python3 scripts/build_plan.py && python3 -c "import sys;sys.path.insert(0,'scripts');import _common;_common.regen_data_js()"
"""

import json
from datetime import date, datetime, timedelta

from _common import PLAN_PATH, regen_data_js

RACE_DATE = date(2027, 1, 31)          # Sunday
WEEK1_MONDAY = date(2026, 8, 31)
GOAL = "3:45:00"
N_WEEKS = 22

PACES = {
    "easy": "9:45-10:45 /mi",
    "long": "9:30-10:30 /mi",
    "marathon": "8:35 /mi",
    "tempo": "7:50-8:05 /mi",
    "interval": "7:15-7:30 /mi",
    "recovery": "10:30-11:15 /mi",
}

# ---- life constraints -------------------------------------------------------
CLASS_LAST_DAY = date(2026, 12, 11)
CLASSES = {  # weekday index (Mon=0) -> list of "HH:MM-HH:MM label"
    0: ["13:55-15:40 Real Estate Analysis + Lecture 2"],
    1: ["09:35-11:30 Operations Management", "13:55-14:45 Professional Writing"],
    2: ["13:55-15:40 Real Estate Analysis"],
    3: ["09:35-11:30 Operations Management", "13:55-14:45 Professional Writing"],
}

TRIPS = [
    ("Barcelona", date(2026, 9, 23), date(2026, 9, 27)),
    ("Las Vegas", date(2026, 10, 1), date(2026, 10, 4)),
    ("New York (cold)", date(2026, 12, 12), date(2027, 1, 6)),
]
HOME_GAMES = {
    date(2026, 9, 26): "Florida vs Ole Miss (you're in Barcelona - skip)",
    date(2026, 10, 10): "Florida vs South Carolina - The Swamp",
    date(2026, 11, 7): "Florida vs Oklahoma - The Swamp",
    date(2026, 11, 21): "Florida vs Vanderbilt - The Swamp",
}
HOLIDAYS = {
    date(2026, 11, 26): "Thanksgiving",
    date(2026, 12, 25): "Christmas",
    date(2026, 12, 31): "New Year's Eve",
    date(2027, 1, 1): "New Year's Day",
}
DRINKING_DOW = {2, 4, 5}  # Wed, Fri, Sat

# ---- per-week targets -----------------------------------------------------
#            W1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21   22
MILEAGE  = [ 22, 25, 28, 20, 18, 30, 33, 36, 32, 38, 41, 36, 43, 46, 40, 48, 44, 38, 32, 26, 18, 26.2]
LONGRUN  = [  8, 10, 12,  7,  8, 13, 14, 16, 12, 16, 18, 14, 18, 20, 15, 20, 16, 13, 12, 10,  8, 26.2]

def phase(w):
    return ("Base" if w <= 6 else "Build" if w <= 12 else "Peak" if w <= 18 else "Taper")

# Thursday quality session per week (title, miles, purpose)
WORKOUTS = {
    1:  ("6x20s hill strides in a 5 mi easy run",            5, "Wake the legs up - no hard breathing"),
    2:  ("4 x 0.5 mi @ tempo (90s float) in 6 mi",           6, "Rhythm work, controlled"),
    3:  ("2 mi tempo @ 7:55 inside 7 mi",                     7, "First real threshold touch"),
    4:  ("Easy 4 mi, explore Barcelona",                      4, "Travel week - keep it loose"),
    5:  ("Easy 4 mi (Vegas - hydrate, no ego)",               4, "Travel week - just turn the legs over"),
    6:  ("3 mi tempo @ 7:55 inside 6 mi",                     6, "Back to work after the trips"),
    7:  ("4 mi @ 8:00 tempo inside 7 mi",                     7, "Extend threshold volume"),
    8:  ("2 x 2 mi @ 7:55 (2 min jog) inside 8 mi",           8, "Threshold intervals"),
    9:  ("5 x 800 m @ 7:20 (400 jog) inside 6 mi",            6, "Sharpen - down week, stay smooth"),
    10: ("5 mi @ marathon pace (8:35) inside 8 mi",           8, "First MP block"),
    11: ("4 mi tempo @ 7:50 inside 9 mi",                     9, "Biggest threshold day"),
    12: ("6 x 800 m @ 7:15 (400 jog) inside 7 mi",            7, "VO2 sharpener, down week"),
    13: ("6 mi @ marathon pace (8:35) inside 8 mi",           8, "MP volume - Thanksgiving week"),
    14: ("2 x 3 mi @ 7:55 (3 min jog) inside 9 mi",           9, "Peak threshold"),
    15: ("8 mi progression, last 3 @ MP, inside 8 mi",        8, "Down week - controlled progression"),
    16: ("5 x 1000 m @ 7:15 (400 jog) inside 7 mi",           7, "Legs turnover before the big long run"),
    17: ("6 mi @ marathon pace (8:35) inside 8 mi",           8, "Last big MP day"),
    18: ("3 mi tempo @ 7:55 inside 6 mi",                     6, "Taper begins - stay sharp, not tired"),
    19: ("4 mi @ marathon pace (8:35) inside 6 mi",           6, "Race-pace feel, low volume"),
    20: ("3 mi @ marathon pace (8:35) inside 5 mi",           5, "Short, crisp"),
    21: ("2 mi @ 7:55 + 4 x 100 m strides inside 5 mi",       5, "Prime the system"),
    22: ("Race week - see daily notes",                       0, "Trust the taper"),
}

# Sunday long-run flavour per week
LONG_NOTE = {
    8:  "last 3 mi @ marathon pace",
    10: "last 4 mi @ marathon pace",
    11: "last 5 mi @ marathon pace",
    13: "miles 7-12 @ marathon pace",
    14: "last 4 mi @ marathon pace - key session",
    16: "steady; last 3 @ MP. COLD (NYC) - overdress or treadmill. Key session.",
    17: "last 4 mi @ marathon pace (NYC cold)",
}


def dsplit(total, longmi, w):
    """Split a weekly total across Mon/Tue/Wed/Thu/Sat given the long run + Thu workout."""
    thu = WORKOUTS[w][1]
    rem = max(total - longmi - thu, 0)
    mon = round(rem * 0.28)
    tue = round(rem * 0.34)
    wed = round(rem * 0.24)
    sat = max(rem - mon - tue - wed, 0)
    # keep run days runnable
    mon = max(mon, 3) if rem > 6 else mon
    tue = max(tue, 3) if rem > 6 else tue
    return mon, tue, wed, sat, thu


def trip_for(d):
    for name, s, e in TRIPS:
        if s <= d <= e:
            return name
    return None


def flags_for(d):
    fl = []
    t = trip_for(d)
    if t:
        fl.append(f"travel:{t}")
    if d in HOME_GAMES:
        fl.append("home-game")
    if d in HOLIDAYS:
        fl.append(f"holiday:{HOLIDAYS[d]}")
    if d.weekday() in DRINKING_DOW:
        fl.append("drinking-day")
    if d.weekday() in CLASSES and d <= CLASS_LAST_DAY and not t:
        fl.append("class-day")
    return fl


def session(d, kind, title, miles, pace, purpose):
    return {
        "date": d.isoformat(),
        "dow": d.strftime("%a"),
        "kind": kind,
        "title": title,
        "miles": round(miles, 1),
        "pace": pace,
        "purpose": purpose,
        "flags": flags_for(d),
        "classes": CLASSES.get(d.weekday(), []) if d <= CLASS_LAST_DAY else [],
    }


def build_week(w):
    mon = WEEK1_MONDAY + timedelta(days=(w - 1) * 7)
    days = [mon + timedelta(days=i) for i in range(7)]
    total = MILEAGE[w - 1]
    longmi = LONGRUN[w - 1]
    ph = phase(w)
    sessions = []

    if w == 22:  # race week, bespoke
        specs = [
            ("easy", "Easy shakeout", 4, PACES["easy"], "Legs stay used to running"),
            ("easy", "Easy + 4 x 100 m strides", 5, PACES["easy"], "Last touch of turnover"),
            ("rest", "Rest", 0, "-", "Nothing - let the taper work"),
            ("easy", "Easy", 3, PACES["easy"], "Loosen up, drive/fly to Miami after"),
            ("shakeout", "Shakeout + travel to Miami", 2, PACES["easy"], "Legs open, then expo"),
            ("rest", "Rest / expo (optional 1-2 mi walk)", 0, "-", "Stay off your feet, hydrate, carbs"),
            ("race", "MIAMI MARATHON - 26.2", 26.2, PACES["marathon"],
             "First half 8:40-8:45, settle in. Halfway ~1:53. Negative split. 6:00 AM start."),
        ]
        for d, (kind, title, miles, pace, purpose) in zip(days, specs):
            sessions.append(session(d, kind, title, miles, pace, purpose))
        return week_obj(w, mon, ph, total, longmi, sessions)

    mon_mi, tue_mi, wed_mi, sat_mi, thu_mi = dsplit(total, longmi, w)
    wname, _, wpurpose = WORKOUTS[w]
    long_flag = LONG_NOTE.get(w)

    # Monday - recovery + strength (rest on down/taper weeks)
    if w in (9, 12, 15, 18, 19, 20, 21):
        sessions.append(session(days[0], "strength", "Rest or 20 min shakeout + strength", 0,
                                 "-", "Down week - prioritise recovery"))
    else:
        sessions.append(session(days[0], "easy", "Recovery jog + strength", max(mon_mi, 3),
                                 PACES["recovery"], "Easy shakeout, then lift"))

    # Tuesday - easy + strides
    sessions.append(session(days[1], "easy", "Easy + 4-6 x 100 m strides", max(tue_mi, 3),
                            PACES["easy"], "Aerobic volume, quick feet at the end"))

    # Wednesday - short easy AM (drinking day) or rest
    if wed_mi >= 3 and w not in (4, 5):
        sessions.append(session(days[2], "easy", "Short easy - run it in the MORNING", wed_mi,
                                PACES["easy"], "Get it done before the day gets away from you"))
    else:
        sessions.append(session(days[2], "rest", "Rest", 0, "-", "Drinking day - no run"))

    # Thursday - the workout
    thu_date = days[3]
    if thu_date in HOLIDAYS:
        sessions.append(session(thu_date, "easy", "Easy 3 (turkey trot if you want)", 3,
                                PACES["easy"], "Holiday - keep it social and short"))
        # push the quality to Tuesday
        sessions[1] = session(days[1], "workout", "MOVED UP: " + wname, WORKOUTS[w][1],
                              PACES["tempo"], wpurpose + " (Thu is a holiday)")
    elif w in (4, 5):
        sessions.append(session(thu_date, "easy" if thu_mi else "rest",
                                wname, thu_mi, PACES["easy"], wpurpose))
    else:
        thu_pace = PACES["easy"] if w in (1, 2) else PACES["tempo"]
        sessions.append(session(thu_date, "workout", wname, WORKOUTS[w][1],
                                thu_pace, wpurpose))

    # Friday - rest
    sessions.append(session(days[4], "rest", "Rest", 0, "-", "Drinking day - full rest"))

    sat_date = days[5]
    sun = days[6]
    gameday = sat_date in HOME_GAMES and not trip_for(sat_date)

    if gameday:
        # Home game = all-day drinking. Long run at DAWN Saturday, then tailgate;
        # Sunday is full recovery.
        title = f"Long run {longmi} mi - BEFORE the game"
        if long_flag:
            title += f" ({long_flag})"
        sessions.append(session(sat_date, "long", title, longmi, PACES["long"],
                                f"Out the door by 6:30 AM. {HOME_GAMES[sat_date]}. "
                                "Bank it before kickoff, then you've earned the day."))
        sessions.append(session(sun, "rest", "Recovery - full rest", 0, "-",
                                "Long run + gameday were yesterday. Hydrate, eat, sleep."))
    else:
        # Saturday - rest or short shakeout
        if sat_date in HOLIDAYS or trip_for(sat_date):
            sessions.append(session(sat_date, "rest", "Rest", 0, "-", "Rest day"))
        elif sat_mi >= 2:
            sessions.append(session(sat_date, "shakeout", "Easy shakeout - MORNING", sat_mi,
                                    PACES["easy"], "Short and early, before the day starts"))
        else:
            sessions.append(session(sat_date, "rest", "Rest", 0, "-", "Optional full rest"))

        # Sunday - long run
        if w in (4, 5):
            sessions.append(session(sun, "long", f"Easy {longmi} (travel day - do it if you can)",
                                    longmi, PACES["easy"], "Time on feet, no pace pressure"))
        else:
            title = f"Long run {longmi} mi"
            if long_flag:
                title += f" - {long_flag}"
            sessions.append(session(sun, "long", title, longmi, PACES["long"],
                                    "The most important run of the week"))

    return week_obj(w, mon, ph, total, longmi, sessions)


def week_obj(w, mon, ph, total, longmi, sessions):
    planned = round(sum(s["miles"] for s in sessions if s["kind"] != "race") or 0, 1)
    notes = []
    if w in (4, 5):
        notes.append("Cut-back / travel week - fitness is banked, don't chase mileage abroad.")
    if w == 16:
        notes.append("You're in NYC and it's cold. This + next 2 weeks decide the race. "
                     "Overdress, hat + gloves, or use a treadmill for the long run. Do not skip.")
    if 16 <= w <= 19:
        notes.append("NYC block: cold-weather running - layers, wind at your back on the way home.")
    if w == 18:
        notes.append("NYE week - Thu/Fri are write-offs. Sat easy, Sun long run non-negotiable.")
    if w == 22:
        notes.append("RACE WEEK. Sleep is the training now. Lay out kit Sat night. "
                     "Miami is warm - dress like it's 15 degrees warmer than the thermometer.")
    return {
        "week": w,
        "phase": ph,
        "start": mon.isoformat(),
        "target_mileage": total,
        "long_run_mi": longmi,
        "planned_mileage": planned,
        "notes": notes,
        "sessions": sessions,
    }


def main():
    weeks = [build_week(w) for w in range(1, N_WEEKS + 1)]
    plan = {
        "race": "Life Time Miami Marathon",
        "race_date": RACE_DATE.isoformat(),
        "race_start_time": "06:00",
        "goal_time": GOAL,
        "goal_pace": "8:34 /mi",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "paces": PACES,
        "week1_monday": WEEK1_MONDAY.isoformat(),
        "n_weeks": N_WEEKS,
        "constraints": {
            "drinking_days": ["Wed", "Fri", "Sat"],
            "classes": {str(k): v for k, v in CLASSES.items()},
            "class_last_day": CLASS_LAST_DAY.isoformat(),
            "trips": [{"name": n, "start": s.isoformat(), "end": e.isoformat()} for n, s, e in TRIPS],
            "home_games": {d.isoformat(): v for d, v in HOME_GAMES.items()},
        },
        "weeks": weeks,
    }
    with open(PLAN_PATH, "w") as f:
        json.dump(plan, f, indent=2)
        f.write("\n")
    total_sessions = sum(len([s for s in w["sessions"] if s["kind"] not in ("rest",)]) for w in weeks)
    regen_data_js()
    print(f"Wrote {PLAN_PATH}: {N_WEEKS} weeks, {total_sessions} run sessions. data.js refreshed.")


if __name__ == "__main__":
    main()
