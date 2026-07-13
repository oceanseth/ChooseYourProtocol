# StackMax — MVP demo

Talk to **Max** (your accountability coach) about a goal. Max resolves it into a concrete
**protocol group** with measured **metrics** and a cadence, then adds it to **your stack**.

This is the MVP slice of the StackMax product (see `../cyp-domain-spec.md` for the full model).

## What's in here

- `app/` — screens (Expo Router): `index` = chat with Max, `stack` = your stack of protocol groups
- `src/` — components, theme, API client, local storage
- `server/` — the Max coach backend (`/resolve` turns a fuzzy goal into protocol + metrics)
- `scripts/run-demo.sh` — starts backend + Expo together

## Run it on your phone (fastest path)

**Requirements:** Node 18+ (you have it), and the **Expo Go** app installed on your phone
(App Store / Play Store). Your phone and computer must be on the **same Wi-Fi**.

```bash
cd stackmax
npm run demo
```

That script installs deps (first run only), starts the coach backend on `:8787`,
and launches Expo. A **QR code** appears in the terminal — open **Expo Go** on your
phone and scan it. StackMax loads on your phone.

### Manual (two terminals) if you prefer

```bash
# terminal 1 — backend
cd stackmax && npm install && npm run server

# terminal 2 — app
cd stackmax && npx expo start --lan
```

Then scan the QR in Expo Go.

## Try the demo flow

1. On the chat screen, tell Max a goal — try **"I want good skin"** or **"I want to get stronger"**.
2. Max proposes a concrete protocol + the metrics he'll track (with cadence and proof tier).
3. Tap **"Create protocol group + add to my stack"**.
4. You land on **Your Stack** with the new protocol group. Tap **+ New goal** to add more.

## Notes

- **Max's brain:** the backend calls an LLM when `KYLON_API_TOKEN` + `KYLON_API_BASE` are set
  in the environment; otherwise it uses a solid deterministic fallback so the demo never breaks.
  Either way you get a real goal→protocol→metrics resolution.
- **Phone can't reach backend?** The app auto-derives your computer's LAN IP from Expo. If it
  still fails, make sure both devices are on the same network and your firewall allows port 8787.
- This is an MVP demo: stack is stored locally on-device (AsyncStorage). No accounts, no server
  persistence, no synthetic seeding yet — those are the next milestones in the spec.
