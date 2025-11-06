#!/bin/bash
# ============================================================================
# MCP Workbench - Staging Environment Setup
# Creates isolated staging environment
# ============================================================================

set -e

echo "🎭 Setting up Staging Environment"
echo "=================================="
echo ""

# Configuration
STAGING_PORT=3003
STAGING_DB_PORT=5433
STAGING_REDIS_PORT=6380
STAGING_COMPOSE="docker-compose.staging.yml"

# Create staging compose file
cat > "$STAGING_COMPOSE" << EOF
# ============================================================================
# MCP Workbench - Staging Environment
# Isolated environment for testing before production
# ============================================================================

services:
  postgres-staging:
    image: postgres:16-alpine
    container_name: mcp-postgres-staging
    restart: unless-stopped
    environment:
      POSTGRES_USER: mcpworkbench
      POSTGRES_PASSWORD: staging_password
      POSTGRES_DB: mcpworkbench_staging
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    ports:
      - "$STAGING_DB_PORT:5432"
    networks:
      - mcp-staging-network

  redis-staging:
    image: redis:7-alpine
    container_name: mcp-redis-staging
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass staging_redis_password
    volumes:
      - redis_staging_data:/data
    ports:
      - "$STAGING_REDIS_PORT:6379"
    networks:
      - mcp-staging-network

  app-staging:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    container_name: mcp-workbench-staging
    restart: unless-stopped
    depends_on:
      - postgres-staging
      - redis-staging
    environment:
      NODE_ENV: staging
      PORT: $STAGING_PORT
      DATABASE_URL: postgresql://mcpworkbench:staging_password@postgres-staging:5432/mcpworkbench_staging
      REDIS_URL: redis://redis-staging:6379
      REDIS_PASSWORD: staging_redis_password
      CACHE_ENABLED: "true"
      DEPLOYMENT_ENVIRONMENT: staging
    volumes:
      - ./public/uploads:/app/public/uploads
    ports:
      - "$STAGING_PORT:$STAGING_PORT"
    networks:
      - mcp-staging-network

networks:
  mcp-staging-network:
    driver: bridge
    name: mcp-staging-network

volumes:
  postgres_staging_data:
    driver: local
  redis_staging_data:
    driver: local
EOF

echo "✅ Staging compose file created: $STAGING_COMPOSE"
echo ""

# Start staging environment
echo "Starting staging environment..."
docker-compose -f "$STAGING_COMPOSE" up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

# Health check
echo "Performing health check..."
if curl -f -s "http://localhost:$STAGING_PORT/api/health" > /dev/null 2>&1; then
    echo "✅ Staging environment is healthy!"
else
    echo "⚠️  Health check failed, but services are running"
fi

echo ""
echo "🎭 Staging Environment Ready!"
echo "============================="
echo "Application: http://localhost:$STAGING_PORT"
echo "Database: localhost:$STAGING_DB_PORT"
echo "Redis: localhost:$STAGING_REDIS_PORT"
echo ""
echo "To stop staging: docker-compose -f $STAGING_COMPOSE down"
echo "To view logs: docker-compose -f $STAGING_COMPOSE logs -f"
