#!/bin/bash
# ============================================================================
# MCP Workbench - Database Backup Script
# Automated backup with rotation
# ============================================================================

set -e

# Configuration
BACKUP_DIR="./backups/database"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Creating database backup..."

# Backup database
if docker ps | grep -q "mcp-postgres"; then
    docker exec mcp-postgres pg_dump -U mcpworkbench mcpworkbench | gzip > "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"

    # Show backup size
    ls -lh "$BACKUP_FILE"

    # Clean old backups
    echo "🧹 Cleaning backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

    echo "✅ Backup complete!"
else
    echo "❌ Database container not running!"
    exit 1
fi
