# Deen Daily — Setting up real push notifications (like WhatsApp)

Important honest note first: this only works if you move from "drag and drop a
zip into Netlify" to "connect a GitHub repo to Netlify". Drag-and-drop can only
host static files — it can't run the small server-side function that actually
delivers a notification to a closed app. Everything below is still 100% free,
no card needed anywhere, just a few more one-time setup steps.

## Step 1 — Put the project on GitHub (free)
1. Go to **github.com** on your phone → sign up free if you don't have an account
2. Tap **+ → New repository** → name it `deen-daily` → Create repository
3. On the empty repo page, tap **"uploading an existing file"**
4. Upload every file from this package (index.html, manifest.json, sw.js,
   icon-192.png, icon-512.png, azan.mp3, netlify.toml, package.json, and the
   whole `netlify/functions/notify.js` — GitHub lets you drag a folder in and
   it keeps the folder structure)
5. Commit the files

## Step 2 — Connect that repo to Netlify
1. Go to **app.netlify.com** → **Add new site → Import an existing project**
2. Choose **GitHub** → authorize it → select your `deen-daily` repo
3. Leave build settings as-is (no build command needed) → **Deploy**
4. This gives you a new Netlify URL — once it's working you can point your
   existing custom link to this new site, or just start sharing the new one

## Step 3 — Add the secret keys Netlify needs
Netlify → your site → **Site configuration → Environment variables → Add a variable**,
add these four:

| Key | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BGXzttD3Lf0gELRfSqGCNiRXqki-xrihsQ-OxnR4x4qpYKtBIk_0W28X_aGGtpTCD3KHn0pVT9MpYIknEYcnmMA` |
| `VAPID_PRIVATE_KEY` | `_ILGCAwpCAbJ6oj8k6sbVc1R0RPq62EfxCd1y6vlIU0` |
| `VAPID_SUBJECT` | `mailto:youremail@example.com` (any real email of yours) |
| `FIREBASE_SERVICE_ACCOUNT` | see Step 4 below |

## Step 4 — Get your Firebase service account key
1. Firebase console → ⚙️ **Project settings → Service accounts** tab
2. Click **Generate new private key** → it downloads a `.json` file
3. Open that file, copy its *entire contents*, and paste the whole thing as
   the value of `FIREBASE_SERVICE_ACCOUNT` in Netlify (Netlify's box accepts
   multi-line text, so just paste it exactly as downloaded)
4. **Keep this file private** — it gives full admin access to your Firebase
   project. Don't upload it to GitHub; it only goes into Netlify's environment
   variables, which stay private to your account.

## Step 5 — Redeploy
Netlify → your site → **Deploys** → **Trigger deploy** (so it picks up the new
environment variables), then wait ~30 seconds.

## How it behaves now
- Tap **🔔 Enable notifications** in Settings once — this is the step that
  registers your phone to actually receive pushes
- When your partner marks a prayer, you'll get a real phone notification —
  sound, lock screen, the works — even if Deen Daily isn't open at all
- This uses the same underlying technology (Web Push) that WhatsApp Web,
  Twitter/X, and most big web apps use for browser notifications. On Android
  Chrome it's very reliable. On iPhone, it requires iOS 16.4+ and the app must
  be added to your Home Screen first (Safari → Share → Add to Home Screen) —
  Apple only allows web push for installed PWAs, not regular browser tabs
- If your phone's battery saver aggressively kills background apps (common on
  some Android brands like Xiaomi/Huawei), you may need to allow Chrome/the
  app to run in the background in your phone's battery settings for full
  reliability
