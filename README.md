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
4. Add `SQUARE_WEBHOOK_SIGNATURE_KEY` if you want signature verification enabled.
5. Set `TEMPORAL_ADDRESS` and `TEMPORAL_NAMESPACE` if you want delayed sends and reminder scheduling.
6. Run the SQL in [supabase/migrations/001_initial.sql](/home/kitts/Documents/dev/personal/automated-reviews/supabase/migrations/001_initial.sql) against your Supabase database.
7. Install dependencies with `pnpm install`.
8. Start the app with `pnpm dev`.
9. Start the Temporal worker with `pnpm --filter @automated-reviews/temporal dev`.

## Product flow

- Sign in with Supabase magic link.
- Bootstrap the first organization from `/app` if the user has no memberships yet.
- Configure review links, Twilio sender, and Square location in `/app/settings`.
- Send Square payments to `POST /api/webhooks/square`.
- Send Twilio inbound messages and delivery callbacks to `POST /api/webhooks/twilio`.
- Positive review prompts use tracked links at `/r/:token` so the platform can detect clicks.
- Delayed initial asks and 2-day reminder logic run through the Temporal worker when configured.

## Verification commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
