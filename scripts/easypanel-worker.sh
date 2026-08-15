#!/bin/sh
set -eu

export NODE_ENV=development

pnpm install --frozen-lockfile
pnpm --filter @clinic/queues build
pnpm --filter @clinic/worker build

export NODE_ENV=production
exec pnpm --filter @clinic/worker start
