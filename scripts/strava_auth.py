#!/usr/bin/env python3
"""
strava_auth.py  -  ONE-TIME Strava authorization.

Run this once. It opens your browser, you click "Authorize", and it writes a
long-lived refresh_token into config.json. After that, strava_sync.py runs on
its own forever.

Prereq: config.json exists with your client_id and client_secret filled in
(from https://www.strava.com/settings/api - see README.md).

Usage:
    python3 scripts/strava_auth.py
"""

import sys
import time
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests

from _common import load_config, save_config

REDIRECT_HOST = "localhost"
REDIRECT_PORT = 8721
REDIRECT_URI = f"http://{REDIRECT_HOST}:{REDIRECT_PORT}/callback"
SCOPE = "read,activity:read_all"
AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
TOKEN_URL = "https://www.strava.com/oauth/token"

_result = {}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return
        params = urllib.parse.parse_qs(parsed.query)
        _result["code"] = params.get("code", [None])[0]
        _result["error"] = params.get("error", [None])[0]
        _result["scope"] = params.get("scope", [""])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        msg = "Authorization complete. You can close this tab and return to the terminal."
        if _result["error"]:
            msg = f"Authorization failed: {_result['error']}. Close this tab and try again."
        self.wfile.write(f"<html><body style='font-family:sans-serif'><h2>{msg}</h2></body></html>".encode())

    def log_message(self, *args):
        pass


def main():
    config = load_config()
    for key in ("client_id", "client_secret"):
        val = str(config.get(key, ""))
        if not val or val.startswith("PASTE") or val.startswith("your_"):
            sys.exit(f"config.json: fill in a real {key} first (see README.md).")

    query = urllib.parse.urlencode(
        {
            "client_id": config["client_id"],
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": SCOPE,
        }
    )
    url = f"{AUTHORIZE_URL}?{query}"

    server = HTTPServer((REDIRECT_HOST, REDIRECT_PORT), Handler)
    print("Opening browser for Strava authorization...")
    print(f"If it doesn't open, paste this into your browser:\n{url}\n")
    webbrowser.open(url)

    print(f"Waiting for the redirect to {REDIRECT_URI} ...")
    deadline = time.time() + 300
    while "code" not in _result and "error" not in _result and time.time() < deadline:
        server.handle_request()

    if _result.get("error"):
        sys.exit(f"Strava returned an error: {_result['error']}")
    if not _result.get("code"):
        sys.exit("Timed out waiting for authorization.")

    if "activity:read_all" not in _result.get("scope", ""):
        print(
            "WARNING: you did not grant 'activity:read_all'. Private/followers-only "
            "runs will be missing. Re-run this script and leave all boxes checked."
        )

    print("Exchanging authorization code for tokens...")
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "code": _result["code"],
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    resp.raise_for_status()
    tokens = resp.json()

    config["refresh_token"] = tokens["refresh_token"]
    config["athlete_id"] = tokens.get("athlete", {}).get("id")
    save_config(config)

    name = tokens.get("athlete", {}).get("firstname", "")
    print(f"\nSuccess{' , ' + name if name else ''}! refresh_token saved to config.json.")
    print("Next:  python3 scripts/seed_from_export.py   then   python3 scripts/strava_sync.py")


if __name__ == "__main__":
    main()
