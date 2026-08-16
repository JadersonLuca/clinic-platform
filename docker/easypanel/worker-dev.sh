#!/bin/sh
set -eu

cd /app

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building workspace packages..."
pnpm --filter @clinic/queues build

echo "Starting worker in development mode..."
exec pnpm --filter @clinic/worker start:dev
