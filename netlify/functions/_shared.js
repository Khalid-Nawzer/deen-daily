// netlify/functions/_shared.js
const webpush = require('web-push');
const admin = require('firebase-admin');

// Optional, lightweight abuse guard: if APP_SHARED_SECRET is set in Netlify's
// environment variables, requests must include a matching x-app-secret header.
// Honest caveat: since the client (index.html) has to embed this same value to
// send it, anyone who reads the app's JS source can find it too — this stops
// casual/automated scanning of the bare function URL, not a determined
// attacker who inspects the bundle. If APP_SHARED_SECRET isn't set, this
// check is skipped entirely (keeps existing deploys working without it).
function checkSharedSecret(event) {
  const required = (process.env.APP_SHARED_SECRET || '').trim();
  if (!required) return true; // not configured — no enforcement
  const provided = (event.headers && (event.headers['x-app-secret'] || event.headers['X-App-Secret'])) || '';
  return provided === required;
}

function parseServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  raw = raw.trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('FIREBASE_SERVICE_ACCOUNT failed to parse. First/last 40 chars:',
      JSON.stringify(raw.slice(0, 40)), '...', JSON.stringify(raw.slice(-40)));
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not valid JSON — re-copy it from the downloaded key file, Netlify → Environment variables → edit FIREBASE_SERVICE_ACCOUNT, paste the ENTIRE file contents exactly, then redeploy.');
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount())
  });
}

webpush.setVapidDetails(
  (process.env.VAPID_SUBJECT || 'mailto:example@example.com').trim(),
  (process.env.VAPID_PUBLIC_KEY || '').trim(),
  (process.env.VAPID_PRIVATE_KEY || '').trim()
);
const db = admin.firestore();

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('sendPush failed:', err.statusCode || '', err.message || err);
    return false;
  }
}

// Sends via Firebase Cloud Messaging — the reliable path for the native
// Android app (unlike web push, which doesn't register properly inside an
// embedded WebView). Uses the same service account already configured above.
async function sendFcm(token, payload) {
  try {
    await admin.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body }
    });
    return true;
  } catch (err) {
    console.error('sendFcm failed:', err.code || '', err.message || err);
    return false;
  }
}

// Delivers to whichever channel a user has registered — FCM token (native
// app, preferred/reliable) or web-push subscription (browser PWA) — trying
// both if both exist, so nobody silently misses a notification.
async function deliverToUser(userData, payload) {
  let delivered = false;
  if (userData && userData.fcmToken) {
    delivered = await sendFcm(userData.fcmToken, payload) || delivered;
  }
  if (userData && userData.pushSubscription) {
    delivered = await sendPush(userData.pushSubscription, payload) || delivered;
  }
  return delivered;
}

module.exports = { admin, db, sendPush, sendFcm, deliverToUser, checkSharedSecret };
