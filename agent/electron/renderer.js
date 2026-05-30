// @chooseyourprotocol/agent — Electron renderer (vanilla JS).
//
// Receives structured log/alert events from the main process (via the
// `agentBridge` exposed in preload.cjs) and renders them into four lists:
// level-up alerts, knowledge entries, captured signals, and a general log.

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    dot: $('dot'),
    statusText: $('statusText'),
    alerts: $('alerts'),
    knowledge: $('knowledge'),
    signals: $('signals'),
    log: $('log'),
  };

  const MAX_ROWS = 100;

  /** Remove the placeholder ".empty" node from a container if present. */
  function clearEmpty(container) {
    const empty = container.querySelector('.empty');
    if (empty) empty.remove();
  }

  /** Cap a container's children to MAX_ROWS (drop oldest = first). */
  function cap(container) {
    while (container.children.length > MAX_ROWS) {
      container.removeChild(container.firstChild);
    }
  }

  function fmtTime(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString([], { hour12: false });
  }

  /** Append a {time, message} row to a list container. */
  function appendRow(container, text, kind, at) {
    clearEmpty(container);
    const row = document.createElement('div');
    row.className = 'row';

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = fmtTime(at);

    const msg = document.createElement('span');
    msg.className = 'msg' + (kind ? ' ' + kind : '');
    msg.textContent = text;

    row.appendChild(time);
    row.appendChild(msg);
    container.appendChild(row);
    cap(container);
    container.scrollTop = container.scrollHeight;
  }

  function setStatus(text, state) {
    els.statusText.textContent = text;
    els.dot.className = 'dot' + (state ? ' ' + state : '');
  }

  // --- Wire up bridge events -------------------------------------------------

  const bridge = window.agentBridge;
  if (!bridge) {
    setStatus('Bridge unavailable', 'err');
    return;
  }

  bridge.onLog((entry) => {
    const { kind, text, at } = entry;

    switch (kind) {
      case 'signal':
        appendRow(els.signals, text, 'signal', at);
        setStatus('Capturing work context', 'ok');
        break;
      case 'knowledge':
        appendRow(els.knowledge, text, 'knowledge', at);
        break;
      case 'coordinator':
        appendRow(els.log, text, 'coordinator', at);
        break;
      case 'auth':
        appendRow(els.log, text, 'auth', at);
        if (/Authenticated/i.test(text)) setStatus('Authenticated', 'ok');
        else if (/connected/i.test(text)) setStatus('Connected', 'ok');
        break;
      case 'error':
        appendRow(els.log, text, 'error', at);
        setStatus('Agent error — see log', 'err');
        break;
      default:
        appendRow(els.log, text, 'log', at);
        break;
    }
  });

  bridge.onAlert((entry) => {
    clearEmpty(els.alerts);
    const box = document.createElement('div');
    box.className = 'alert';
    const head = document.createElement('div');
    head.className = 'bolt';
    head.textContent = `⚡  ${fmtTime(entry.at)}`;
    const body = document.createElement('div');
    body.textContent = entry.text;
    box.appendChild(head);
    box.appendChild(body);
    els.alerts.prepend(box);
  });

  setStatus('Connecting to agent…');
  bridge.ready();
})();
