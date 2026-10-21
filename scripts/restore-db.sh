#!/bin/bash
# Restore a backup made by backup-db.sh into the production compose database.
set -euo pipefail

FILE=${1:?Usage: scripts/restore-db.sh <backup.sql.gz>}
[ -f "$FILE" ] || { echo "Not found: $FILE"; exit 1; }

read -rp "This replaces the current database with $FILE. Type 'yes' to continue: " confirm
[ "$confirm" = yes ] || { echo "Cancelled."; exit 0; }

COMPOSE="docker compose -f docker/compose/docker-compose.yml"
# Compose looks for .env next to the compose file; point it at the repo-root one.
if [ -f .env ]; then COMPOSE="docker compose --env-file .env -f docker/compose/docker-compose.yml"; fi

gunzip -c "$FILE" | $COMPOSE exec -T postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'
echo "Restored."
