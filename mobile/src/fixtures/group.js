// StackMax UX fixtures — shaped EXACTLY to API contract v3 (LOCKED).
// Every field here maps to GET /groups/:id (§3.1), members (§2.1), metrics (§2.2),
// feed events (§2.3) incl. actionable check_ins, metrics_state, feed_next_before.
// This lets the screens be real and reviewable before live endpoints land on dev.
// When SeniorDev's GET /groups/:id is up, api.js swaps this out with zero screen changes.

export const FIXTURE_GROUP = {
  id: 'pg_skin_warmcold',
  title: 'Warm/Cold Face Reset',
  protocol: {
    id: 'proto_warmcold_face',
    title: 'Warm then cold face immersion, 1 min each, every morning',
    cadence: 'daily'
  },
  goal_label: 'good skin',
  visibility: 'public',
  is_seeded: true,
  metrics: [
    {
      id: 'metric_pimple_count',
      canonical_key: 'pimple_count',
      title: 'Pimple count',
      description: 'Visible active blemishes, full face.',
      value_type: 'photo_derived',
      unit: 'count',
      cadence: 'daily',
      direction: 'lower_better',
      proof_tiers: ['self_report', 'photo'],
      proxy_for_goal: true
    },
    {
      id: 'metric_perceived_age',
      canonical_key: 'perceived_age',
      title: 'Perceived age',
      description: 'Model-estimated skin age from a clear face photo.',
      value_type: 'integer',
      unit: 'years',
      cadence: 'monthly',
      direction: 'lower_better',
      proof_tiers: ['photo'],
      proxy_for_goal: true
    }
  ],
  members: [
    { user_id: 'usr_dana', display_name: 'Dana R.', avatar_url: null, role: 'proposer', is_synthetic: false,
      streak: { current: 21, best: 21, unit: 'days', logged_today: true, last_logged_at: '2026-07-13T09:00:00Z' }, joined_at: '2026-07-01T00:00:00Z' },
    { user_id: 'usr_you', display_name: 'You', avatar_url: null, role: 'member', is_synthetic: false,
      streak: { current: 12, best: 12, unit: 'days', logged_today: false, last_logged_at: '2026-07-12T09:10:00Z' }, joined_at: '2026-07-02T00:00:00Z' },
    { user_id: 'usr_marcus', display_name: 'Marcus T.', avatar_url: null, role: 'moderator', is_synthetic: true,
      streak: { current: 34, best: 34, unit: 'days', logged_today: true, last_logged_at: '2026-07-13T07:30:00Z' }, joined_at: '2026-06-10T00:00:00Z' },
    { user_id: 'usr_aria', display_name: 'Aria L.', avatar_url: null, role: 'member', is_synthetic: true,
      streak: { current: 9, best: 15, unit: 'days', logged_today: true, last_logged_at: '2026-07-13T08:05:00Z' }, joined_at: '2026-06-20T00:00:00Z' },
    { user_id: 'usr_jae', display_name: 'Jae P.', avatar_url: null, role: 'member', is_synthetic: true,
      streak: { current: 18, best: 18, unit: 'days', logged_today: false, last_logged_at: '2026-07-12T09:00:00Z' }, joined_at: '2026-06-18T00:00:00Z' },
    { user_id: 'usr_nova', display_name: 'Nova K.', avatar_url: null, role: 'member', is_synthetic: true,
      streak: { current: 6, best: 11, unit: 'days', logged_today: true, last_logged_at: '2026-07-13T06:50:00Z' }, joined_at: '2026-06-25T00:00:00Z' },
    { user_id: 'usr_sam', display_name: 'Sam D.', avatar_url: null, role: 'member', is_synthetic: true,
      streak: { current: 27, best: 27, unit: 'days', logged_today: true, last_logged_at: '2026-07-13T07:00:00Z' }, joined_at: '2026-06-12T00:00:00Z' },
    { user_id: 'usr_rae', display_name: 'Rae M.', avatar_url: null, role: 'member', is_synthetic: true,
      streak: { current: 14, best: 19, unit: 'days', logged_today: false, last_logged_at: '2026-07-12T09:00:00Z' }, joined_at: '2026-06-22T00:00:00Z' }
  ],
  member_count: 8,
  synthetic_count: 6,
  real_member_count: 2,
  metrics_state: [
    { metric_id: 'metric_pimple_count', logged_today: false, last_logged_at: '2026-07-12T09:10:00Z', current_value: 5 },
    { metric_id: 'metric_perceived_age', logged_today: true, last_logged_at: '2026-07-01T09:00:00Z', current_value: 29 }
  ],
  // Shared group feed — audience:group ONLY. Wins/streaks/milestones + coach announces.
  // (A private nudge lives in FIXTURE_COACH_LANE below, never here.)
  feed: [
    { id: 'evt_9', type: 'win', audience: 'group', target_member_id: null,
      actor: { user_id: 'usr_dana', display_name: 'Dana R.', is_synthetic: false, is_agent: false },
      metric_id: 'metric_pimple_count', summary: 'Pimple count down to 3 - a 7-day low.', proof_tier: 'photo', action: null, created_at: '2026-07-13T09:02:00Z' },
    { id: 'evt_coach1', type: 'win', audience: 'group', target_member_id: null,
      actor: { user_id: 'agent:pg_skin_warmcold', display_name: 'Warm/Cold Face Reset Coach', is_synthetic: false, is_agent: true },
      metric_id: 'metric_pimple_count', summary: 'Dana just hit a 7-day low - the group best this week.', proof_tier: null, action: null, created_at: '2026-07-13T09:03:00Z' },
    { id: 'evt_8', type: 'streak', audience: 'group', target_member_id: null,
      actor: { user_id: 'usr_sam', display_name: 'Sam D.', is_synthetic: true, is_agent: false },
      metric_id: 'metric_pimple_count', summary: 'Hit a 27-day streak.', proof_tier: null, action: null, created_at: '2026-07-13T07:05:00Z' },
    { id: 'evt_7', type: 'milestone', audience: 'group', target_member_id: null,
      actor: { user_id: 'usr_aria', display_name: 'Aria L.', is_synthetic: true, is_agent: false },
      metric_id: 'metric_perceived_age', summary: 'Perceived age estimate dropped 2 yrs this month.', proof_tier: 'photo', action: null, created_at: '2026-07-01T10:00:00Z' },
    { id: 'evt_6', type: 'win', audience: 'group', target_member_id: null,
      actor: { user_id: 'usr_marcus', display_name: 'Marcus T.', is_synthetic: true, is_agent: false },
      metric_id: 'metric_pimple_count', summary: 'Logged today reset.', proof_tier: 'self_report', action: null, created_at: '2026-07-13T07:35:00Z' },
    { id: 'evt_5', type: 'win', audience: 'group', target_member_id: null,
      actor: { user_id: 'usr_nova', display_name: 'Nova K.', is_synthetic: true, is_agent: false },
      metric_id: 'metric_pimple_count', summary: 'Pimple count 4 - steady week.', proof_tier: 'photo', action: null, created_at: '2026-07-13T06:55:00Z' }
  ],
  feed_next_before: 'cursor_evt_5'
};

