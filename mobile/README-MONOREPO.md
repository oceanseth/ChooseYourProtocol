# mobile/ — StackMax React Native (Expo) app

Phone app (Expo), independent of the website build at repo root (which deploys
chooseyourprotocol.com). The website deploy workflow only triggers on `src/**`,
`public/**`, `index.html`, `vite.config.js`, `package.json` — so nothing in `mobile/`
touches the live site.

Run it:
```bash
cd mobile && npm run demo
```
Then scan the QR with Expo Go. Phone + computer on the same Wi-Fi.
