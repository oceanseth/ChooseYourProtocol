#!/usr/bin/env node
// @chooseyourprotocol/agent
//
// Minimal cross-platform desktop agent for ChooseYourProtocol.
//
// It periodically captures a lightweight "work context" signal (focused app,
// a coarse activity category, idle time) and POSTs it to the ChooseYourProtocol
// API. The server uses these signals to feed knowledge-base context and to
// decide when to fire a "level-up opportunity" alert (the modern smoke break).
//
// MVP skeleton: Node built-ins only, no native compilation, runs with
// `node index.js` on Node 20+ (global fetch required).

import { exec } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import os from 'node:os';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Constants ---------------------------------------------------------------

// Firebase web API key for the chooseyourprotocol project. This is a public
// client key (safe to ship); it only gates which Firebase project we talk to.
const FIREBASE_API_KEY = 'AIzaSyBIEI6RLWvtoDuMWbMtzkjq3lEnywKheWo';

const SIGN_IN_URL =
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
const REFRESH_URL =
  `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;

const DEFAULT_API_URL = 'https://chooseyourprotocol.com';
const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_KNOWLEDGE_INTERVAL_CYCLES = 5;
const DEFAULT_COORDINATOR_INTERVAL_CYCLES = 5;

// Cap on how many recent signals we keep buffered for the Knowledge Agent.
const SIGNAL_BUFFER_CAP = 50;

// Refresh the ID token this many seconds before it actually expires, so we
// never POST with a token that's about to die mid-request.
const TOKEN_REFRESH_SKEW_SECONDS = 60;

// --- Configuration -----------------------------------------------------------

/**
 * Load config from agent.config.json (if present) then overlay env vars.
 * Env vars always take precedence over the file.
 *
 * @returns {{
 *   email?: string,
 *   password?: string,
 *   apiUrl: string,
 *   intervalSeconds: number,
 *   openaiApiKey?: string,
 *   model: string,
 *   knowledgeIntervalCycles: number,
 *   coordinatorIntervalCycles: number,
 * }}
 */
function loadConfig() {
  let fileConfig = {};
  const configPath = join(__dirname, 'agent.config.json');
  try {
    fileConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    // No local config file (or unreadable / invalid) — that's fine, we'll
    // rely on environment variables instead.
  }

  const email = process.env.CYP_EMAIL ?? fileConfig.email;
  const password = process.env.CYP_PASSWORD ?? fileConfig.password;
  const apiUrl = process.env.CYP_API_URL ?? fileConfig.apiUrl ?? DEFAULT_API_URL;

  const intervalSeconds = Number(
    process.env.CYP_INTERVAL_SECONDS ??
      fileConfig.intervalSeconds ??
      DEFAULT_INTERVAL_SECONDS,
  );

  // OpenAI Agents SDK reads OPENAI_API_KEY from the env; we also accept it from
  // the config file (and export it back into the env if only the file has it).
  const openaiApiKey = process.env.OPENAI_API_KEY ?? fileConfig.openaiApiKey;
  const model = process.env.CYP_MODEL ?? fileConfig.model ?? DEFAULT_MODEL;

  const knowledgeIntervalCycles = Number(
    process.env.CYP_KNOWLEDGE_INTERVAL_CYCLES ??
      fileConfig.knowledgeIntervalCycles ??
      DEFAULT_KNOWLEDGE_INTERVAL_CYCLES,
  );
  const coordinatorIntervalCycles = Number(
    process.env.CYP_COORDINATOR_INTERVAL_CYCLES ??
      fileConfig.coordinatorIntervalCycles ??
      DEFAULT_COORDINATOR_INTERVAL_CYCLES,
  );

  const positiveOr = (n, fallback) =>
    Number.isFinite(n) && n > 0 ? n : fallback;

  return {
    email,
    password,
    apiUrl: apiUrl.replace(/\/+$/, ''), // strip trailing slash(es)
    intervalSeconds: positiveOr(intervalSeconds, DEFAULT_INTERVAL_SECONDS),
    openaiApiKey,
    model,
    knowledgeIntervalCycles: positiveOr(
      knowledgeIntervalCycles,
      DEFAULT_KNOWLEDGE_INTERVAL_CYCLES,
    ),
    coordinatorIntervalCycles: positiveOr(
      coordinatorIntervalCycles,
      DEFAULT_COORDINATOR_INTERVAL_CYCLES,
    ),
  };
}

// --- Firebase auth -----------------------------------------------------------

/**
 * Simple in-memory auth session: holds the current ID token, refresh token and
 * the absolute time (ms epoch) at which the ID token expires.
 */
const session = {
  idToken: null,
  refreshToken: null,
  expiresAt: 0,
};

/**
 * Sign in with email/password via the Firebase Auth REST API.
 * Populates the module-level `session`.
 */
async function signIn(email, password) {
  const res = await fetch(SIGN_IN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`Firebase sign-in failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  session.idToken = data.idToken;
  session.refreshToken = data.refreshToken;
  session.expiresAt = Date.now() + Number(data.expiresIn) * 1000;
}

