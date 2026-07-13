// StackMax MVP backend — powers "Max", the accountability coach.
// One job: take a fuzzy goal, return a concrete protocol group with metrics + cadence.
// Uses an LLM when a key is available; falls back to deterministic reasoning so the demo never breaks.

const http = require('http');

const PORT = process.env.PORT || 8787;
const LLM_KEY = process.env.KYLON_API_TOKEN || process.env.ANTHROPIC_API_KEY || '';
const LLM_BASE = process.env.KYLON_API_BASE || '';

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
  });
}

const SYSTEM = `You are Max, the accountability coach inside StackMax.
A user tells you a fuzzy goal (e.g. "I want good skin"). You resolve it into ONE concrete, evidence-informed protocol and the metrics that serve as measurable proxies for the goal.
Respond ONLY with strict JSON, no prose, matching:
{
  "goal": "<echo the user's goal, cleaned up>",
  "protocol": { "title": "<concrete repeatable practice>", "description": "<1-2 sentences>", "cadence": "daily|weekly|monthly" },
  "metrics": [
    { "title": "<metric name>", "unit": "<unit>", "cadence": "daily|weekly|monthly", "direction": "lower_better|higher_better|target", "proof_tier": "self_report|photo|device|lab", "proxy_for_goal": true }
  ],
  "group_title": "<short catchy protocol group name>",
  "coach_note": "<1-2 warm sentences from Max on why this works and how you'll keep them accountable>"
}
Rules: 1-4 metrics. Prefer photo or device proof over self-report where sensible. Be specific and realistic.`;

// Deterministic fallback so the phone demo always returns something sensible.
function fallbackResolve(goal) {
  const g = (goal || '').toLowerCase();
  const preset = (title, description, cadence, metrics, groupTitle, note) => ({
    goal: goal || 'My goal',
    protocol: { title, description, cadence },
    metrics,
    group_title: groupTitle,
    coach_note: note
  });

  if (g.includes('skin') || g.includes('face') || g.includes('acne') || g.includes('pimple')) {
    return preset(
      'Warm/cold face immersion + gentle cleanse',
      'Every morning after washing, immerse your face in warm water for 1 minute, then cold water for 1 minute.',
      'daily',
      [
        { title: 'Pimple count', unit: 'count', cadence: 'daily', direction: 'lower_better', proof_tier: 'photo', proxy_for_goal: true },
        { title: 'Perceived age', unit: 'years', cadence: 'monthly', direction: 'lower_better', proof_tier: 'photo', proxy_for_goal: true }
      ],
      'Clear Skin Protocol',
      "Good skin is measurable, not vague. We'll track pimple count daily from a quick photo and check perceived age monthly. I'll nudge you if you miss a morning."
    );
  }
  if (g.includes('strong') || g.includes('muscle') || g.includes('pushup') || g.includes('gym') || g.includes('lift')) {
    return preset(
      '10 pushups a day, progressive',
      'Do at least 10 pushups every day. Add 1 rep each week once the current count feels easy.',
      'daily',
      [
        { title: 'Pushups completed', unit: 'reps', cadence: 'daily', direction: 'higher_better', proof_tier: 'self_report', proxy_for_goal: true },
        { title: 'Max unbroken set', unit: 'reps', cadence: 'weekly', direction: 'higher_better', proof_tier: 'photo', proxy_for_goal: true }
      ],
      'Daily Pushups',
      "Strength compounds from showing up. Log your reps daily; once a week film your max set so the win is provable. Miss a day and I'll be on you."
    );
  }
  if (g.includes('sleep') || g.includes('rest') || g.includes('tired')) {
    return preset(
      'Consistent 7.5h sleep window',
      'Go to bed and wake at the same time daily, targeting 7.5 hours in bed. No screens 30 min before.',
      'daily',
      [
        { title: 'Hours slept', unit: 'hours', cadence: 'daily', direction: 'target', proof_tier: 'device', proxy_for_goal: true },
        { title: 'Bedtime consistency', unit: 'minutes off target', cadence: 'daily', direction: 'lower_better', proof_tier: 'device', proxy_for_goal: true }
      ],
      'Sleep Anchor',
      "Sleep is the highest-leverage protocol there is. We'll pull hours from your watch and track how close you hit your bedtime. Small drift, big consequences."
    );
  }
  if (g.includes('run') || g.includes('cardio') || g.includes('5k') || g.includes('endurance')) {
    return preset(
      '3 runs a week, easy pace',
      'Run 3 times a week at a conversational pace. Keep it easy; consistency beats intensity early.',
      'weekly',
      [
        { title: 'Runs completed', unit: 'runs', cadence: 'weekly', direction: 'higher_better', proof_tier: 'device', proxy_for_goal: true },
        { title: 'Resting heart rate', unit: 'bpm', cadence: 'weekly', direction: 'lower_better', proof_tier: 'device', proxy_for_goal: true }
      ],
      'Base Miles',
      "We build the engine first. Three easy runs a week, synced from your watch, and we'll watch resting heart rate drop as proof it's working."
    );
  }
  // Generic fallback
  return preset(
    'Daily 10-minute focused action',
    'Spend 10 focused minutes each day on the single most important action toward your goal.',
    'daily',
    [
      { title: 'Days completed', unit: 'days', cadence: 'daily', direction: 'higher_better', proof_tier: 'self_report', proxy_for_goal: true }
    ],
    'Daily Momentum',
    "Let's make this concrete and provable. Ten focused minutes a day, logged. Once we see your pattern I'll sharpen the protocol and metrics."
  );
}

async function llmResolve(goal) {
  if (!LLM_KEY || !LLM_BASE) return null;
  try {
    const r = await fetch(`${LLM_BASE}/api/llm/anthropic/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: `My goal: ${goal}` }]
      })
    });
    if (!r.ok) return null;
    const j = await r.json();
    const text = (j.content && j.content[0] && j.content[0].text) || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, llm: Boolean(LLM_KEY && LLM_BASE) });
  }

  if (req.method === 'POST' && req.url === '/resolve') {
    const body = await readBody(req);
    const goal = (body.goal || '').toString().trim();
    if (!goal) return send(res, 400, { error: 'goal is required' });
    const llm = await llmResolve(goal);
    const result = llm || fallbackResolve(goal);
    result.source = llm ? 'llm' : 'fallback';
    return send(res, 200, result);
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`StackMax coach server on http://localhost:${PORT} (llm=${Boolean(LLM_KEY && LLM_BASE)})`);
});
