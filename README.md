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

## EasyPanel em desenvolvimento

Para subir direto pelo EasyPanel usando build por Dockerfile, use estes arquivos:

- API: `Dockerfile.easypanel-api.dev`
- Web: `Dockerfile.easypanel-web.dev`
- Worker: `Dockerfile.easypanel-worker.dev`

Importante: o contexto de build precisa ser a raiz deste monorepo. Esses Dockerfiles fazem `COPY` de `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `apps/` e `packages/`.

Se o EasyPanel enviar apenas o Dockerfile ou usar uma pasta vazia/parcial como contexto, o build vai falhar com erros como `"/package.json": not found`, `"/apps": not found` ou `"/packages": not found`.

Bind mount/volume no container nao corrige isso. O mount so existe em tempo de execucao; o `docker build` continua usando apenas o contexto enviado para o build.

Configuração esperada no EasyPanel:

- repositório ou upload contendo o monorepo completo
- build context na raiz do projeto
- Dockerfile da API: `Dockerfile.easypanel-api.dev`
- Dockerfile do Web: `Dockerfile.easypanel-web.dev`
- Dockerfile do Worker: `Dockerfile.easypanel-worker.dev`

Configuração sugerida:

- API: porta `3000`, comando padrão do Dockerfile.
- Web: porta `3000`, comando padrão do Dockerfile.
- Worker: sem porta pública, comando padrão do Dockerfile.

Se usar bind mount no EasyPanel, monte a raiz do projeto em `/app`. Estes Dockerfiles de desenvolvimento instalam as dependências e compilam os pacotes internos na inicialização, porque o bind mount substitui o conteúdo gerado durante o build da imagem.

Variáveis mínimas para desenvolvimento:

API:

```env
NODE_ENV=development
API_PORT=3000
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=8h
CORS_ORIGIN=
BOOTSTRAP_TENANT_NAME=
BOOTSTRAP_TENANT_SLUG=
BOOTSTRAP_ORGANIZATION_NAME=
BOOTSTRAP_OWNER_NAME=
BOOTSTRAP_OWNER_EMAIL=
BOOTSTRAP_OWNER_PASSWORD=
```

Web:

```env
NODE_ENV=development
WEB_PORT=3000
API_INTERNAL_BASE_URL=http://NOME_INTERNO_DO_SERVICO_API:3000
```

Worker:

```env
NODE_ENV=development
REDIS_URL=
```
