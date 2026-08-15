# clinic-platform

Monorepo da plataforma de clínicas.

## Serviços

- `api`: NestJS API. Ao iniciar, roda migrations do banco e sincroniza o owner quando `BOOTSTRAP_OWNER_EMAIL` e `BOOTSTRAP_OWNER_PASSWORD` estão configurados.
- `web`: Next.js web. Usa cookie `HttpOnly` e proxy interno para autenticação.
- `worker`: processadores de filas BullMQ.

## Deploy

O GitHub Actions publica imagens no GHCR usando:

- `Dockerfile.api`
- `Dockerfile.web`
- `Dockerfile.worker`

No EasyPanel, use as imagens publicadas:

- `ghcr.io/jadersonluca/clinic-platform-api:latest`
- `ghcr.io/jadersonluca/clinic-platform-web:latest`
- `ghcr.io/jadersonluca/clinic-platform-worker:latest`

Depois de fazer push, espere o workflow terminar antes de clicar em deploy.

## Variáveis

API:

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=8h
BOOTSTRAP_OWNER_EMAIL=
BOOTSTRAP_OWNER_PASSWORD=
```

Web:

```env
API_INTERNAL_BASE_URL=http://criativa_clinic:3000
```

`API_INTERNAL_BASE_URL` deve apontar para o DNS interno do serviço API, não para a URL pública.