/**
 * Exchange the refresh token for a fresh ID token via the secure token API.
 * Uses form-encoded body as required by that endpoint.
 */
async function refreshIdToken() {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`Firebase token refresh failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  // Note: the refresh endpoint uses snake_case field names.
  session.idToken = data.id_token;
  session.refreshToken = data.refresh_token;
  session.expiresAt = Date.now() + Number(data.expires_in) * 1000;
}

/**
 * Return a valid ID token, refreshing it first if it's expired or near expiry.
 */
async function getValidIdToken() {
  const needsRefresh =
    !session.idToken ||
    Date.now() >= session.expiresAt - TOKEN_REFRESH_SKEW_SECONDS * 1000;

  if (needsRefresh && session.refreshToken) {
    await refreshIdToken();
  }
  return session.idToken;
}

// --- Context capture ---------------------------------------------------------

// Coarse activity categories keyed by substrings of the focused app name.
// First match wins; anything unmatched falls back to "browsing".
const CATEGORY_KEYWORDS = [
  { match: ['code', 'terminal', 'xcode', 'iterm'], category: 'coding' },
  { match: ['slack', 'zoom', 'meet', 'teams'], category: 'meeting' },
  { match: ['chrome', 'safari', 'firefox', 'arc', 'edge'], category: 'browsing' },
  { match: ['notion', 'docs', 'word', 'pages'], category: 'writing' },
  { match: ['figma', 'sketch'], category: 'design' },
];

/**
 * Map a focused app name to a coarse activity category.
 * @param {string} appName
 * @returns {string}
 */
function categorize(appName) {
  const name = (appName || '').toLowerCase();
  for (const { match, category } of CATEGORY_KEYWORDS) {
    if (match.some((kw) => name.includes(kw))) return category;
  }
  return 'browsing';
}

// Rotating mock contexts used when real foreground detection is unavailable
// (non-macOS platforms, or osascript errors / denied permissions). Keeps the
// agent demonstrably working in any environment.
const MOCK_CONTEXTS = [
  { app: 'Code', title: 'index.js — chooseyourprotocol' },
  { app: 'Google Chrome', title: 'Docs — ChooseYourProtocol' },
  { app: 'Slack', title: '#general' },
  { app: 'Notion', title: 'Roadmap' },
  { app: 'Figma', title: 'Onboarding flow' },
];
let mockIndex = 0;

/**
 * Get the name of the focused application.
 * On macOS uses osascript / System Events; otherwise (or on failure) returns
 * null so the caller can fall back to a mock context.
 *
 * @returns {Promise<string|null>}
 */
async function getForegroundApp() {
  if (os.platform() !== 'darwin') return null;
  try {
    const script =
      'tell application "System Events" to get name of first application process whose frontmost is true';
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const name = stdout.trim();
    return name || null;
  } catch {
    // osascript missing, or Accessibility/Automation permission denied.
    return null;
  }
}

/**
 * Capture one work-context signal.
 * @returns {Promise<object>} signal matching the API contract
 */
async function captureSignal() {
  const realApp = await getForegroundApp();

  let app;
  let title;
  if (realApp) {
    app = realApp;
    // We don't reliably have a window title across apps without extra
    // permissions, so reuse the app name as a coarse title for now.
    title = realApp;
  } else {
    const mock = MOCK_CONTEXTS[mockIndex % MOCK_CONTEXTS.length];
    mockIndex += 1;
    app = mock.app;
    title = mock.title;
  }

  return {
    type: 'work_context',
    category: categorize(app),
    app,
    title,
    idleSeconds: 0, // idle detection is a stub for the MVP
    capturedAt: new Date().toISOString(),
  };
}

// --- Signal posting ----------------------------------------------------------

/**
 * POST a signal to the API and return the parsed JSON response (or null).
 * @param {string} apiUrl
 * @param {object} signal
 */
async function postSignal(apiUrl, signal) {
  const idToken = await getValidIdToken();

  const res = await fetch(`${apiUrl}/api/agent/signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(signal),
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`Signal POST failed (${res.status}): ${detail}`);
  }

  // Some endpoints may return an empty body; guard against that.
  const text = await safeReadText(res);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- Output helpers ----------------------------------------------------------

/**
 * Read a response body as text without throwing.
 */
async function safeReadText(res) {
  try {
    return (await res.text()).trim();
  } catch {
    return '';
  }
}

/**
 * Print a level-up opportunity alert prominently in a box.
 * @param {{ id?: string, title?: string, category?: string, message?: string }} alert
 */
function printAlert(alert) {
  const lines = [
    '⚡ LEVEL-UP OPPORTUNITY',
    '',
    alert.title ? String(alert.title) : 'A new opportunity is waiting',
  ];
  if (alert.category) lines.push(`Category: ${alert.category}`);
  if (alert.message) lines.push('', String(alert.message));
  lines.push('', 'Open chooseyourprotocol.com to join.');

  const width = Math.max(...lines.map((l) => l.length));
  const top = `╔═${'═'.repeat(width)}═╗`;
  const bottom = `╚═${'═'.repeat(width)}═╝`;

  console.log('');
  console.log(top);
  for (const line of lines) {
    console.log(`║ ${line.padEnd(width)} ║`);
  }
  console.log(bottom);
  console.log('');
}

