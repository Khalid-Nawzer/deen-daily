// netlify/functions/ai.js
//
// Server-side proxy for Gemini so AI features (Dua AI chat, Tamil/Sinhala
// translations, prophet-story translations, etc.) work out of the box on
// every install — nobody has to paste in their own API key.
//
// The real key lives ONLY here, in Netlify's environment variables
// (Site settings → Environment variables → GEMINI_API_KEY), never in the
// app bundle, so it can't be extracted from the APK or the website source.
//
// One free Gemini key is shared across everyone using the app. Google's
// free tier is rate-limited (currently ~15 requests/minute, ~1500/day at
// the time of writing) — fine for a small/medium user base, but if the
// app grows a lot this shared quota can be exhausted on a busy day. If
// that happens, upgrade to a paid Gemini key (still cheap) and nothing
// else needs to change.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY is not set on the server. Add it in Netlify → Site configuration → Environment variables, then redeploy.' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const prompt = (body.prompt || '').toString().trim();
  if (!prompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing "prompt"' }) };
  }
  // Basic guardrail so this endpoint can't be abused as a free-for-all giant-prompt relay
  if (prompt.length > 8000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt too long' }) };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || `Gemini error ${res.status}`;
      return { statusCode: res.status, headers, body: JSON.stringify({ error: msg }) };
    }

    const text = ((data.candidates || [])[0]?.content?.parts || []).map(p => p.text).join('').trim();
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Server error calling Gemini' }) };
  }
};
