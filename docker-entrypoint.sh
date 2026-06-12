#!/bin/sh
set -e

# Refuse to boot on a missing, short, or repo-public AUTH_SECRET so a
# misconfigured instance fails at startup instead of at the first login.
# Keep the placeholder list in sync with src/lib/session.ts.
case "${AUTH_SECRET:-}" in
  "" | \
  "please-change-me-to-a-long-random-secret" | \
  "change-me-to-a-long-random-string-please" | \
  "build-time-placeholder-secret-value-000000" | \
  "dev-secret-please-change-in-production-0000000000")
    echo "[entrypoint] ERROR: AUTH_SECRET is missing or a known placeholder." >&2
    echo "[entrypoint] Generate one with: openssl rand -base64 32" >&2
    exit 1
    ;;
esac
if [ "${#AUTH_SECRET}" -lt 16 ]; then
  echo "[entrypoint] ERROR: AUTH_SECRET is too short — use a long random value." >&2
  exit 1
fi

echo "[entrypoint] applying database migrations…"
node scripts/migrate.mjs

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] seeding demo data…"
  node scripts/seed.mjs || echo "[entrypoint] seed skipped/failed (non-fatal)"
fi

echo "[entrypoint] starting ExcalidrawDash on port ${PORT:-3000}…"
exec node_modules/.bin/next start -p "${PORT:-3000}"
