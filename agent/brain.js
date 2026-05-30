// @chooseyourprotocol/agent — brain.js
//
// The "agentic" layer of the desktop agent, powered by the OpenAI Agents SDK
// (`@openai/agents`). It hosts two small agents:
//
//   1. Knowledge Agent    — synthesizes concise knowledge-base entries from the
//                           buffer of recently captured work-context signals.
//   2. Coordinator Agent  — looks at the org availability snapshot and decides
//                           whether right now is a good moment to schedule a
//                           quick 2-person "level-up" (the modern smoke break).
//
// This module is imported *lazily* by index.js (inside a try/catch) so that a
// missing dependency or a missing OPENAI_API_KEY can never crash the core
// signal loop. Every exported helper builds its agent + tools fresh from the
// passed-in `getToken()` (a function returning a fresh Firebase ID token),
// `apiUrl` and `model`, then runs the agent with `run()`.

import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// --- Small HTTP helper -------------------------------------------------------

/**
 * Read a fetch Response body as text without throwing.
 * @param {Response} res
 * @returns {Promise<string>}
 */
async function safeReadText(res) {
  try {
    return (await res.text()).trim();
  } catch {
    return '';
  }
}

/**
 * POST JSON to an authenticated agent endpoint and return a short status string
 * suitable for a tool result. Never throws — tool failures are reported back to
 * the model as text so it can react gracefully.
 *
 * @param {() => Promise<string>} getToken  Returns a fresh Firebase ID token.
 * @param {string} url                       Fully-qualified endpoint URL.
 * @param {object} body                      JSON request body.
 * @returns {Promise<string>}                Human-readable result string.
 */
