# ChooseYourProtocol Desktop Agent

A minimal, cross-platform Node.js desktop agent for **ChooseYourProtocol**.

It runs quietly on your desktop, periodically captures a lightweight **work
context** signal (which app/window you're focused on, idle vs. active, and a
coarse activity category) and POSTs it to the ChooseYourProtocol API. These
signals feed knowledge-base context and let the server decide when to fire a
**"level-up opportunity"** alert — the modern smoke break.

On top of the signal loop it runs two small **OpenAI Agents SDK**
(`@openai/agents`) agents — a **Knowledge Agent** and a **Coordinator Agent** —
and ships with a minimal **Electron tray app** for a live view. See
[Agentic features](#agentic-features-openai-agents-sdk) below.

## Requirements

- **Node.js 22+** (for global `fetch` and the OpenAI Agents SDK).
- An **`OPENAI_API_KEY`** *(optional)* — without it the agent still runs and
  posts signals; the two agents are simply skipped (see
  [Graceful degradation](#graceful-degradation)).

## Configure

The agent reads credentials and settings from **environment variables** or a
local **`agent.config.json`** file (placed next to `index.js`). Environment
variables take precedence.

### Option A — environment variables

| Variable                          | Default                          | Description                                          |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `CYP_EMAIL`                       | —                                | Firebase user email (required)                       |
| `CYP_PASSWORD`                    | —                                | Firebase user password (required)                    |
| `CYP_API_URL`                     | `https://chooseyourprotocol.com` | API base URL                                         |
| `CYP_INTERVAL_SECONDS`            | `60`                             | Seconds between captures                             |
| `OPENAI_API_KEY`                  | —                                | OpenAI key for the agents (optional; agents off if unset) |
| `CYP_MODEL`                       | `gpt-4.1-mini`                   | OpenAI model used by both agents                     |
| `CYP_KNOWLEDGE_INTERVAL_CYCLES`   | `5`                              | Run the Knowledge Agent every N capture cycles       |
| `CYP_COORDINATOR_INTERVAL_CYCLES` | `5`                              | Run the Coordinator Agent every N capture cycles     |

```bash
export CYP_EMAIL="you@example.com"
export CYP_PASSWORD="your-firebase-password"
export OPENAI_API_KEY="sk-..."   # optional — enables the two agents
npm start
```

### Option B — config file

Copy the example and fill it in:

```bash
cp agent.config.example.json agent.config.json
```

```json
{
  "email": "you@example.com",
  "password": "your-firebase-password",
  "apiUrl": "https://chooseyourprotocol.com",
  "intervalSeconds": 60,
  "openaiApiKey": "sk-...",
  "model": "gpt-4.1-mini",
  "knowledgeIntervalCycles": 5,
  "coordinatorIntervalCycles": 5
}
```

> `agent.config.json` contains secrets — keep it out of version control.

## Run

First install dependencies (now that the agent has real deps):

```bash
npm install
```

### Headless

```bash
npm start
# or
node index.js
# or, if installed globally / linked:
cyp-agent
```

Stop with **Ctrl-C** (the agent shuts down gracefully).

### Electron tray app

```bash
npm install
npm run electron
```

This launches a small **tray app** (icon in the menu bar / system tray) with a
420×600 dark panel titled **"ChooseYourProtocol Agent"**. The panel shows
connection/auth status, a live feed of captured signals, synthesized knowledge
entries, and any incoming ⚡ level-up alerts. The Electron main process forks
the same headless `index.js` loop and forwards its output to the UI, so the
behavior is identical to running headless — just with a window.

- **Show / Hide** and **Quit** are available from the tray menu.
- Closing the window hides it (the agent keeps running in the tray); use
  **Quit** to fully stop.

## What it does

1. **Authenticates** as a Firebase user via the Firebase Auth REST API to obtain
   an ID token, refreshing it automatically before expiry.
2. Every `intervalSeconds`, **captures a work-context signal**:
   - **App detection** — on macOS, the focused app name is read via
     `osascript` / System Events. On other platforms (or if that fails), it
     falls back to a small rotating set of mock contexts so the agent still
     works.
   - **Category** — derived from the app name with a simple keyword map
     (Code/Terminal/Xcode → `coding`, Slack/Zoom/Meet → `meeting`,
     Chrome/Safari/Firefox → `browsing`, Notion/Docs/Word → `writing`,
     Figma/Sketch → `design`, else → `browsing`).
   - **Idle** — stubbed at `0` for the MVP.
3. **POSTs** the signal to `POST {API}/api/agent/signals` with
   `Authorization: Bearer <idToken>`.
4. If the server returns a **level-up opportunity** alert, prints a prominent
   boxed `⚡ LEVEL-UP OPPORTUNITY` message in the console.

### Signal shape

```json
{
  "type": "work_context",
  "category": "coding",
  "app": "Code",
  "title": "index.js — chooseyourprotocol",
  "idleSeconds": 0,
  "capturedAt": "2026-05-30T12:00:00.000Z"
}
```

## Agentic features (OpenAI Agents SDK)

When `OPENAI_API_KEY` is set, the agent additionally runs two small agents built
with the **OpenAI Agents SDK** (`@openai/agents`). The agentic logic lives in
[`brain.js`](./brain.js); `index.js` maintains a rolling buffer of the last ~50
captured signals and invokes each agent on its own cadence (counted in capture
cycles). Both agents are invoked inside `try/catch` and can never break the
signal loop.

### 1. Knowledge Agent

- **Cadence:** every `knowledgeIntervalCycles` cycles (default **5**).
- **What it does:** takes the recent signals buffer (app / title / category /
  time) and synthesizes a small number of concise knowledge-base entries about
  what you've been working on and the expertise you're demonstrating.
- **Tool:** `save_knowledge_entry({ title, summary, topics[], category })` →
  `POST {API}/api/agent/knowledge` (Bearer auth). The agent calls it once per
  distinct entry it derives. `category` is one of
  `fitness | social | business | engineering | general`.

### 2. Coordinator Agent

- **Cadence:** every `coordinatorIntervalCycles` cycles (default **5**).
- **What it does:** fetches the org availability snapshot from
  `GET {API}/api/agent/org-availability` (Bearer auth) — `{ now, members: [{ uid,
  displayName, status, idleSeconds, lastSeenAt, currentFocus, personalGoals }] }`
  — and decides whether **right now** is a good moment to schedule a quick
  2-person **"level-up"** (the modern smoke break): i.e. when 2+ members are
  simultaneously free/idle and share a goal category.
- **Tool:** `propose_level_up({ participantUids[2], category, topic, reason })` →
  `POST {API}/api/agent/level-up` (Bearer auth). The server enforces a cooldown,
  so it's fine to propose when in doubt. The agent only proposes when there's a
  genuine overlap of free people; otherwise it does nothing.

Both tools authenticate with a **fresh Firebase ID token** obtained from the same
auth session used for signal posting.

## Graceful degradation

The agentic layer is strictly additive and fully isolated:

- If `OPENAI_API_KEY` is **not set**, the two agents are **skipped** (a one-line
  note is logged) and the agent keeps capturing and posting signals.
- `brain.js` (and therefore `@openai/agents`) is imported **lazily** inside a
  `try/catch`, so a missing dependency or a bad key never crashes the loop — it
  just disables the agents.
- Each agent run is wrapped in its own `try/catch`; a failure logs and the next
  capture cycle proceeds normally.

## macOS permissions

The first time the agent runs `osascript` to read the focused app, macOS will
prompt for **Automation** (control "System Events") and possibly
**Accessibility** permission. Grant it under
**System Settings → Privacy & Security → Automation / Accessibility** for your
terminal. If permission is denied, the agent automatically falls back to mock
contexts instead of crashing.

## Roadmap (where this skeleton grows)

- Real idle-time detection (per-platform).
- Real window titles and richer activity categorization.
- Local buffering / retry when offline.
- OS-native login-item / service installation.
