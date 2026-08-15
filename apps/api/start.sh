#!/bin/sh
set -eu

echo "Running database migrations..."
pnpm --filter @clinic/database db:migrate

if [ -n "${BOOTSTRAP_OWNER_EMAIL:-}" ] || [ -n "${BOOTSTRAP_OWNER_PASSWORD:-}" ]; then
  if [ -z "${BOOTSTRAP_OWNER_EMAIL:-}" ] || [ -z "${BOOTSTRAP_OWNER_PASSWORD:-}" ]; then
    echo "BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD must be configured together." >&2
    exit 1
  fi

  echo "Syncing bootstrap owner..."
  pnpm --filter @clinic/api auth:bootstrap-owner
else
  echo "Bootstrap owner skipped; BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD are not set."
fi

echo "Starting API..."
exec pnpm --filter @clinic/api start