async function postJson(getToken, url, body) {
  let token;
  try {
    token = await getToken();
  } catch (err) {
    return `Error obtaining auth token: ${err.message}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await safeReadText(res);
    if (!res.ok) {
      return `Request failed (${res.status}): ${text || '(no body)'}`;
    }
    return `OK (${res.status})${text ? `: ${text}` : ''}`;
  } catch (err) {
    return `Network error: ${err.message}`;
  }
}

// --- Knowledge Agent ---------------------------------------------------------

/**
 * Build the Knowledge Agent and its `save_knowledge_entry` tool.
 *
 * @param {() => Promise<string>} getToken  Returns a fresh Firebase ID token.
 * @param {string} apiUrl                    API base URL (no trailing slash).
 * @param {string} model                     OpenAI model id.
 * @returns {import('@openai/agents').Agent}
 */
export function createKnowledgeAgent(getToken, apiUrl, model) {
  const saveKnowledgeEntry = tool({
    name: 'save_knowledge_entry',
    description:
      'Persist one concise knowledge-base entry about what this person has ' +
      'been working on and the expertise they are demonstrating. Call once per ' +
      'distinct entry you derive.',
    parameters: z.object({
      title: z.string().describe('Short, specific title for the entry.'),
      summary: z
        .string()
        .describe(
          'A concise 1-3 sentence summary of the work / expertise observed.',
        ),
      topics: z
        .array(z.string())
        .describe('A few keyword topics/tags for this entry.'),
      category: z
        .enum(['fitness', 'social', 'business', 'engineering', 'general'])
        .describe('Best-fit category for this entry.'),
    }),
    execute: async ({ title, summary, topics, category }) => {
      return postJson(getToken, `${apiUrl}/api/agent/knowledge`, {
        title,
        summary,
        topics,
        category,
      });
    },
  });

  return new Agent({
    name: 'Knowledge Synthesizer',
    model,
    instructions: [
      'You analyze a buffer of recent work-context signals captured from a',
      "person's desktop (focused app, window title, activity category, time).",
      'Your job is to synthesize a small number of concise knowledge-base',
      'entries describing what this person has been working on and the',
      'expertise they are demonstrating.',
      '',
      'Guidelines:',
      '- Derive only entries that are genuinely supported by the signals.',
      '- Prefer a few high-signal entries over many noisy ones.',
      '- For each distinct entry, call the save_knowledge_entry tool exactly once.',
      '- Choose the most fitting category for each entry.',
      '- If the signals are too sparse or noisy to say anything meaningful,',
      '  save nothing and briefly explain why.',
    ].join('\n'),
    tools: [saveKnowledgeEntry],
  });
}

/**
 * Run the Knowledge Agent over a buffer of recent signals.
 *
 * @param {Array<object>} signalsBuffer  Recent captured signals.
 * @param {() => Promise<string>} getToken
 * @param {string} apiUrl
 * @param {string} model
 * @returns {Promise<string|undefined>}   The agent's final output text.
 */
export async function synthesizeKnowledge(signalsBuffer, getToken, apiUrl, model) {
  if (!signalsBuffer || signalsBuffer.length === 0) {
    return 'No signals buffered yet — nothing to synthesize.';
  }

  const agent = createKnowledgeAgent(getToken, apiUrl, model);

  // Render the buffer as a compact, model-friendly list.
  const lines = signalsBuffer.map((s, i) => {
    const when = s.capturedAt ?? '';
    return `${i + 1}. [${when}] app="${s.app}" title="${s.title}" category=${s.category}`;
  });

  const prompt = [
    'Here are the most recent work-context signals (oldest first):',
    '',
    ...lines,
    '',
    'Synthesize concise knowledge-base entries and save each distinct one',
    'with the save_knowledge_entry tool.',
  ].join('\n');

  const result = await run(agent, prompt);
  return result.finalOutput;
}

// --- Coordinator Agent -------------------------------------------------------

/**
 * Build the Coordinator Agent and its `propose_level_up` tool.
 *
 * @param {() => Promise<string>} getToken
 * @param {string} apiUrl
 * @param {string} model
 * @returns {import('@openai/agents').Agent}
 */
export function createCoordinatorAgent(getToken, apiUrl, model) {
  const proposeLevelUp = tool({
    name: 'propose_level_up',
    description:
      'Propose a quick 2-person "level-up" (a guided micro-break) between two ' +
      'org members who are free right now and share a goal category. The server ' +
      'enforces a cooldown, so it is fine to propose when in doubt.',
    parameters: z.object({
      participantUids: z
        .array(z.string())
        .length(2)
        .describe('Exactly two member uids who should be paired.'),
      category: z
        .string()
        .describe('The shared goal category that motivates the pairing.'),
      topic: z
        .string()
        .describe('A short guided-conversation prompt for the two participants.'),
      reason: z
        .string()
        .describe('Why now is a good moment (the overlap you observed).'),
    }),
    execute: async ({ participantUids, category, topic, reason }) => {
      return postJson(getToken, `${apiUrl}/api/agent/level-up`, {
        participantUids,
        category,
        topic,
        reason,
      });
    },
  });

  return new Agent({
    name: 'Level-Up Coordinator',
    model,
    instructions: [
      'You coordinate quick 2-person "level-ups" — the modern smoke break: a',
      'short, optional, guided micro-break between two coworkers.',
      '',
      'You are given an org availability snapshot. Decide whether RIGHT NOW (or',
      'very soon) is a good moment to pair two people. A good moment is when:',
      '- 2+ members are simultaneously free (status "idle", or "active" with a',
      '  natural break) AND',
      '- they share at least one goal category in their personalGoals.',
      '',
      'When you find a genuine overlap, call propose_level_up with exactly two',
      'uids, the shared category, a short guided-conversation topic, and a brief',
      'reason. You may propose more than one pairing if there are clearly',
      'distinct overlapping pairs.',
      '',
      'If there is NO genuine overlap of free people who share a goal, do',
      'nothing and say so. Do not force a pairing.',
    ].join('\n'),
    tools: [proposeLevelUp],
  });
}

/**
 * Fetch the org availability snapshot and run the Coordinator Agent on it.
 *
 * @param {() => Promise<string>} getToken
 * @param {string} apiUrl
 * @param {string} model
 * @returns {Promise<string|undefined>}  The agent's final output text.
 */
export async function coordinateLevelUp(getToken, apiUrl, model) {
  // Fetch the availability snapshot ourselves (the agent reasons over it).
  const token = await getToken();
  const res = await fetch(`${apiUrl}/api/agent/org-availability`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`org-availability fetch failed (${res.status}): ${detail}`);
  }

  const snapshot = await res.json();
  const members = Array.isArray(snapshot?.members) ? snapshot.members : [];

  if (members.length < 2) {
    return 'Fewer than two members in snapshot — no pairing possible.';
  }

  const agent = createCoordinatorAgent(getToken, apiUrl, model);

  const memberLines = members.map((m) => {
    const goals = Array.isArray(m.personalGoals) ? m.personalGoals.join(', ') : '';
    return (
      `- uid=${m.uid} name="${m.displayName}" status=${m.status} ` +
      `idleSeconds=${m.idleSeconds} lastSeenAt=${m.lastSeenAt} ` +
      `currentFocus="${m.currentFocus}" goals=[${goals}]`
    );
  });

  const prompt = [
    `Org availability snapshot (now = ${snapshot.now ?? 'unknown'}):`,
    '',
    ...memberLines,
    '',
    'Decide whether to propose any level-ups right now. Only propose when there',
    'is a genuine overlap of free people who share a goal category. Otherwise do',
    'nothing.',
  ].join('\n');

  const result = await run(agent, prompt);
  return result.finalOutput;
}
