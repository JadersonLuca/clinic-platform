#!/bin/sh
set -eu

export API_PORT="${API_PORT:-3000}"
export NODE_ENV=development

pnpm install --frozen-lockfile
pnpm --filter @clinic/database build
pnpm --filter @clinic/queues build
pnpm --filter @clinic/api build

export NODE_ENV=production
exec pnpm --filter @clinic/api start
