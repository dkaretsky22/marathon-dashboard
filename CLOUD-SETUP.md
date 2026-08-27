# Put the dashboard on the web (Option B)

End result: a private web address like `dan-marathon.netlify.app` that you add to your iPhone
home screen as an app. It updates itself every hour in the cloud — your Mac doesn't need to be
on, and you never open Terminal again.

**Pieces (all free):**

- **GitHub** – stores the project + runs the hourly Strava sync (GitHub Actions)
- **Netlify** – serves the dashboard at a URL, redeploys automatically whenever the sync commits new data

You already did the Strava part. Your three credentials are in `config.json` – you'll paste them
into GitHub once, as encrypted "Secrets."

---

## 1. Get your 3 Strava values

In Terminal (last time, promise):

```bash
cat ~/marathon-dashboard/config.json
```

Note the `client_id`, `client_secret`, and `refresh_token` strings. Keep the window open.

## 2. Put the project on GitHub (no Terminal)

1. Make a free account at <https://github.com> if you don't have one.
2. Install **GitHub Desktop**: <https://desktop.github.com>
3. Open GitHub Desktop → **File → Add Local Repository** → choose `~/marathon-dashboard`.
   (It's already a git repo with a first commit ready.)
4. Click **Publish repository**. **Keep "Keep this code private" checked.** Publish.

## 3. Add your Strava secrets to GitHub

1. On github.com, open your new `marathon-dashboard` repo.
2. **Settings** (tab) → left sidebar **Secrets and variables → Actions**.
3. **New repository secret**, three times:

   | Name | Value |
   |---|---|
   | `STRAVA_CLIENT_ID` | your client_id |
   | `STRAVA_CLIENT_SECRET` | your client_secret |
   | `STRAVA_REFRESH_TOKEN` | your refresh_token |

## 4. Add the sync workflow

1. In the repo, click **Add file → Create new file**.
2. Name it exactly: `.github/workflows/sync.yml`
3. Open `deploy/sync.workflow.yml` (in your project folder), copy everything **below the dashed
   line**, paste it in.
4. **Commit new file.**
5. Open the **Actions** tab → click **Strava sync** → **Run workflow** to test it now. Green check = working.
   After that it runs every hour on its own.

## 5. Connect Netlify

1. Free account at <https://netlify.com> – click **Sign up with GitHub**.
2. **Add new site → Import an existing project → GitHub →** pick `marathon-dashboard`.
3. Leave build command **blank**, publish directory **`.`** (a dot). **Deploy.**
4. When it finishes you get a URL like `random-name-123.netlify.app`. In **Site configuration →
   Change site name** you can rename it to something like `dan-marathon`.

Netlify now redeploys automatically every time the hourly sync pushes new data.

## 6. Add it to your phone

1. Open the Netlify URL in **Safari** on your iPhone.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. You get a "Miami 26.2" icon. Tap it any time – always current.

---

## If something breaks

- **Actions tab shows a red X** → click it. `401 Unauthorized` = a secret is wrong or the
  refresh token went stale. Re-run `python3 scripts/strava_auth.py` locally, `cat config.json`,
  update the `STRAVA_REFRESH_TOKEN` secret.
- **Dashboard not updating** → check the Actions tab ran, then check Netlify **Deploys**.
- **Want it more often than hourly** → edit the `cron:` line in `.github/workflows/sync.yml`
  (`"*/30 * * * *"` = every 30 min). Private repos get 2,000 free Action-minutes/month; hourly
  uses ~1,100.

## You can stop using the Mac entirely

Once this is running you don't need the local `launchd` job. Turn it off if you set it up:

```bash
launchctl unload ~/Library/LaunchAgents/com.dan.marathon-sync.plist
```
