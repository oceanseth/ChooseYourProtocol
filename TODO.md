# TODO

## Fix phone screens in the /about world film (corner-pin compositing)

**Status: BLOCKED — do not start until Seth gives the go, after StackMax v1 ships to the App Store.**
Waiting because the fix needs *real app screenshots*, and the app's screens will change before v1.

### The issue
The AI-generated fly-through film (`media-src/world/about_film_narrated.mp4`, live at
`https://chooseyourprotocol.com/media/about-film.mp4`, embedded on `/about`) shows
garbled pseudo-text on phone screens — worst in the pool-discovery scene (~30–42s,
slow-mo), which must show the real app UI:

- 💡 **"Related research"** row (citing the chlorine/skin journal)
- **"New protocol group — Chlorine Protection"** card with a Join button
- Nice-to-have: leg 2 (~16–21s) screen header **"Skincare Protocol · 42 members"**
  (the clay avatar tiles there are charming — keep them; screen-locked caption only)

### The fix (no generation credits needed)
1. Capture real screenshots from the shipped app (or build the screens as HTML from
   `mobile/src/lib/theme.js` tokens: bg #0B0B0F, cards #16161D, violet #7C5CFF).
2. Track the glowing violet screen quad per frame with a small OpenCV script
   (hue-segment → min-area quad → smoothed corners; the slow-mo makes this stable).
3. `cv2.warpPerspective` the screenshot onto the tracked quad, luminance-matched,
   soft glow so it sits *in* the scene.
4. Fallback: in the final ~3s of the slow-mo the phone barely moves — 2–3 hand-keyed
   corner positions with interpolation is enough.
5. Re-run the Dr. Max bubble composite (`scratchpad .../scroll-world-test/composite.sh`
   logic — script copied to `media-src/world/`; line timings: 0.5 / 8.3 / 14.8 / 21.6 /
   30.4 / 44.5s, durations in that script), then `bash scripts/upload-media.sh`.
6. Nuclear option if compositing disappoints: regenerate leg 4 on Kling (~10 credits)
   with the real UI composited into its start frame first.

### Asset map
- Film legs + prompts + narrated master: `media-src/world/` (gitignored — local only, back it up)
- Dr. Max avatar (Masky id `CahLvNEeMMa9Qg1kH1bu`) portrait + lipsync lines: `media-src/max/`
- Upload: `bash scripts/upload-media.sh` (S3 `media/` prefix survives deploys via
  the `--exclude "media/*"` in `.github/workflows/deploy.yml`)

## Later / parked
- /about scroll-world page: scroll-scrubbed version of the same world (skill installed at
  `.agents/skills/scroll-world/`, engine at `references/scrub-engine.js`) with per-section
  copy + the "5% dizziness → 0 in your demographic" data-viz overlay beat.
- Optional richer film: Higgsfield credits are nearly spent (~6 left on free tier);
  topping up enables mobile 9:16 portrait chain + re-rolls.
