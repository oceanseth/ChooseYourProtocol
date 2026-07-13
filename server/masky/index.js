// StackMax — Masky integration (server/agent side ONLY).
// Generates avatar images + talking-head clips for SYNTHETIC users.
// The token lives only in this environment; never expose it to a client.
//
// Honesty guardrail: callers MUST pass a record known to be synthetic.
// Every asset returned is tagged provider:'masky', synthetic:true.

const BASE = 'https://masky.ai/api';

function key() {
  const k = process.env.MASKY_API_KEY;
  if (!k) throw new Error('MASKY_API_KEY not set in environment');
  return k;
}

async function mreq(path, method, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Masky ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return json;
}

/**
 * Generate a still avatar image for a synthetic user.
 * @param {object} syntheticUser - must have is_synthetic === true
 * @param {string} prompt - description of the persona's appearance
 */
async function generateSyntheticImage(syntheticUser, prompt) {
  if (!syntheticUser || syntheticUser.is_synthetic !== true) {
    throw new Error('generateSyntheticImage refused: user is not flagged is_synthetic=true');
  }
  const out = await mreq('/images/generate', 'POST', { prompt });
  return { provider: 'masky', synthetic: true, prompt, result: out, generated_at: new Date().toISOString() };
}

/**
 * Create an avatar (image + personality + voice) for a synthetic user.
 */
async function createSyntheticAvatar(syntheticUser, { imageUrl, personality, voice }) {
  if (!syntheticUser || syntheticUser.is_synthetic !== true) {
    throw new Error('createSyntheticAvatar refused: user is not flagged is_synthetic=true');
  }
  const out = await mreq('/avatars', 'POST', { imageUrl, personality, voice });
  return { provider: 'masky', synthetic: true, avatar: out, generated_at: new Date().toISOString() };
}

/**
 * Render a short talking-head clip: start a conversation, inject one speak turn.
 * Returns the embeddable liveUrl (treat as secret).
 */
async function generateSyntheticClip(syntheticUser, { avatarOwnerUserId, avatarId, text }) {
  if (!syntheticUser || syntheticUser.is_synthetic !== true) {
    throw new Error('generateSyntheticClip refused: user is not flagged is_synthetic=true');
  }
  const convo = await mreq('/conversations', 'POST', { avatarOwnerUserId, avatarId });
  await mreq(`/conversations/${convo.conversationId}/turns`, 'POST', { mode: 'speak', text });
  return {
    provider: 'masky',
    synthetic: true,
    conversationId: convo.conversationId,
    liveUrl: convo.liveUrl, // secret
    generated_at: new Date().toISOString()
  };
}

module.exports = { generateSyntheticImage, createSyntheticAvatar, generateSyntheticClip };
