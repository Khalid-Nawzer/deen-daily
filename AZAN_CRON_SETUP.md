# Deen Daily — Automatic on-time Azan (server-driven)

## What this actually does, honestly
Every 5 minutes, a free GitHub-hosted robot "pings" your site. That ping
checks Sri Lanka's real prayer times and, the moment one arrives, sends a
real push notification to every phone that's enabled notifications —
**even if the app is completely closed on both phones.**

**The one true limit:** a phone with zero internet connection (full offline,
no data, no wifi) cannot receive anything from any server, by any app,
ever — that's a limit of physics/networking, not of this app. As long as
either of you has even background mobile data on, this will reach you.

## One-time setup (10 minutes)

### Step 1 — Edit one line
Open `.github/workflows/azan-cron.yml` in this package and replace
`YOUR-SITE-NAME` with your actual Netlify site name, e.g. if your site is
`dancing-sunburst-3d73d3.netlify.app`, the line becomes:
```
curl -sS -X GET "https://dancing-sunburst-3d73d3.netlify.app/.netlify/functions/check-azan" \
```

### Step 2 — Push everything to your GitHub repo
Upload/commit all files as usual, including the hidden `.github` folder
(GitHub's upload tool includes it automatically if you drag the whole
project folder in — folders starting with a dot are not skipped).

### Step 3 — Confirm GitHub Actions is on
GitHub repo → **Actions** tab → you should see "Azan Checker" listed.
If it asks you to enable workflows, click **Enable**.

### Step 4 — Test it immediately (don't wait for a real prayer time)
GitHub repo → **Actions** tab → **Azan Checker** → **Run workflow** button
→ Run. This manually fires one check right now so you can confirm it's
wired up correctly, without waiting for an actual prayer time.

That's it — no new environment variables needed beyond what you already set
up for push notifications (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, `FIREBASE_SERVICE_ACCOUNT`), since this reuses the same
push system.

## How to verify it's really working
1. Make sure **🔔 Enable notifications** is switched on in Settings on your
   phone (this is the step that saves your push subscription)
2. Wait for the next real prayer time (or check `timings` for today via
   `https://api.aladhan.com/v1/timings/DD-MM-YYYY?latitude=6.9271&longitude=79.8612&method=1`
   to see what time is coming up soon)
3. You should get a notification within about 5 minutes of that prayer time,
   labelled e.g. "🕌 Asr time"

## If it doesn't fire
- Check GitHub → Actions tab → the latest "Azan Checker" run — if it shows
  a red ✕, click into it to see the error (usually a typo in the site URL
  or a missing environment variable)
- Make sure notifications are enabled and you completed the push
  notification setup from `PUSH_SETUP.md` first — this azan cron system is
  built on top of that, not a replacement for it
