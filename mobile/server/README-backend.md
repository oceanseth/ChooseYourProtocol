# StackMax backend — persistence + groups + measure + seed + managing-agent (contract v3.2)

Extends the coach server (`server/index.js`). All shapes match `stackmax-api-contract-v1.md` v3
+ the **v3.2 amendment** (`stackmax-api-contract-v3.2-amendment.md`).
Files: `store.js`, `groups.js`, `routes.js`, `coach.js` (new in v3.2).

## Run
```bash
node server/index.js            # PORT=8787 default
# env: STACKMAX_DB=path.json  STACKMAX_SEED_SECRET=...  KYLON_API_TOKEN/KYLON_API_BASE (LLM + vision)
```

## Endpoints
- `POST /resolve` — fuzzy goal → protocol group with metrics; persists + returns `id` (pg_...).
  NOTE: the resolve response echoes the raw metric shape (no ids). Real metric ids (`metric_...`)
  come from `GET /groups/:id` — the app reads group detail anyway. Seed/log against those ids.
- `GET  /groups/:id` — detail: members(role,is_synthetic,streak), metrics, metrics_state[],
  first 10 **group-audience** feed events + feed_next_before.
- `GET  /groups/:id/feed?before=&limit=&audience=group|user&as=<member_id>` — paginated feed.
  `audience=user&as=<member_id>` returns that member's private **1:1 lane** only.
- `POST /groups/:id/log` — {metric_id,value,proof_tier,note} → entry+streak+milestone.
  Rejects `is_synthetic:true` (403).
- `POST /groups/:id/measure` — {metric_id,image_ref|image_base64} → real vision (Claude multimodal),
  returns value+confidence+entry. Low-confidence → `needs_retake:true`, no entry written.
  Deterministic stub fallback when no LLM env (demo-safe).
- `POST /groups/:id/check-in` — **managing-agent surfaces** (admin/agent secret). Emits `check_in`
  or `win` to `audience:group` (shared feed / announce wins) or `audience:user` (1:1 lane).
  `auto_win_for_member` auto-detects a grounded win from real entries; never fabricates.
- `POST /groups/:id/seed` — admin (x-seed-secret). Server-stamps is_synthetic/is_seeded;
  batched members[] with entries[] + feed_events[]. Ignores client-sent flags.
- `POST /groups/:id/retire-synthetics` — admin. Removes synthetics + their entries/feed; is_seeded→false.

## Honesty (enforced at the API surface, not by client discipline)
- Synthetics: only `/seed` can create them; flags server-stamped; `/log` 403s forged synthetics.
- Managing agent: `is_synthetic:false`, `is_agent:true` — labeled as the coach, never a member.
- 1:1 (`audience:user`) events never appear in the shared group feed.

## Seeding contract for Kylord's engine (unchanged from v3)
- Seed via `POST /groups/:id/seed` (batched, admin secret). Server stamps is_synthetic/is_seeded,
  recomputes streaks from `entries[]`.
- **Date modeled entries up to ~now.** Streaks compute against each metric's cadence window from
  the *current* time. Stale-dated entries render `current: 0` (correctly). End each trajectory near
  today so seeded members show alive streaks (`logged_today:true` where cadence expects it).

## Verified green (v3.2, this build)
resolve → seed(2 synthetics) → group detail (Dana alive 23-day streak/logged_today, Marcus
correctly-stale) → agent group-announce (check_in) → agent 1:1 nudge (audience=user, scoped to member)
→ 1:1-without-target 400 → auto-win from real trajectory ("down from 14 to 3") → feed scoping (1:1
does NOT leak into shared feed) → forged is_synthetic 403 → wrong-secret 401 on check-in & seed →
measure writes entry → retire (synthetics→0, is_seeded→false). Real vision proven: controlled
5-blemish image → model returned value 5, confidence 0.95, strict-JSON shape.
