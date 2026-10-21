#!/bin/bash
# Dump the production compose database to ./backups/database, keeping 7 days.
set -euo pipefail

COMPOSE="docker compose -f docker/compose/docker-compose.yml"
# Compose looks for .env next to the compose file; point it at the repo-root one.
if [ -f .env ]; then COMPOSE="docker compose --env-file .env -f docker/compose/docker-compose.yml"; fi
DIR=./backups/database
FILE="$DIR/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

mkdir -p "$DIR"
$COMPOSE exec -T postgres sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE"
echo "Backup created: $FILE ($(du -h "$FILE" | cut -f1))"
find "$DIR" -name 'backup_*.sql.gz' -mtime +7 -delete
