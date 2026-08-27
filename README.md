# Miami Marathon Dashboard

A local dashboard + 22-week training plan for the **Life Time Miami Marathon, Sun Jan 31 2027**,
goal **3:45:00** (8:34/mi). It pulls your runs from Strava (your Garmin vívoactive 6 already pushes
there), tracks them against the plan, and refreshes itself every 30 minutes.

```
marathon-dashboard/
├── dashboard.html          <- double-click this
├── config.json             <- your Strava API keys go here (gitignored)
├── scripts/
│   ├── strava_auth.py      <- run ONCE to authorize
│   ├── seed_from_export.py <- run ONCE to load your history
│   ├── strava_sync.py      <- pulls new runs (launchd runs this for you)
│   ├── build_plan.py       <- regenerates the training plan
│   └── run_sync.sh         <- wrapper the scheduler calls
├── data/                   <- activities.json, training_plan.json, data.js (generated)
└── launchd/com.dan.marathon-sync.plist
```

---

## One-time setup (~10 minutes)

### 1. Install the one dependency

```bash
/opt/anaconda3/bin/python3 -m pip install -r ~/marathon-dashboard/requirements.txt
```

(That's the Python the scheduler uses. `requests` is already installed on this machine, so this
is just a safety check.)

### 2. Create a Strava API application

1. Go to <https://www.strava.com/settings/api> (log in if asked).
2. Fill in the form:
   - **Application Name:** `My Marathon Dashboard` (anything)
   - **Category:** `Training`
   - **Club:** leave blank
   - **Website:** `http://localhost`
   - **Authorization Callback Domain:** `localhost`   ← important, exactly this
3. Click **Create**. Agree to the API terms.
4. You now see **Client ID** and **Client Secret**. Keep the page open.

### 3. Put the keys in `config.json`

Open `~/marathon-dashboard/config.json` and paste them in:

```json
{
  "client_id": "12345",
  "client_secret": "abc123...the long one...",
  "refresh_token": "",
  "athlete_id": null
}
```

### 4. Authorize (one click)

```bash
cd ~/marathon-dashboard
/opt/anaconda3/bin/python3 scripts/strava_auth.py
```

Your browser opens a Strava "Authorize" page. **Leave every box checked** (the dashboard needs
`activity:read_all` to see your private/followers-only runs) and click **Authorize**. The tab will
say "you can close this". Back in the terminal you'll see `Success! refresh_token saved`.

### 5. Load your history, then do the first sync

```bash
/opt/anaconda3/bin/python3 scripts/seed_from_export.py
/opt/anaconda3/bin/python3 scripts/strava_sync.py
```

### 6. Open the dashboard

```bash
open ~/marathon-dashboard/dashboard.html
```

Bookmark it. It's a local file — nothing is uploaded anywhere.

### 7. Turn on auto-refresh

```bash
cp ~/marathon-dashboard/launchd/com.dan.marathon-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.dan.marathon-sync.plist
launchctl list | grep marathon      # confirm it's registered
```

From now on, `strava_sync.py` runs every 30 minutes while your Mac is awake. Upload a run to
Strava (or let the Garmin do it), wait up to half an hour, refresh the dashboard tab — the run
shows up, checked off against the plan.

To stop it later:
`launchctl unload ~/Library/LaunchAgents/com.dan.marathon-sync.plist`

---

## Day-to-day

- **See today's session:** open `dashboard.html`. "This week" is the top card, today is outlined.
- **Force a refresh now:** `/opt/anaconda3/bin/python3 scripts/strava_sync.py`
- **Check the sync is healthy:** `tail ~/marathon-dashboard/sync.log`
- **Change the plan** (paces, mileage, a workout): edit `scripts/build_plan.py`, then
  `/opt/anaconda3/bin/python3 scripts/build_plan.py`. Reload the dashboard.

## The plan in one paragraph

22 weeks, 4–5 running days. **Thursday** is the quality day, **Sunday** is the long run — both
chosen because Wed/Fri/Sat are your drinking days (no key sessions land there; Fri/Sat are rest
or a short Saturday-morning shakeout). Wednesday runs, when they exist, are short and **in the
morning**. Barcelona (Sep 23–27) and Vegas (Oct 1–4) are back-to-back cut-back weeks — just easy
running. Florida home games (Oct 10, Nov 7, Nov 21) make those Saturdays full rest. The two
20-milers and the start of the taper fall during your NYC trip (Dec 12 – Jan 6) — it's cold, so
overdress or use a treadmill, and treat those three weeks as the ones that decide the race. Taper
back home in Gainesville, race in Miami.

Paces off the 3:45 goal: easy 9:45–10:45 · long 9:30–10:30 · marathon 8:35 · tempo 7:50–8:05 ·
intervals 7:15–7:30.

## Google Calendar

The plan's sessions are also written into your Google Calendar as timed events, all titled with a
🏃 prefix (long runs Sun 8 AM, weekday runs 5 PM, Wednesday/Saturday shakeouts in the morning).
Move or delete them freely — the dashboard reads Strava, not your calendar, so changing calendar
events doesn't affect tracking. To wipe them and start over, search your calendar for `🏃`.

## Notes

- `config.json` holds your Strava secret in plaintext. It's local-only and gitignored. Don't share it.
- "Every 30 min" is polling. Instant updates would need a Strava webhook + a public URL — not worth
  it for one person.
- The plan is fixed once generated. Missed runs show up in the "Adherence" panel but the plan
  doesn't reshuffle itself. If life blows up a few weeks, re-tune `build_plan.py`.
