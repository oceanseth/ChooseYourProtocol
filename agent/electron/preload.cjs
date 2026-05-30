// @chooseyourprotocol/agent — Electron preload (CommonJS).
//
// Bridges the isolated renderer to the main process. We expose a tiny, typed
// surface: subscribe to log/alert events and signal readiness. No Node APIs
// leak into the page (contextIsolation is on).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentBridge', {
  /**
   * Subscribe to agent log events.
   * @param {(entry: { kind: string, text: string, at: string }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onLog(cb) {
    const handler = (_event, entry) => cb(entry);
    ipcRenderer.on('agent:log', handler);
    return () => ipcRenderer.removeListener('agent:log', handler);
  },

  /**
   * Subscribe to ⚡ level-up alert events.
   * @param {(entry: { text: string, at: string }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onAlert(cb) {
    const handler = (_event, entry) => cb(entry);
    ipcRenderer.on('agent:alert', handler);
    return () => ipcRenderer.removeListener('agent:alert', handler);
  },

  /** Tell the main process the UI is mounted and ready for events. */
  ready() {
    ipcRenderer.send('agent:ready');
  },
});
