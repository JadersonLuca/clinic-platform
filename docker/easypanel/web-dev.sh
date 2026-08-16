#!/bin/sh
set -eu

cd /app

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Starting web in development mode..."
exec pnpm --filter @clinic/web dev
