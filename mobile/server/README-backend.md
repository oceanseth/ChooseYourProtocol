# StackMax backend — persistence + groups + measure + seed (contract v3)

Extends the existing `server/index.js` coach server. All shapes match
`stackmax-api-contract-v1.md` v3. New files: `store.js`, `groups.js`, `routes.js`.

## Run
```bash
cd mobile   # or wherever the server lives
node server/index.js            # PORT=8787 default
# env: STACKMAX_DB=path.json  STACKMAX_SEED_SECRET=...  KYLON_API_TOKEN/BASE (LLM+vision)
```

## Endpoints live now
- `POST /resolve` — unchanged, now persists the group + returns `id` (pg_...).
- `GET  /groups/:id` — group detail: members(role,is_synthetic,streak), metrics,
  metrics_state[], first 10 feed + feed_next_before.
- `GET  /groups/:id/feed?before=&limit=` — paginated feed.
- `POST /groups/:id/log` — {metric_id,value,proof_tier,note} -> entry+streak+milestone.
  Rejects is_synthetic:true (403).
- `POST /groups/:id/measure` — JSON reuse path {metric_id,image_ref} now; multipart
  one-call default + real Gemini vision = NEXT (currently returns a stub value).
- `POST /groups/:id/seed` — admin (x-seed-secret). Server-stamps is_synthetic/is_seeded;
  batched members[] with entries[] + feed_events[] + provenance. Aggregates recomputed from rows.
- `POST /groups/:id/retire-synthetics` — admin. Removes synthetics, flips is_seeded=false.

## Verified end-to-end
resolve->detail->log(streak+milestone)->measure(stub)->seed(auth+forged-flag reject)->
detail(aggregates recompute)->feed pagination->retire->404/403/401 paths. All green.

## Still mine to finish
1. Multipart one-call /measure + real Gemini multimodal vision (pimple_count / perceived_age).
2. Agent check-in loop emitting `check_in` feed events with action hints + push payload.
3. Swap JSON-file store for SQLite-class if we outgrow it (API surface unchanged either way).

## Note for max (seeding engine)
Seeded entries must be dated up to ~now for synthetic streaks to render as "alive" —
streaks compute against each metric's cadence window from the current time. Model the
trajectory ending near today, not weeks back.

## v3.1 — group lifecycle (leave + all-synthetic teardown)
- `GET /groups/:id` now also returns `real_member_count` (distinct from member_count/synthetic_count) so UX renders the right leave confirmation client-side.
- `POST /groups/:id/leave` — body {user_id?} removes the caller (a real member) + their entries/feed.
  Returns { left, was_last_real_member, group_outcome }. group_outcome ∈ 'alive' | 'exempt' | 'deleted'.
  - Rejects a synthetic / non-member caller (400) and unknown group (404).
- Lifecycle rule (Seth-confirmed default): a group's life depends on REAL member count; synthetics never keep it alive.
  - Last real member leaves, group synthetic-only → group + synthetics torn down (`deleted`).
  - EXCEPTION: a seeded group still inside its outreach window is exempt (`exempt`) so outreach can land the first real user.
    Window = STACKMAX_SEEDING_WINDOW_MS (default 14d, measured from group created_at).
  - Config flip: STACKMAX_DELETE_SYNTHETIC_ON_SIGHT=1 deletes any synthetic-only group immediately, ignoring the window.
- Safety net TODO (mine): a periodic sweep applying the same rule, so a group that ages out of its window with 0 reals is reclaimed even without a leave event. Intersects max's seeding lane — the seed engine must not re-seed a group slated for deletion.
