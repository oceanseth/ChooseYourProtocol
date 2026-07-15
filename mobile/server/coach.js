// StackMax managing-agent surfaces — vision (/measure) + the check-in loop.
// Two audiences, one delivery loop: `audience:'group'` posts to the shared feed
// (the "announce user wins" surface); `audience:'user'` is the private 1:1 lane.
// Event types on the write path: check_in (transient nudge) and win (durable,
// celebrated achievement). Both carry `audience`. Honesty flags are unchanged:
// agent-authored events are actor.is_synthetic:false (the agent is not a fake user;
// it is the group's managing agent, marked is_agent:true).
const store = require('./store');
const { db, id, now, persist } = store;
const groups = require('./groups');

const LLM_KEY = process.env.KYLON_API_TOKEN || process.env.ANTHROPIC_API_KEY || '';
const LLM_BASE = process.env.KYLON_API_BASE || '';

// ---- Real vision for /measure (contract §3.4) ----
// Returns { value, confidence, detail } or null if vision unavailable / low-confidence.
async function measureVision(metric, imageRef, imageBase64) {
  if (!LLM_KEY || !LLM_BASE) return null;
  const key = (metric.canonical_key || metric.title || '').toLowerCase();
  let ask;
  if (key.includes('pimple') || key.includes('acne') || key.includes('blemish')) {
    ask = 'Count the visible pimples/blemishes on the face in this photo. Return only the integer count.';
  } else if (key.includes('age') || key.includes('perceived')) {
    ask = 'Estimate the perceived skin age (in years) of the face in this photo based on visible skin condition. Return only the integer years.';
  } else {
    ask = `Read the value for "${metric.title}" (${metric.unit || 'number'}) shown in this photo. Return only the number.`;
  }
  const system = `You are the StackMax vision measurer. You output STRICT JSON only:
{"value": <number>, "confidence": <0..1>, "notes": "<one short sentence>"}
If the image is unclear, too dark, or does not show the subject, set confidence <= 0.4 and value null.`;
  try {
    const content = [{ type: 'text', text: ask }];
    if (imageBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } });
    } else if (imageRef) {
      content.push({ type: 'text', text: `Image URL: ${imageRef}` });
    }
    const r = await fetch(`${LLM_BASE}/api/llm/anthropic/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content }]
      })
    });
    if (!r.ok) return null;
    const j = await r.json();
    const text = (j.content && j.content[0] && j.content[0].text) || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (parsed.value == null || (parsed.confidence != null && parsed.confidence <= 0.4)) {
      return { value: null, confidence: parsed.confidence ?? 0.3, detail: { model: 'claude-sonnet-4', low_confidence: true, notes: parsed.notes || 'unclear image' } };
    }
    return { value: Number(parsed.value), confidence: parsed.confidence ?? 0.8, detail: { model: 'claude-sonnet-4', notes: parsed.notes || '' } };
  } catch {
    return null;
  }
}

// ---- Managing-agent check-in loop (contract §5) ----
// Emits a check_in or win event to a chosen audience.
// audience: 'group' (shared feed) | 'user' (1:1 lane for a specific member).
// type: 'check_in' (nudge/prompt, carries action hint) | 'win' (celebration).
function emitAgentEvent(groupId, { type, audience, summary, metric_id, action, target_member_id, proof_tier }) {
  const g = db.groups[groupId];
  if (!g) return { error: 'group not found', code: 'group_not_found', status: 404 };
  const evType = type === 'win' ? 'win' : 'check_in';
  const aud = audience === 'user' ? 'user' : 'group';
  if (aud === 'user' && !target_member_id) {
    return { error: '1:1 (audience=user) requires target_member_id', code: 'missing_target', status: 400 };
  }
  const fid = id('evt');
  db.feed[fid] = {
    id: fid,
    group_id: groupId,
    type: evType,
    audience: aud,
    target_member_id: aud === 'user' ? target_member_id : null,
    actor: { user_id: 'agent:' + groupId, display_name: g.title + ' Coach', is_synthetic: false, is_agent: true },
    metric_id: metric_id || null,
    summary: summary || '',
    proof_tier: proof_tier || null,
    action: evType === 'check_in' ? (action || null) : null,
    created_at: now()
  };
  persist();
  return { event: db.feed[fid], status: 200 };
}

// Auto-detect a celebratable win for a member from their real trajectory on a metric.
// Used by the loop to turn a measured improvement / streak milestone into a `win`.
function detectWin(groupId, memberId, metric) {
  const entries = Object.values(db.entries)
    .filter((e) => e.member_id === memberId && e.metric_id === metric.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (entries.length < 2) return null;
  const first = entries[0].value, last = entries[entries.length - 1].value;
  const member = db.members[memberId];
  const name = member ? member.display_name : 'A member';
  if (metric.direction === 'lower_better' && last < first) {
    return `${name}: ${metric.title} down from ${first} to ${last}.`;
  }
  if (metric.direction === 'higher_better' && last > first) {
    return `${name}: ${metric.title} up from ${first} to ${last}.`;
  }
  const streak = groups.computeStreak(memberId, metric);
  if (streak.current >= 7) return `${name}: ${streak.current}-${streak.unit} streak on ${metric.title}.`;
  return null;
}

module.exports = { measureVision, emitAgentEvent, detectWin };
