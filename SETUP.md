# Deen Daily — Setup steps for the new features

You don't need to change any code — just do these two things in the Firebase console
for project `prayer-d44f1`, then redeploy the folder to Netlify like before.

## 1. Turn on Google Sign-In
Firebase console → **Authentication** → **Sign-in method** → enable **Google**.
Add your Netlify domain (and `localhost` for testing) under **Authorized domains**
if it's not already there.

## 2. Set Firestore security rules
Firebase console → **Firestore Database** → **Rules** → paste the contents of
`firestore.rules` (included in this folder) → **Publish**.

This is important now that the app is open to everyone: it makes sure a person can
only read/write their own account and the one pair (room) they belong to — nobody
can see or edit another couple's prayer data.

## What changed
- **Sign in with Google** replaces the old "tap Khalid / Partner" buttons. Your
  progress now follows your account, not the browser/device.
- **Pairing by code**: after signing in, the first person creates a pair and gets a
  6-character code. The second person enters that code and both are instantly
  connected — this replaces the old hardcoded "only 2 people can use it" setup, so
  any number of *pairs* can now use the same app independently of each other.
- **Editable name**: set your own display name during setup or later in
  Settings → "Your name". Nothing is hardcoded anymore.
- **Notifications**: unchanged in behaviour, but now correctly tied to your account
  and your specific partner instead of a fixed label.
- **Qibla compass**: new tab in the bottom nav. It uses your location + your phone's
  compass to point at the Kaaba. On iPhone it will ask for a one-time "Motion &
  Orientation Access" permission — that's normal iOS behaviour.
- The Firebase `apiKey` in the code is a normal *public* client identifier (this is
  expected for Firebase web apps) — the actual protection comes from the security
  rules in step 2, so don't skip that step.
