// netlify/functions/notify.js
//
// Called by the app whenever someone marks a prayer/dua as done.
// Delivers a real push notification to the partner's phone — works even if
// their app/tab is fully closed, as long as they have some connectivity.

const { db, deliverToUser } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { toUid, title, body } = JSON.parse(event.body || '{}');
    if (!toUid) {
      return { statusCode: 400, body: 'Missing toUid' };
    }

    const userDoc = await db.collection('users').doc(toUid).get();
    if (!userDoc.exists) {
      return { statusCode: 200, body: 'No such user' };
    }

    const sent = await deliverToUser(userDoc.data(), { title: title || 'Deen Daily', body: body || '' });
    return { statusCode: 200, body: sent ? 'sent' : 'no registered device for this user' };
  } catch (err) {
    console.error('notify error', err);
    return { statusCode: 200, body: 'ok (see logs)' };
  }
};
