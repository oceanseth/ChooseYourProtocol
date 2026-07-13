#!/usr/bin/env bash
# StackMax MVP demo runner.
# Starts the coach backend, then launches Expo so you can scan the QR on your phone.
set -e

cd "$(dirname "$0")/.."

# Raise the open-file limit so Metro's file watcher doesn't hit EMFILE on macOS/Linux.
ulimit -n 65536 2>/dev/null || true

echo "==> Installing dependencies (first run only, ~1-2 min)…"
if [ ! -d node_modules ]; then
  npm install
fi

# Start backend
echo "==> Starting Max coach backend on :8787…"
npm run server &
SERVER_PID=$!
trap 'echo "Stopping backend…"; kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 1
echo "==> Backend health:"
curl -s http://localhost:8787/health || echo "(backend not up yet — it will be in a moment)"
echo ""

# Prefer LAN; if the machine has a low watcher limit, --tunnel avoids the file-watch wall.
MODE="${EXPO_MODE:-lan}"
echo "==> Launching Expo (${MODE}). Scan the QR with Expo Go on your phone."
echo "    (Phone and computer on the SAME Wi-Fi for --lan. Use EXPO_MODE=tunnel if LAN fails.)"
npx expo start --${MODE}
