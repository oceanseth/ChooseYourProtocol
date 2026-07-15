import Constants from 'expo-constants';
import { Platform } from 'react-native';

// When running on a physical phone via Expo Go, "localhost" points at the phone,
// not your computer. We derive the dev machine's LAN IP from the Expo host.
function resolveBaseUrl() {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8787';

  // Try to reuse the Metro/Expo host LAN IP so the phone can reach the laptop.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';
  const host = hostUri.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8787`;
  }
  // Android emulator special-cases localhost.
  if (Platform.OS === 'android' && (configured.includes('localhost') || configured.includes('127.0.0.1'))) {
    return 'http://10.0.2.2:8787';
  }
  return configured;
}

export const API_BASE = resolveBaseUrl();

export async function resolveGoal(goal) {
  const res = await fetch(`${API_BASE}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  });
  if (!res.ok) throw new Error(`Coach error (${res.status})`);
  return res.json();
}

// ---------------------------------------------------------------------------
// StackMax v1 group / measurement API (contract v3).
// USE_FIXTURES lets the UX be real before SeniorDev's endpoints land on dev.
// Flip to false (or set expo extra.useLiveApi) and every screen renders live
// data with zero screen changes — the shapes are identical.
// ---------------------------------------------------------------------------
import { FIXTURE_GROUP, fixtureMeasure } from '../fixtures/group';

export const USE_FIXTURES =
  Constants.expoConfig?.extra?.useLiveApi ? false : true;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// GET /groups/:groupId  (§3.1)
export async function getGroup(groupId) {
  if (USE_FIXTURES) {
    await wait(250);
    return FIXTURE_GROUP;
  }
  const res = await fetch(`${API_BASE}/groups/${groupId}`);
  if (!res.ok) throw new Error(`Group error (${res.status})`);
  return res.json();
}

// GET /groups/:groupId/feed  (§3.2, v3.2: ?audience=group|user & ?as=<memberId>)
// SURFACE RULE: render by `audience`, never by event `type`. Shared feed = group;
// 1:1 coach lane = user (scoped to the current member). The privacy boundary is
// structural — a `user` event cannot come back from an `audience=group` query.
export async function getFeed(groupId, { before, audience = 'group', as } = {}) {
  if (USE_FIXTURES) {
    await wait(180);
    return { events: [], next_before: null }; // fixture inlines the first page in group detail
  }
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (audience) params.set('audience', audience);
  if (as) params.set('as', as);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/groups/${groupId}/feed${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`Feed error (${res.status})`);
  return res.json();
}

// The 1:1 coach lane for the current member (audience:user, scoped by `as`).
export async function getCoachLane(groupId, memberId) {
  if (USE_FIXTURES) {
    await wait(220);
    const { FIXTURE_COACH_LANE } = require('../fixtures/group');
    return { events: FIXTURE_COACH_LANE, next_before: null };
  }
  return getFeed(groupId, { audience: 'user', as: memberId });
}

// POST /groups/:groupId/measure — one multipart call by default (§3.4)
// imageUri: a local file:// uri from the camera/picker. metricId: which metric.
export async function measure(groupId, metricId, imageUri) {
  if (USE_FIXTURES) {
    await wait(1400); // let the "measuring…" state breathe, like a real vision call
    return fixtureMeasure(metricId);
  }
  const form = new FormData();
  form.append('metric_id', metricId);
  form.append('image', {
    uri: imageUri,
    name: 'capture.jpg',
    type: 'image/jpeg'
  });
  const res = await fetch(`${API_BASE}/groups/${groupId}/measure`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error(`Measure error (${res.status})`);
  return res.json();
}

// POST /groups/:groupId/log — manual self-report (§3.3)
export async function logMetric(groupId, metricId, value, proofTier = 'self_report', note) {
  if (USE_FIXTURES) {
    await wait(400);
    return { entry: { id: 'pe_fixture', metric_id: metricId, value, proof_tier: proofTier, timestamp: new Date().toISOString() },
             streak: { current: 13, best: 21, unit: 'days' }, milestone: null };
  }
  const res = await fetch(`${API_BASE}/groups/${groupId}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric_id: metricId, value, proof_tier: proofTier, note })
  });
  if (!res.ok) throw new Error(`Log error (${res.status})`);
  return res.json();
}

// POST /groups/:groupId/leave — remove the caller (§3.7).
// Returns { left, was_last_real_member, group_outcome: 'alive'|'deleted'|'exempt' }.
export async function leaveGroup(groupId, userId) {
  if (USE_FIXTURES) {
    await wait(400);
    return { left: true, was_last_real_member: true, group_outcome: 'deleted' };
  }
  const res = await fetch(`${API_BASE}/groups/${groupId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userId ? { user_id: userId } : {})
  });
  if (!res.ok) throw new Error(`Leave error (${res.status})`);
  return res.json();
}
