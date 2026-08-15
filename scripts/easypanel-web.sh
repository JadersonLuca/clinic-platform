#!/bin/sh
set -eu

export WEB_PORT="${WEB_PORT:-3000}"
export NODE_ENV=development

pnpm install --frozen-lockfile
pnpm --filter @clinic/web build

export NODE_ENV=production
exec pnpm --filter @clinic/web start
