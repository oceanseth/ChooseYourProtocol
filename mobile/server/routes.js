// Contract v3 endpoints: groups, feed, log, measure, seed, retire.
// index.js delegates any route it doesn't handle here.
const store = require('./store');
const { db, id, now, persist } = store;
const groups = require('./groups');

const SEED_SECRET = process.env.STACKMAX_SEED_SECRET || 'dev-seed-secret';

// Lifecycle rule (Seth's call, defaulted to the team recommendation):
// a group's life depends on its REAL member count; synthetics never keep it alive.
// EXEMPT_SEEDING_WINDOW: a freshly-seeded group with 0 real members is NOT auto-deleted
// while inside its active seeding/outreach window, so outreach can bring the first real user.
// Set STACKMAX_DELETE_SYNTHETIC_ON_SIGHT=1 to delete any synthetic-only group immediately.
const DELETE_ON_SIGHT = process.env.STACKMAX_DELETE_SYNTHETIC_ON_SIGHT === '1';
const SEEDING_WINDOW_MS = parseInt(process.env.STACKMAX_SEEDING_WINDOW_MS || String(14 * 864e5), 10);

function match(url, pattern) {
  // pattern like /groups/:groupId/feed -> returns params or null
  const uPath = url.split('?')[0].split('/').filter(Boolean);
  const pParts = pattern.split('/').filter(Boolean);
  if (uPath.length !== pParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) params[pParts[i].slice(1)] = decodeURIComponent(uPath[i]);
    else if (pParts[i] !== uPath[i]) return null;
  }
  return params;
}
function query(url) {
  const q = url.split('?')[1] || '';
  return Object.fromEntries(new URLSearchParams(q));
}

// Persist a resolved group (called from /resolve path). Returns group id.
function createGroupFromResolve(result, creatorName) {
  const gid = id('pg');
  const metrics = (result.metrics || []).map((m) => ({
    id: id('metric'),
    canonical_key: (m.title || 'metric').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    title: m.title,
    description: m.description || '',
    value_type: m.proof_tier === 'photo' ? 'photo_derived' : 'decimal',
    unit: m.unit || '',
    cadence: m.cadence || 'daily',
    direction: m.direction || 'higher_better',
    proof_tiers: [m.proof_tier || 'self_report'],
    proxy_for_goal: m.proxy_for_goal !== false
  }));
  db.groups[gid] = {
    id: gid,
    title: result.group_title || result.protocol?.title || 'Protocol group',
    protocol: { id: id('proto'), title: result.protocol?.title, cadence: result.protocol?.cadence || 'daily' },
    goal_label: result.goal || '',
    visibility: 'public',
    is_seeded: false,
    created_at: now(),
    metrics
  };
  const mid = id('usr');
  db.members[mid] = {
    id: mid, group_id: gid, display_name: creatorName || 'You',
    role: 'proposer', is_synthetic: false, joined_at: now()
  };
  persist();
  return gid;
}

function realMemberCount(groupId) {
  return Object.values(db.members).filter((m) => m.group_id === groupId && !m.is_synthetic).length;
}

// Tear down a group entirely: delete group, its members (incl. synthetics), entries, feed.
function deleteGroup(groupId) {
  delete db.groups[groupId];
  for (const [mid, m] of Object.entries(db.members)) if (m.group_id === groupId) delete db.members[mid];
  for (const [eid, e] of Object.entries(db.entries)) if (e.group_id === groupId) delete db.entries[eid];
  for (const [fid, f] of Object.entries(db.feed)) if (f.group_id === groupId) delete db.feed[fid];
}

// Apply the all-synthetic lifecycle rule to one group. Returns 'deleted' | 'exempt' | 'alive'.
function applyLifecycle(groupId) {
  const g = db.groups[groupId];
  if (!g) return 'deleted';
  if (realMemberCount(groupId) > 0) return 'alive';
  // synthetic-only from here
  if (!DELETE_ON_SIGHT && g.is_seeded) {
    const createdMs = new Date(g.created_at || 0).getTime();
    const inWindow = Date.now() - createdMs < SEEDING_WINDOW_MS;
    if (inWindow) return 'exempt';   // freshly-seeded, still inside outreach window
  }
  deleteGroup(groupId);
  return 'deleted';
}

