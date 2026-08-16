#!/bin/sh
set -eu

cd /app

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building workspace packages..."
pnpm --filter @clinic/database build
pnpm --filter @clinic/queues build

echo "Running database migrations..."
cd /app/packages/database
pnpm db:migrate
cd /app

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

echo "Starting API in development mode..."
exec pnpm --filter @clinic/api start:dev
