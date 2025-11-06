#!/bin/bash
# ============================================================================
# MCP Workbench - Database Restore Script
# Restore from backup file
# ============================================================================

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-db.sh <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/database/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "📦 Restoring database from: $BACKUP_FILE"

# Restore database
if docker ps | grep -q "mcp-postgres"; then
    gunzip -c "$BACKUP_FILE" | docker exec -i mcp-postgres psql -U mcpworkbench mcpworkbench
    echo "✅ Database restored successfully!"
else
    echo "❌ Database container not running!"
    exit 1
fi
