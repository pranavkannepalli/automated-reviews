# Automated Reviews

Multi-organization review automation MVP built from the PRD in this repo.

## Stack

- `apps/web`: Next.js 16 App Router app
- `packages/core`: shared domain logic and tests
- `supabase/`: SQL schema, RLS, and dashboard RPCs

## Local setup

1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Fill in your Supabase project URL, anon key, and service role key.
3. Add `TWILIO_AUTH_TOKEN` if you want live SMS sending.
   - If an organization has no verified Twilio number yet, set `BEEPER_ACCESS_TOKEN` (and optionally `BEEPER_API_URL`/`BEEPER_ACCOUNT_ID`) to send the same messages from your own number through a locally running Beeper Desktop instead. Drop these once Twilio is verified.
4. Add `SQUARE_WEBHOOK_SIGNATURE_KEY` if you want signature verification enabled.
5. Set `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` if you want delayed sends and reminder scheduling.
6. Run the SQL in [supabase/migrations/001_initial.sql](/home/kitts/Documents/dev/personal/automated-reviews/supabase/migrations/001_initial.sql) against your Supabase database.
7. Install dependencies with `pnpm install`.
8. Start the app with `pnpm dev`.
9. Start the Temporal worker with `pnpm --filter @automated-reviews/temporal dev`, or run it containerized with `docker compose -f docker-compose.temporal.yml up --build worker` (reads secrets from `apps/web/.env.local`; if you're using the Beeper fallback, that compose service points `BEEPER_API_URL` at `host.docker.internal` so the container can reach Beeper Desktop on your host machine).

## Product flow

- Sign in with Supabase magic link.
- Bootstrap the first organization from `/app` if the user has no memberships yet.
- Configure review links, Twilio sender, and Square location in `/app/settings`.
- Send Square payments to `POST /api/webhooks/square`.
- Send Twilio inbound messages and delivery callbacks to `POST /api/webhooks/twilio`.
- Positive review prompts use tracked links at `/r/:token` so the platform can detect clicks.
- Delayed initial asks and 2-day reminder logic run through the Temporal worker when configured.
- Beeper has no inbound webhook, so when the initial ask goes out via Beeper, the Temporal worker polls the Beeper Desktop API once a minute (for up to 24h) to catch the customer's reply, classify it, answer questions, and send the review link as soon as it looks like positive feedback. Drop this once Twilio numbers are verified and replies arrive via the Twilio webhook instead.

## Testing without the website

- `node scripts/test-beeper-send.mjs +15551234567 "test message"` checks the Beeper Desktop API directly (no app, DB, or Temporal involved).
- `pnpm --filter @automated-reviews/temporal test:workflow +15551234567` seeds a throwaway test organization/customer/payment/review-request in Supabase and starts `scheduleInitialReviewRequestWorkflow` for it, end to end. It connects with the same `TEMPORAL_ADDRESS`/`TEMPORAL_API_KEY`/`TEMPORAL_NAMESPACE` env vars the worker uses, so it works against a local dev server or Temporal Cloud -- just make sure a worker is already running and polling the `automated-reviews` task queue against that same deployment before starting the script, otherwise it hangs waiting for a result.

## Verification commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
