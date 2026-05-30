// @chooseyourprotocol/agent — Electron main process (CommonJS).
//
// A minimal but real tray app that hosts the headless agent loop. It:
//   - forks ../index.js as a child process (so the existing loop runs unchanged),
//   - parses the child's stdout lines and forwards them to the renderer,
//   - shows a small 420x600 dark panel and a system-tray icon.
//
// The child's console output is line-oriented; we classify each line into a
// kind ("signal", "knowledge", "alert", "auth", "log") and push it to the
// renderer via webContents.send. Level-up alerts (the boxed ⚡ banner) are
// detected and surfaced separately.

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('node:path');
const { fork } = require('node:child_process');

let mainWindow = null;
let tray = null;
let agentChild = null;

// Buffer used to reassemble the multi-line boxed level-up alert from the child.
let alertBuffer = null;

// --- Window ------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    show: false,
    resizable: false,
    fullscreenable: false,
    title: 'ChooseYourProtocol Agent',
    backgroundColor: '#0c0f16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Hide (rather than destroy) on close so the tray app keeps running.
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- Tray --------------------------------------------------------------------

/**
 * Build a tiny tray icon. We try to draw a small filled square via a data URL;
 * if anything fails we fall back to an empty native image (Electron still shows
 * a clickable tray entry / title).
 */
function createTrayIcon() {
  try {
    // 16x16 solid teal PNG (1px scaled) — good enough as a placeholder glyph.
    const png =
      'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR4nGNgYGD4z0AEYBxV' +
      'SFXFowqHpsJRC0YtoIvCUYWjFtBFIQB7zwYBQ0lQpwAAAABJRU5ErkJggg==';
    const img = nativeImage.createFromDataURL(png);
    if (!img.isEmpty()) return img;
  } catch {
    // fall through
  }
  return nativeImage.createEmpty();
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('ChooseYourProtocol Agent');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show / Hide',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });
}

// --- Agent child process -----------------------------------------------------

/**
 * Send a structured message to the renderer (no-op if window is gone).
 */
function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

/**
 * Classify one stdout line from the child and forward it appropriately.
 */
function handleChildLine(rawLine) {
  const line = rawLine.replace(/\s+$/, '');
  if (line === '') return;

  // The boxed level-up alert spans several lines drawn with box-drawing chars.
  // Detect its start/end and collect the inner text into a single alert event.
  if (line.includes('╔')) {
    alertBuffer = [];
    return;
  }
  if (alertBuffer) {
    if (line.includes('╚')) {
      const text = alertBuffer
        .map((l) => l.replace(/^.*?║\s?/, '').replace(/\s*║.*$/, '').trim())
        .filter(Boolean)
        .join('\n');
      sendToRenderer('agent:alert', { text, at: new Date().toISOString() });
      alertBuffer = null;
      return;
    }
    alertBuffer.push(line);
    return;
  }

  // Strip the leading "[timestamp] " prefix our logger adds, for cleaner UI.
  const stripped = line.replace(/^\[[^\]]+\]\s*/, '');

  let kind = 'log';
  if (/^Captured:/.test(stripped)) kind = 'signal';
  else if (/^Knowledge Agent:/.test(stripped)) kind = 'knowledge';
  else if (/^Coordinator Agent:/.test(stripped)) kind = 'coordinator';
  else if (/Authenticated|Authentication|Agentic features/.test(stripped)) {
    kind = 'auth';
  }

  sendToRenderer('agent:log', {
    kind,
    text: stripped,
    at: new Date().toISOString(),
  });
}

/**
 * Fork the existing headless agent (../index.js) and pipe its output to the UI.
 */
function startAgent() {
  const entry = path.join(__dirname, '..', 'index.js');

  agentChild = fork(entry, [], {
    cwd: path.join(__dirname, '..'),
    silent: true, // pipe stdout/stderr so we can read them
    env: process.env,
  });

  let stdoutTail = '';
  let stderrTail = '';

  const pump = (chunk, tailRef, isErr) => {
    const data = tailRef.value + chunk.toString();
    const parts = data.split('\n');
    tailRef.value = parts.pop(); // keep the incomplete trailing line
    for (const l of parts) {
      if (isErr) {
        sendToRenderer('agent:log', {
          kind: 'error',
          text: l.replace(/\s+$/, ''),
          at: new Date().toISOString(),
        });
      } else {
        handleChildLine(l);
      }
    }
  };

  const outTail = { value: '' };
  const errTail = { value: '' };

  if (agentChild.stdout) {
    agentChild.stdout.on('data', (c) => pump(c, outTail, false));
  }
  if (agentChild.stderr) {
    agentChild.stderr.on('data', (c) => pump(c, errTail, true));
  }

  agentChild.on('exit', (code) => {
    sendToRenderer('agent:log', {
      kind: 'error',
      text: `Agent process exited (code ${code}).`,
      at: new Date().toISOString(),
    });
  });

  // Silence unused-var lint for the tail strings (kept for clarity above).
  void stdoutTail;
  void stderrTail;
}

// --- App lifecycle -----------------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  createTray();
  startAgent();

  // Renderer asks for current status once it's mounted; reply with a hello.
  ipcMain.on('agent:ready', () => {
    sendToRenderer('agent:log', {
      kind: 'auth',
      text: 'UI connected to agent host.',
      at: new Date().toISOString(),
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

// Keep running in the tray even when all windows are closed.
app.on('window-all-closed', () => {
  // Intentionally do nothing (tray app stays alive). Quit happens via menu.
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (agentChild && !agentChild.killed) {
    agentChild.kill();
  }
});
