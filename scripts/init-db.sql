#!/bin/bash
# ============================================================================
# MCP Workbench - Database Initialization Script
# Run on first container startup
# ============================================================================

set -e

echo "🚀 Initializing MCP Workbench database..."

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- Log initialization
    SELECT 'Database initialized successfully' AS status;
EOSQL

echo "✅ Database initialization complete!"
