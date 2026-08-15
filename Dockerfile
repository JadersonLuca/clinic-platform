FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=development
ENV API_PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "pnpm install && pnpm --filter @clinic/database build && pnpm --filter @clinic/queues build && pnpm --filter @clinic/api build && NODE_ENV=production pnpm --filter @clinic/api start"]