/**
 * Timestamped log line.
 */
function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// --- Main loop ---------------------------------------------------------------

async function main() {
  const config = loadConfig();

  console.log('────────────────────────────────────────────');
  console.log(' ChooseYourProtocol desktop agent (MVP)');
  console.log('────────────────────────────────────────────');

  if (!config.email || !config.password) {
    console.error(
      'Missing credentials. Set CYP_EMAIL and CYP_PASSWORD (or fill out agent.config.json).',
    );
    process.exit(1);
  }

  log(`User:     ${config.email}`);
  log(`API URL:  ${config.apiUrl}`);
  log(`Interval: ${config.intervalSeconds}s`);
  log(`Platform: ${os.platform()} (foreground detection ${
    os.platform() === 'darwin' ? 'enabled' : 'mock fallback'
  })`);

  // Authenticate up front so we fail fast on bad credentials.
  try {
    await signIn(config.email, config.password);
    log('Authenticated with Firebase.');
  } catch (err) {
    console.error(`Authentication failed: ${err.message}`);
    process.exit(1);
  }

  // --- Agentic layer (OpenAI Agents SDK), loaded lazily & defensively --------
  //
  // We import brain.js dynamically inside a try/catch so that a missing
  // dependency, a bad import, or a missing OPENAI_API_KEY can NEVER take down
  // the core signal loop. If anything is off, `brain` stays null and the two
  // agents are simply skipped while signal posting continues.
  let brain = null;
  if (config.openaiApiKey) {
    // The SDK reads OPENAI_API_KEY from the environment; make sure it's set
    // even when the key came from the config file.
    process.env.OPENAI_API_KEY = config.openaiApiKey;
    try {
      brain = await import('./brain.js');
      log(`Agentic features enabled (model ${config.model}).`);
      log(
        `Knowledge every ${config.knowledgeIntervalCycles} cycles, ` +
          `coordinator every ${config.coordinatorIntervalCycles} cycles.`,
      );
    } catch (err) {
      brain = null;
      log(
        `Agentic features disabled (could not load @openai/agents: ${err.message}). ` +
          'Continuing with signal posting only.',
      );
    }
  } else {
    log(
      'Agentic features disabled (OPENAI_API_KEY not set). ' +
        'Continuing with signal posting only.',
    );
  }

  // Rolling buffer of recently captured signals for the Knowledge Agent.
  const signalsBuffer = [];

  // Cycle counter; drives the knowledge/coordinator cadence.
  let cycle = 0;

  let running = true;
  let timer = null;

  // Graceful shutdown on Ctrl-C / termination.
  const shutdown = () => {
    if (!running) return;
    running = false;
    if (timer) clearTimeout(timer);
    console.log('');
    log('Shutting down. Stay leveled up. 👋');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // One capture+post cycle.
  const tick = async () => {
    if (!running) return;
    cycle += 1;
    try {
      const signal = await captureSignal();
      log(
        `Captured: ${signal.app} → ${signal.category} (idle ${signal.idleSeconds}s)`,
      );

      // Maintain the rolling buffer (cap at SIGNAL_BUFFER_CAP, keep newest).
      signalsBuffer.push(signal);
      if (signalsBuffer.length > SIGNAL_BUFFER_CAP) {
        signalsBuffer.splice(0, signalsBuffer.length - SIGNAL_BUFFER_CAP);
      }

      const response = await postSignal(config.apiUrl, signal);
      if (response?.alert) {
        printAlert(response.alert);
      }
    } catch (err) {
      // Never let a transient error kill the loop; just log and keep going.
      log(`Cycle error: ${err.message}`);
    }

    // --- Agentic jobs on their own cadences (fully isolated) ---------------
    // Each runs inside its own try/catch and is awaited so we don't overlap
    // runs, but a failure here never affects the next capture cycle.
    if (brain) {
      if (cycle % config.knowledgeIntervalCycles === 0) {
        try {
          log(`Knowledge Agent: synthesizing from ${signalsBuffer.length} signals…`);
          const out = await brain.synthesizeKnowledge(
            signalsBuffer,
            getValidIdToken,
            config.apiUrl,
            config.model,
          );
          if (out) log(`Knowledge Agent: ${out}`);
        } catch (err) {
          log(`Knowledge Agent error: ${err.message}`);
        }
      }

      if (cycle % config.coordinatorIntervalCycles === 0) {
        try {
          log('Coordinator Agent: evaluating org availability…');
          const out = await brain.coordinateLevelUp(
            getValidIdToken,
            config.apiUrl,
            config.model,
          );
          if (out) log(`Coordinator Agent: ${out}`);
        } catch (err) {
          log(`Coordinator Agent error: ${err.message}`);
        }
      }
    }

    if (running) {
      timer = setTimeout(tick, config.intervalSeconds * 1000);
    }
  };

  log('Agent started. Capturing work context… (Ctrl-C to stop)');
  tick();
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
