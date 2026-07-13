# Masky API — integration reference (StackMax)

Source: https://masky.ai/skill.md · Base URL: `https://masky.ai/api` · Auth: `Authorization: Bearer $MASKY_API_KEY`

Used by the **synthetic-seeding engine** to generate avatar images and short talking-head
videos for synthetic users. NOT used by the website UI or the mobile app directly — all
Masky calls run server-side/agent-side so the token never ships to a client.

## Honesty guardrails (non-negotiable)
- Every Masky asset is attached to a user record with `is_synthetic = true`.
- Store `masky` provenance on the asset (avatarId / conversationId / generated_at).
- Never present a Masky-generated avatar as a real person. Label per the spec + Terms/Privacy.
- Keep `liveUrl` values secret — anyone with the URL can watch the clip.

## Core calls
- `POST /images/generate` — generate a still image from a prompt.
- `POST /avatars` — create an avatar (image + personality prompt + voice).
- `GET /avatars` — list avatars.
- `POST /conversations` — start a conversation; returns `conversationId` + embeddable `liveUrl`.
- Inject a `speak`-mode turn into a conversation to render a talking-head clip (~30–60s for video).

Billing: the avatar owner is billed; image and video turns cost credits.
