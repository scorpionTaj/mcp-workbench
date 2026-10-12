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

Set `POSTGRES_PASSWORD` and `ENCRYPTION_KEY` (`openssl rand -base64 32`) in `.env`, then:

```bash
bun run docker:prod                                   # build and start
docker compose -f docker/compose/docker-compose.yml --profile cache up -d   # also start Redis (set REDIS_URL=redis://redis:6379)
DATABASE_URL=postgresql://mcpworkbench:$POSTGRES_PASSWORD@localhost:5432/mcpworkbench bun run db:migrate
```

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
