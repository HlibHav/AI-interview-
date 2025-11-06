# Rate Limiting & Polling (Historical)

> **Current status:** Beyond Presence now delivers transcripts and call-completion events exclusively via webhooks.  
> All polling endpoints (`/api/beyond-presence/stream/*`, `/api/beyond-presence/export-transcript`) were removed, so additional rate limiting against BEY is no longer required in the default flow.

## What changed?

- **Removed Polling APIs**
  - `/api/beyond-presence/stream/[agentId]`
  - `/api/beyond-presence/export-transcript`
  These endpoints previously polled `/v1/calls` and `/v1/calls/{id}/messages`. They have been deleted to avoid accidental reintroduction of aggressive polling.

- **Webhook-First Flow**
  - `app/api/beyond-presence/webhook/route.ts` now:
    - stores transcript messages as BEY sends them,
    - triggers `/api/sessions/real-complete` when it receives call-ended events.
  - Only `app/api/beyond-presence/create-agent/route.ts` still uses the BEY SDK (no raw fetches to `/v1/calls`).

- **Token Bucket Utility**
  - `lib/utils/rate-limiter.ts` remains in the repo for potential future use, but it is not referenced anywhere after the webhook migration.

## When would you need rate limiting again?

- If you reintroduce any polling endpoint against BEY REST APIs.
- If you add manual export scripts that hit `/v1/calls/*`.
- In those cases consider reusing `lib/utils/rate-limiter.ts` and gate new endpoints behind webhooks/queues to keep traffic low.

## Best Practice Going Forward

1. **Rely on webhook payloads** for transcript + status.
2. **Keep `BEY_STREAM_TRANSCRIPTS=false`** (default in `.env.example`).
3. **Avoid reintroducing `/v1/calls` polling** unless absolutely necessary; BEY can deactivate keys for high-volume polling.
4. If a fallback export is ever required, implement it as an ad-hoc admin script with explicit rate limiting rather than part of the main runtime.

This document is kept for historical context. If you need a rate-limited polling solution in the future, refer to previous git history or re-enable the utilities in `lib/utils/rate-limiter.ts`.
