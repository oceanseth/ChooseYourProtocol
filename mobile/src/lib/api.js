import Constants from 'expo-constants';
import { Platform } from 'react-native';

// When running on a physical phone via Expo Go, "localhost" points at the phone,
// not your computer. We derive the dev machine's LAN IP from the Expo host.
function resolveBaseUrl() {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8787';

  // Try to reuse the Metro/Expo host LAN IP so the phone can reach the laptop.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';
  const host = hostUri.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8787`;
  }
  // Android emulator special-cases localhost.
  if (Platform.OS === 'android' && (configured.includes('localhost') || configured.includes('127.0.0.1'))) {
    return 'http://10.0.2.2:8787';
  }
  return configured;
}

export const API_BASE = resolveBaseUrl();

export async function resolveGoal(goal) {
  const res = await fetch(`${API_BASE}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  });
  if (!res.ok) throw new Error(`Coach error (${res.status})`);
  return res.json();
}
