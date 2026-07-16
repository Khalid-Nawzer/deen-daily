// netlify/functions/check-azan.js
//
// Triggered every 5 minutes by a free GitHub Actions cron job (see
// .github/workflows/azan-cron.yml) — NOT Netlify's own Scheduled Functions,
// whose free-tier cadence is too coarse for prayer-time accuracy.
//
// Two things happen on every run:
//  1. AZAN: the moment a prayer time arrives, every user with notifications
//     enabled gets a one-time "it's time" push.
//  2. REMINDERS: for anyone who still hasn't marked that prayer done, a
//     gentle nudge is re-sent every ~30 minutes until they mark it, the next
//     prayer's time arrives, or the day's 10:30pm cutoff passes — all of
//     this works even with the app fully closed, as long as there's some
//     connectivity on the phone.

const { db, sendPush } = require('./_shared');

const LAT = 6.9271, LNG = 79.8612; // Colombo, Sri Lanka
const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DAY_CUTOFF_MINUTES = 22 * 60 + 30; // 10:30pm — matches the in-app "missed today" cutoff
const REMINDER_GAP_MS = 28 * 60 * 1000; // ~every 30 minutes, with a little slack for cron jitter

function getSLDateAndMinutes() {
  const now = new Date();
  const sl = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60000);
  const dateKey = sl.toISOString().slice(0, 10);
  const minutesNow = sl.getHours() * 60 + sl.getMinutes();
  return { dateKey, minutesNow };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

async function fetchTimings(dateKey) {
  const [y, mo, d] = dateKey.split('-');
  const dateStr = `${d}-${mo}-${y}`;
  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${LAT}&longitude=${LNG}&method=1`;
  const res = await fetch(url);
  const json = await res.json();
  return json.data.timings;
}

async function sendOnTimeAzan(dateKey, timings, minutesNow) {
  const stateRef = db.collection('azanState').doc(dateKey);
  const stateDoc = await stateRef.get();
  const sentAlready = stateDoc.exists ? stateDoc.data() : {};

  const due = PRAYER_KEYS.filter(key => {
    if (sentAlready[key]) return false;
    const prayerMinutes = toMinutes(timings[key].slice(0, 5));
    return minutesNow >= prayerMinutes && minutesNow <= prayerMinutes + 6;
  });

  if (due.length === 0) return [];

  const usersSnap = await db.collection('users').get();
  const subs = usersSnap.docs.map(d => d.data().pushSubscription).filter(Boolean);

  for (const prayer of due) {
    await Promise.all(
      subs.map(sub => sendPush(sub, {
        title: `🕌 ${prayer} time`,
        body: `It's time for ${prayer} prayer in Sri Lanka.`
      }))
    );
    await stateRef.set({ [prayer]: true }, { merge: true });
  }
  return due;
}

async function sendMissedReminders(dateKey, timings, minutesNow) {
  const roomsSnap = await db.collection('rooms').get();
  let sentCount = 0;

  for (const roomDoc of roomsSnap.docs) {
    const room = roomDoc.data();
    const memberUids = [room.hostUid, room.guestUid].filter(Boolean);
    if (memberUids.length === 0) continue;

    const dayDoc = await roomDoc.ref.collection('days').doc(dateKey).get();
    const dayData = dayDoc.exists ? dayDoc.data() : {};

    for (let i = 0; i < PRAYER_KEYS.length; i++) {
      const key = PRAYER_KEYS[i];
      const itemId = key.toLowerCase(); // matches the app's prayer ids: fajr, dhuhr, asr, maghrib, isha
      const prayerMin = toMinutes(timings[key].slice(0, 5));
      if (minutesNow < prayerMin) continue; // hasn't started yet — nothing to nudge about

      // stop nudging once the *next* prayer has begun (or, for Isha, once the
      // day's missed-prayer cutoff passes) — the in-app "missed today" list
      // takes over from there instead of repeated pushes
      const nextMin = i < PRAYER_KEYS.length - 1
        ? toMinutes(timings[PRAYER_KEYS[i + 1]].slice(0, 5))
        : DAY_CUTOFF_MINUTES;
      if (minutesNow >= nextMin) continue;

      for (const uid of memberUids) {
        const alreadyDone = dayData[uid] && dayData[uid][itemId];
        if (alreadyDone) continue;

        const reminderRef = db.collection('reminders').doc(`${dateKey}_${uid}_${itemId}`);
        const reminderSnap = await reminderRef.get();
        const lastSent = reminderSnap.exists ? reminderSnap.data().lastSent : 0;
        if (Date.now() - lastSent < REMINDER_GAP_MS) continue;

        const userDoc = await db.collection('users').doc(uid).get();
        const sub = userDoc.exists && userDoc.data().pushSubscription;
        if (!sub) continue;

        const sent = await sendPush(sub, {
          title: `${key} is still waiting 🤍`,
          body: `You haven't marked ${key} as prayed yet — every prayer carries its own reward. There's still time.`
        });
        if (sent) {
          await reminderRef.set({ lastSent: Date.now() }, { merge: true });
          sentCount++;
        }
      }
    }
  }
  return sentCount;
}

exports.handler = async () => {
  try {
    const { dateKey, minutesNow } = getSLDateAndMinutes();
    const timings = await fetchTimings(dateKey);

    const azanFired = await sendOnTimeAzan(dateKey, timings, minutesNow);
    const reminderCount = await sendMissedReminders(dateKey, timings, minutesNow);

    return {
      statusCode: 200,
      body: `azan: ${azanFired.join(', ') || 'none'} | reminders sent: ${reminderCount}`
    };
  } catch (err) {
    console.error('check-azan error', err);
    return { statusCode: 200, body: 'error (see logs)' };
  }
};
