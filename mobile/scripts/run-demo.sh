#!/usr/bin/env bash
# StackMax MVP demo runner.
# Starts the coach backend, then launches Expo so you can scan the QR on your phone.
set -e

cd "$(dirname "$0")/.."

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

# Start Expo. --lan so your phone on the same Wi-Fi can connect.
echo "==> Launching Expo. Scan the QR code below with the Expo Go app on your phone."
echo "    (Phone and computer must be on the SAME Wi-Fi network.)"
npx expo start --lan
