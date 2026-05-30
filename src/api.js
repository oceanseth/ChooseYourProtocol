// Thin client for the ChooseYourProtocol server API (AWS Lambda).
import { config } from './config.js';
import { getIdToken } from './firebase.js';

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${config.api.baseUrl}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Create/join the caller's organization based on their email domain and
  // return their member profile. Sets orgId/role custom claims server-side.
  bootstrap: () => call('/auth/bootstrap', { method: 'POST' }),

  // Mark an activity session complete: server scores the conversation vibe,
  // mints a creature into each participant's collection, and writes a
  // knowledge-base source. Idempotent per session.
  completeSession: (orgId, sessionId) =>
    call('/sessions/complete', { method: 'POST', body: { orgId, sessionId } }),

  health: () => call('/health', { auth: false })
};