// Returns true if it handled the request.
async function handle(req, res, send, readBody) {
  const { url, method } = req;
  let p;

  // GET /groups/:groupId
  if (method === 'GET' && (p = match(url, '/groups/:groupId'))) {
    const q = query(url);
    const detail = groups.groupDetail(p.groupId, q.as || null);
    if (!detail) return send(res, 404, { error: 'group not found', code: 'group_not_found' }), true;
    return send(res, 200, detail), true;
  }

  // GET /groups/:groupId/feed
  if (method === 'GET' && (p = match(url, '/groups/:groupId/feed'))) {
    const q = query(url);
    const limit = Math.min(parseInt(q.limit || '20', 10), 100);
    let feed = groups.feedFor(p.groupId);
    if (q.before) feed = feed.filter((e) => new Date(e.created_at) < new Date(q.before));
    const page = feed.slice(0, limit);
    const next = feed.length > limit ? page[page.length - 1].created_at : null;
    return send(res, 200, { events: page, next_before: next }), true;
  }

  // POST /groups/:groupId/log
  if (method === 'POST' && (p = match(url, '/groups/:groupId/log'))) {
    const body = await readBody(req);
    if (body.is_synthetic === true) return send(res, 403, { error: 'clients cannot create synthetic entries', code: 'synthetic_forbidden' }), true;
    const g = db.groups[p.groupId];
    if (!g) return send(res, 404, { error: 'group not found', code: 'group_not_found' }), true;
    const metric = g.metrics.find((m) => m.id === body.metric_id);
    if (!metric) return send(res, 400, { error: 'unknown metric_id', code: 'unknown_metric' }), true;
    const me = Object.values(db.members).find((m) => m.group_id === p.groupId && !m.is_synthetic);
    if (!me) return send(res, 400, { error: 'no member to log for', code: 'no_member' }), true;
    const eid = id('pe');
    db.entries[eid] = {
      id: eid, member_id: me.id, group_id: p.groupId, metric_id: metric.id,
      value: body.value, proof_tier: body.proof_tier || 'self_report',
      is_synthetic: false, note: body.note || null, timestamp: now()
    };
    persist();
    const streak = groups.computeStreak(me.id, metric);
    let milestone = null;
    if (streak.current > 0 && streak.current % 7 === 0) {
      milestone = { type: 'streak', summary: `${streak.current}-day streak!` };
      const fid = id('evt');
      db.feed[fid] = { id: fid, group_id: p.groupId, type: 'streak',
        actor: { user_id: me.id, display_name: me.display_name, is_synthetic: false },
        metric_id: metric.id, summary: milestone.summary, proof_tier: db.entries[eid].proof_tier, action: null, created_at: now() };
      persist();
    }
    return send(res, 200, { entry: db.entries[eid], streak, milestone }), true;
  }

  // POST /groups/:groupId/measure  (JSON reuse path: {metric_id, image_ref})
  // NOTE: multipart default path handled in index.js where raw body is available.
  if (method === 'POST' && (p = match(url, '/groups/:groupId/measure'))) {
    const body = await readBody(req);
    return handleMeasure(p.groupId, body.metric_id, body.image_ref, null, send, res), true;
  }

  // POST /groups/:groupId/seed  (admin-only)
  if (method === 'POST' && (p = match(url, '/groups/:groupId/seed'))) {
    if ((req.headers['x-seed-secret'] || '') !== SEED_SECRET)
      return send(res, 401, { error: 'seed requires admin secret', code: 'seed_unauthorized' }), true;
    const body = await readBody(req);
    const g = db.groups[p.groupId];
    if (!g) return send(res, 404, { error: 'group not found', code: 'group_not_found' }), true;
    let seeded_members = 0, seeded_entries = 0;
    for (const m of (body.members || [])) {
      const mid = id('usr');
      db.members[mid] = {
        id: mid, group_id: p.groupId, display_name: m.display_name,
        avatar_url: m.avatar_url || null, role: m.role || 'member',
        is_synthetic: true, is_seeded: true, provenance: m.provenance || null, joined_at: now()
      };
      seeded_members++;
      for (const e of (m.entries || [])) {
        const eid = id('pe');
        db.entries[eid] = { id: eid, member_id: mid, group_id: p.groupId, metric_id: e.metric_id,
          value: e.value, proof_tier: e.proof_tier || 'self_report', is_synthetic: true, timestamp: e.timestamp || now() };
        seeded_entries++;
      }
      for (const f of (m.feed_events || [])) {
        const fid = id('evt');
        db.feed[fid] = { id: fid, group_id: p.groupId, type: f.type || 'win',
          actor: { user_id: mid, display_name: m.display_name, is_synthetic: true },
          metric_id: f.metric_id || null, summary: f.summary || '', proof_tier: f.proof_tier || 'self_report',
          action: null, created_at: f.created_at || now() };
      }
    }
    g.is_seeded = true;
    persist();
    const members = Object.values(db.members).filter((m) => m.group_id === p.groupId);
    return send(res, 200, { seeded_members, seeded_entries,
      group: { member_count: members.length, synthetic_count: members.filter((m) => m.is_synthetic).length, is_seeded: true } }), true;
  }

  // POST /groups/:groupId/leave — remove the caller from the group's real members.
  // If that leaves the group synthetic-only, apply the lifecycle rule (may delete the group).
  if (method === 'POST' && (p = match(url, '/groups/:groupId/leave'))) {
    const body = await readBody(req);
    const g = db.groups[p.groupId];
    if (!g) return send(res, 404, { error: 'group not found', code: 'group_not_found' }), true;
    // Resolve the caller: explicit user_id, else the group's (single) real member for demo.
    let caller = body.user_id
      ? db.members[body.user_id]
      : Object.values(db.members).find((m) => m.group_id === p.groupId && !m.is_synthetic);
    if (!caller || caller.group_id !== p.groupId || caller.is_synthetic)
      return send(res, 400, { error: 'caller is not a real member of this group', code: 'not_a_member' }), true;
    const wasLastReal = realMemberCount(p.groupId) <= 1;
    // remove the caller + their entries + their feed events
    delete db.members[caller.id];
    for (const [eid, e] of Object.entries(db.entries)) if (e.member_id === caller.id) delete db.entries[eid];
    for (const [fid, f] of Object.entries(db.feed)) if (f.actor && f.actor.user_id === caller.id) delete db.feed[fid];
    const outcome = applyLifecycle(p.groupId);
    persist();
    return send(res, 200, {
      left: true,
      was_last_real_member: wasLastReal,
      group_outcome: outcome   // 'deleted' | 'exempt' | 'alive'
    }), true;
  }

  // POST /groups/:groupId/retire-synthetics (admin-only)
  if (method === 'POST' && (p = match(url, '/groups/:groupId/retire-synthetics'))) {
    if ((req.headers['x-seed-secret'] || '') !== SEED_SECRET)
      return send(res, 401, { error: 'admin secret required', code: 'seed_unauthorized' }), true;
    let retired = 0;
    for (const [mid, m] of Object.entries(db.members)) {
      if (m.group_id === p.groupId && m.is_synthetic) {
        delete db.members[mid]; retired++;
        for (const [eid, e] of Object.entries(db.entries)) if (e.member_id === mid) delete db.entries[eid];
        for (const [fid, f] of Object.entries(db.feed)) if (f.actor && f.actor.user_id === mid) delete db.feed[fid];
      }
    }
    if (db.groups[p.groupId]) db.groups[p.groupId].is_seeded = false;
    persist();
    return send(res, 200, { retired }), true;
  }

  return false;
}

