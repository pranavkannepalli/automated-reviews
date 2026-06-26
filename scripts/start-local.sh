#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

if [[ ! -f apps/web/.env.local ]]; then
  echo "apps/web/.env.local is missing. Run scripts/setup-local-env.sh after supabase start."
  exit 1
fi

docker compose -f docker-compose.temporal.yml up -d
pnpm proxy &
PROXY_PID=$!
pnpm --filter web dev &
WEB_PID=$!
pnpm --filter @automated-reviews/temporal dev &
WORKER_PID=$!

cleanup() {
  kill "$PROXY_PID" "$WEB_PID" "$WORKER_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait
