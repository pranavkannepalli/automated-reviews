# Deployment

Two pieces ship separately: the Next.js app (`apps/web`) and the Temporal worker (`packages/temporal`). ~5 min if you already have the env values below.

## 1. Env vars

One set, shared by both pieces (the worker reads the same `.env.local`/env file as the web app):

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only, never expose to the client |
| `NEXT_PUBLIC_APP_URL` | yes | public URL of the deployed web app, e.g. `https://yourapp.com` |
| `TEMPORAL_ADDRESS` | yes (worker) | `host:port`, e.g. Temporal Cloud `<namespace>.tmprl.cloud:7233` |
| `TEMPORAL_NAMESPACE` | yes (worker) | defaults to `"default"` if unset |
| `TEMPORAL_API_KEY` | only for Temporal Cloud | enables TLS automatically when set |
| `TWILIO_AUTH_TOKEN` | for live SMS | also set the org's Twilio SID/number in `/app/settings`, not env |
| `BEEPER_ACCESS_TOKEN` | only if using the Beeper fallback | requires Beeper Desktop reachable from the worker |
| `BEEPER_API_URL` | only with Beeper | defaults `http://127.0.0.1:23373`; see worker networking note below |
| `BEEPER_ACCOUNT_ID` | optional | only if Beeper Desktop has multiple accounts |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | for webhook verification | from the Square dashboard |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | recommended | enables smart reply classification/answers; falls back to keyword matching if unset |
| `GEMINI_MODEL` | optional | defaults `gemini-2.5-flash` |
| `INTERNAL_TRIGGER_SECRET` | yes | shared secret for internal trigger endpoints |

## 2. Deploy the web app

Any Next.js host works (Vercel is the path of least resistance):

1. Push `main` to your host, set the env vars above on the project.
2. Build command `pnpm build` (already `pnpm --filter web build` under the hood), output is the standard Next.js app — no special config.
3. Run the SQL in `supabase/migrations/001_initial.sql` against your Supabase project if you haven't already.

## 3. Deploy the Temporal worker

Worker is a long-running process, not a serverless function — needs its own host (small VM/container service: Fly.io, Railway, a droplet, etc.).

**Docker (recommended):**
```
docker compose -f docker-compose.temporal.yml up --build worker
```
This expects `apps/web/.env.local` to exist locally with the vars above (it's loaded via `env_file`). For production, instead build and run `packages/temporal/Dockerfile` directly against your real Temporal Cloud address, passing env vars through your host's secret manager instead of a checked-in `.env.local`.

**Bare process (no Docker):** there's no compiled build step — the worker runs straight off `tsx`.
```
pnpm install
pnpm exec tsx packages/temporal/src/worker.ts
```
Run it under a process manager (systemd, pm2, etc.) so it restarts if it crashes — `pnpm --filter @automated-reviews/temporal dev` is the watch-mode dev script, not meant for production.

If you're pointing at Temporal Cloud, just set `TEMPORAL_ADDRESS`/`TEMPORAL_NAMESPACE`/`TEMPORAL_API_KEY` — no local Temporal server needed (the `temporal` service in the compose file is only for local dev).

**Beeper note:** Beeper Desktop has no cloud/headless mode — it must be running on a machine the worker can reach. If the worker is containerized on the same host as Beeper Desktop, `BEEPER_API_URL=http://host.docker.internal:23373` (already set in `docker-compose.temporal.yml`). If the worker runs on a remote host, Beeper Desktop needs to be reachable over the network from there (e.g. a tunnel) — drop the Beeper vars entirely once Twilio numbers are verified, at which point this requirement goes away.

## 4. Wire up webhooks

Point these at your deployed app URL:
- Square → `POST https://yourapp.com/api/webhooks/square`
- Twilio → `POST https://yourapp.com/api/webhooks/twilio`

## 5. Smoke test

- `node scripts/test-beeper-send.mjs +1XXXXXXXXXX "test"` — Beeper Desktop reachability, no app/DB/Temporal involved.
- `pnpm --filter @automated-reviews/temporal test:workflow +1XXXXXXXXXX` — full Temporal workflow against your real deployment (worker must already be running and polling).
