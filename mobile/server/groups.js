// Group domain logic + the contract v3 shapes. Pure functions over the store.
const store = require('./store');
const { db } = store;

// ---- streak computation (§2.1) ----
function cadenceWindowMs(cadence) {
  return { daily: 864e5, weekly: 7 * 864e5, monthly: 30 * 864e5, ad_hoc: 864e5 }[cadence] || 864e5;
}

// Compute streak + now-state for a member on a given metric's cadence.
function computeStreak(memberId, metric) {
  const win = cadenceWindowMs(metric.cadence);
  const entries = Object.values(db.entries)
    .filter((e) => e.member_id === memberId && e.metric_id === metric.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (entries.length === 0) {
    return { current: 0, best: 0, unit: unitFor(metric.cadence), logged_today: false, last_logged_at: null };
  }
  const last = entries[entries.length - 1];
  const lastMs = new Date(last.timestamp).getTime();
  const logged_today = Date.now() - lastMs < win;

  // Count consecutive windows backwards from the last entry.
  let current = 1, best = 1, run = 1;
  for (let i = entries.length - 1; i > 0; i--) {
    const gap = new Date(entries[i].timestamp) - new Date(entries[i - 1].timestamp);
    if (gap <= win * 1.5) { run++; best = Math.max(best, run); }
    else { run = 1; }
  }
  // current run = consecutive windows ending at the most recent entry
  current = 1;
  for (let i = entries.length - 1; i > 0; i--) {
    const gap = new Date(entries[i].timestamp) - new Date(entries[i - 1].timestamp);
    if (gap <= win * 1.5) current++; else break;
  }
  best = Math.max(best, current);
  // If the current window has already lapsed without a new entry, the streak is at-risk but not yet broken until >window.
  if (Date.now() - lastMs > win * 1.5) current = 0;
  return { current, best, unit: unitFor(metric.cadence), logged_today, last_logged_at: last.timestamp };
}

function unitFor(cadence) {
  return { daily: 'days', weekly: 'weeks', monthly: 'months', ad_hoc: 'entries' }[cadence] || 'days';
}

function memberView(m, metrics) {
  // headline streak = the daily (or first) metric's streak
  const headline = metrics.find((x) => x.cadence === 'daily') || metrics[0];
  const streak = headline ? computeStreak(m.id, headline) : { current: 0, best: 0, unit: 'days', logged_today: false, last_logged_at: null };
  return {
    user_id: m.id,
    display_name: m.display_name,
    avatar_url: m.avatar_url || null,
    role: m.role || 'member',
    is_synthetic: !!m.is_synthetic,
    streak,
    joined_at: m.joined_at
  };
}

function metricsStateForMember(memberId, metrics) {
  return metrics.map((metric) => {
    const s = computeStreak(memberId, metric);
    const entries = Object.values(db.entries)
      .filter((e) => e.member_id === memberId && e.metric_id === metric.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      metric_id: metric.id,
      logged_today: s.logged_today,
      last_logged_at: s.last_logged_at,
      current_value: entries[0] ? entries[0].value : null
    };
  });
}

function feedFor(groupId, opts) {
  const o = opts || {};
  let items = Object.values(db.feed).filter((e) => e.group_id === groupId);
  if (o.audience === 'group') {
    items = items.filter((e) => (e.audience || 'group') === 'group');
  } else if (o.audience === 'user') {
    // The 1:1 lane for a specific member: their private events only.
    items = items.filter((e) => (e.audience === 'user') && (!o.memberId || e.target_member_id === o.memberId));
  }
  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ---- public builders ----
function groupDetail(groupId, currentMemberId) {
  const g = db.groups[groupId];
  if (!g) return null;
  const metrics = g.metrics;
  const members = Object.values(db.members)
    .filter((m) => m.group_id === groupId)
    .sort((a, b) => (a.role === 'proposer' ? -1 : 0) - (b.role === 'proposer' ? -1 : 0));
  const synthetic_count = members.filter((m) => m.is_synthetic).length;
  const real_member_count = members.length - synthetic_count;
  const feed = feedFor(groupId, { audience: 'group' });
  const first = feed.slice(0, 10);
  const feed_next_before = feed.length > 10 ? feed[9].created_at : null;
  const me = currentMemberId || (members.find((m) => !m.is_synthetic) || {}).id;
  return {
    id: g.id,
    title: g.title,
    protocol: g.protocol,
    goal_label: g.goal_label,
    visibility: g.visibility || 'public',
    is_seeded: !!g.is_seeded,
    metrics,
    members: members.map((m) => memberView(m, metrics)),
    member_count: members.length,
    synthetic_count,
    real_member_count,
    metrics_state: me ? metricsStateForMember(me, metrics) : [],
    feed: first,
    feed_next_before
  };
}

module.exports = { computeStreak, memberView, metricsStateForMember, feedFor, groupDetail, cadenceWindowMs };
