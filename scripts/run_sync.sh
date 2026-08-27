#!/bin/zsh
# Wrapper the launchd job calls every 30 min. Edit PYTHON if `which python3`
# points somewhere else on your machine.
set -e
PYTHON="${PYTHON:-/opt/anaconda3/bin/python3}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"
exec "$PYTHON" scripts/strava_sync.py >> "$HERE/sync.log" 2>&1
