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

Importante: estes Dockerfiles sao para o modo com bind mount em `/app`. Eles nao fazem `COPY` do projeto durante o build.

Esse formato funciona quando o EasyPanel envia apenas o Dockerfile como contexto de build. O codigo entra no container em tempo de execucao pelo bind mount.

Sem o bind mount da raiz do projeto para `/app`, o container nao vai encontrar `package.json`, `apps/`, `packages/` nem os scripts em `docker/easypanel`.

Configuração esperada no EasyPanel:

- Dockerfile colado direto no EasyPanel ou selecionado no projeto
- bind mount da raiz do projeto no servidor para `/app`
- Dockerfile da API: `Dockerfile.easypanel-api.dev`
- Dockerfile do Web: `Dockerfile.easypanel-web.dev`
- Dockerfile do Worker: `Dockerfile.easypanel-worker.dev`

Configuração sugerida:

- API: porta `3000`, comando padrão do Dockerfile.
- Web: porta `3000`, comando padrão do Dockerfile.
- Worker: sem porta pública, comando padrão do Dockerfile.

Monte a raiz do projeto em `/app`. Estes Dockerfiles de desenvolvimento instalam as dependências e compilam os pacotes internos na inicialização, porque o bind mount substitui qualquer conteúdo gerado durante o build da imagem.

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
