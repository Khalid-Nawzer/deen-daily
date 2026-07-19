// netlify/functions/_shared.js
const webpush = require('web-push');
const admin = require('firebase-admin');

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

module.exports = { admin, db, sendPush };