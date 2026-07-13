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
