// Public client configuration for ChooseYourProtocol.
// The Firebase apiKey is a public identifier (not a secret); all privileged
// operations are gated by Firestore security rules and the server API.

export const config = {
  firebase: {
    apiKey: 'AIzaSyBIEI6RLWvtoDuMWbMtzkjq3lEnywKheWo',
    authDomain: 'chooseyourprotocol.firebaseapp.com',
    projectId: 'chooseyourprotocol',
    storageBucket: 'chooseyourprotocol.firebasestorage.app',
    messagingSenderId: '981582299859',
    appId: '1:981582299859:web:61e1a14040820d76e50a26'
  },

  api: {
    // localhost during dev (Vite proxies /api -> :3001); same-origin in prod.
    get baseUrl() {
      const { hostname, origin } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ''; // use Vite proxy: fetch('/api/...')
      }
      return origin; // https://chooseyourprotocol.com
    }
  }
};

// Early-access waitlist endpoint base. Defaults to our own API (`/api/join` via
// the Lambda) — same-origin in prod, Vite proxy in dev. VITE_WAITLIST_URL can
// still override it at build time if the waitlist ever moves to a third party.
export const WAITLIST_URL = import.meta.env.VITE_WAITLIST_URL || `${config.api.baseUrl}/api`;