// The 1:1 coach lane - audience:user, scoped to the current member ("You").
// Actionable nudges live here (private by nature); rendered as a conversation, not a feed.
export const FIXTURE_COACH_LANE = [
  { id: 'evt_c1', type: 'check_in', audience: 'user', target_member_id: 'usr_you',
    actor: { user_id: 'agent:pg_skin_warmcold', display_name: 'Warm/Cold Face Reset Coach', is_synthetic: false, is_agent: true },
    metric_id: 'metric_pimple_count', summary: "Morning - haven't seen today's photo yet. 20 seconds and your 12-day streak stays alive.",
    proof_tier: null, action: { kind: 'capture', label: "Take today's photo" }, created_at: '2026-07-13T08:00:00Z' },
  { id: 'evt_c2', type: 'win', audience: 'user', target_member_id: 'usr_you',
    actor: { user_id: 'agent:pg_skin_warmcold', display_name: 'Warm/Cold Face Reset Coach', is_synthetic: false, is_agent: true },
    metric_id: 'metric_pimple_count', summary: 'Quiet win: your pimple count is down from 8 to 5 over the last week. Keep going.',
    proof_tier: null, action: null, created_at: '2026-07-12T08:05:00Z' }
];

// A measure() response shaped to §3.4 — used by the fixture-mode capture flow.
export function fixtureMeasure(metricId) {
  const isAge = metricId === 'metric_perceived_age';
  return {
    metric_id: metricId,
    value: isAge ? 28 : 3,
    proof_tier: 'photo',
    confidence: isAge ? 0.71 : 0.84,
    image_ref: 'img_fixture',
    measured_at: new Date().toISOString(),
    entry_id: 'pe_fixture',
    detail: { model: 'vision', notes: isAge ? 'Estimated skin age 28' : '3 active blemishes detected' }
  };
}
