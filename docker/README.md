# Docker

```
docker/
├── Dockerfile                    # Bun build → Node standalone runtime (non-root, healthcheck)
└── compose/
    ├── docker-compose.yml        # Production: Postgres (pgvector) + app, optional Redis
    └── docker-compose.dev.yml    # Dev: Postgres (pgvector) only; run the app with `bun run dev`
```

All commands run from the repo root.

## Development

```bash
bun run docker:dev     # Postgres on 127.0.0.1:5432 (user mcpworkbench / dev_password)
bun run db:migrate
bun run dev
```

## Production

Set `POSTGRES_PASSWORD`, `ENCRYPTION_KEY`, `BETTER_AUTH_SECRET` (both `openssl rand -base64 32`) and
`BETTER_AUTH_URL` (the public URL) in the repo-root `.env`, then:

```bash
bun run docker:prod                                   # build and start
docker compose --env-file .env -f docker/compose/docker-compose.yml --profile cache up -d   # also start Redis (set REDIS_URL=redis://redis:6379)
DATABASE_URL=postgresql://mcpworkbench:$POSTGRES_PASSWORD@localhost:5432/mcpworkbench bun run db:migrate
```

When calling `docker compose` yourself, pass `--env-file .env`: without it Compose looks for `.env`
next to the compose file and the required-variable checks fail. Variables exported in the shell work too.

**Environment.** The `app` service loads the whole repo-root `.env` (`env_file`, optional), so every
setting in `.env.example` applies in the container: email (`RESEND_API_KEY` / `SMTP_URL`, `EMAIL_FROM`),
`RATE_LIMIT`, `SCHEDULER`, `ALLOW_PRIVATE_PROVIDER_URLS`, OAuth, `REDIS_URL` and so on. The compose file
overrides a few values so local-dev entries in the same `.env` can't break the container:

- `DATABASE_URL` points at the `postgres` service (built from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`).
- `UPLOAD_DIR` is fixed to `/app/storage/uploads`, where the `uploads` volume is mounted.
- `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, `PORT=3000` (change the host port with `APP_PORT`).

**Provider keys.** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (and any other
`<PROVIDER>_API_KEY`) in `.env` now reach the container and act as server-wide fallback keys. On a public
deployment, set `SERVER_KEYS=admins` or `SERVER_KEYS=off` so strangers who sign up can't spend them,
optionally with `SERVER_KEYS_DAILY_LIMIT_USD`, and keep `ALLOW_PRIVATE_PROVIDER_URLS=false`.

Volumes: `postgres_data`, `redis_data`, `uploads` (mounted at `/app/storage/uploads`).

### Upgrading from public uploads

Uploads used to live in `public/uploads`, where anyone with a link could download them. They are now
stored in `storage/uploads` (or `UPLOAD_DIR`) and served only to their owner. Move existing files once:

```bash
bun scripts/migrate-uploads.ts
```

With Docker, the `uploads` volume is mounted at the new path, so files from an older image keep working
once the container is recreated.

## Backups

```bash
make backup                                   # → backups/database/backup_<timestamp>.sql.gz (7-day rotation)
make restore FILE=backups/database/backup_x.sql.gz
```
