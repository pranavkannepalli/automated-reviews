#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STATUS="$(supabase status -o env)"

API_URL="$(printf '%s\n' "$STATUS" | awk -F= '/^API_URL=/{sub(/^"/,"",$2); sub(/"$/,"",$2); print $2}')"
ANON_KEY="$(printf '%s\n' "$STATUS" | awk -F= '/^ANON_KEY=/{sub(/^"/,"",$2); sub(/"$/,"",$2); print $2}')"
SERVICE_ROLE_KEY="$(printf '%s\n' "$STATUS" | awk -F= '/^SERVICE_ROLE_KEY=/{sub(/^"/,"",$2); sub(/"$/,"",$2); print $2}')"

cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_APP_URL=http://localhost:3100
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3100
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
TWILIO_AUTH_TOKEN=
SQUARE_WEBHOOK_SIGNATURE_KEY=
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
EOF

echo "Wrote apps/web/.env.local"