// Shared measure logic (used by JSON reuse path + multipart path in index.js).
function handleMeasure(groupId, metricId, imageRef, visionResult, send, res) {
  const g = db.groups[groupId];
  if (!g) return send(res, 404, { error: 'group not found', code: 'group_not_found' });
  const metric = g.metrics.find((m) => m.id === metricId);
  if (!metric) return send(res, 400, { error: 'unknown metric_id', code: 'unknown_metric' });
  const me = Object.values(db.members).find((m) => m.group_id === groupId && !m.is_synthetic);
  if (!me) return send(res, 400, { error: 'no member', code: 'no_member' });
  // visionResult is injected by the vision pipeline; stub deterministic value if absent (pre-wiring).
  const value = visionResult ? visionResult.value : 3;
  const confidence = visionResult ? visionResult.confidence : 0.5;
  const eid = id('pe');
  db.entries[eid] = { id: eid, member_id: me.id, group_id: groupId, metric_id: metricId,
    value, proof_tier: 'photo', is_synthetic: false, image_ref: imageRef || null, timestamp: now() };
  persist();
  return send(res, 200, {
    metric_id: metricId, value, proof_tier: 'photo', confidence,
    image_ref: imageRef || null, measured_at: now(), entry_id: eid,
    detail: visionResult ? visionResult.detail : { model: 'stub', notes: 'vision not yet wired' }
  });
}

module.exports = { handle, createGroupFromResolve, handleMeasure };
