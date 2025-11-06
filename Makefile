# ============================================================================
# MCP Workbench - Makefile
# Convenient shortcuts for common tasks
# ============================================================================

.PHONY: help install dev build start clean docker-dev docker-prod deploy backup restore test lint

# Default target
help:
	@echo "MCP Workbench - Available Commands"
	@echo "==================================="
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make quick-start  - Quick development setup (Docker + App)"
	@echo ""
	@echo "Production:"
	@echo "  make build        - Build production bundle"
	@echo "  make start        - Start production server"
	@echo "  make deploy       - Deploy to production"
	@echo "  make optimize     - Optimize production build"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-dev   - Start Docker development environment"
	@echo "  make docker-prod  - Start Docker production environment"
	@echo "  make docker-stop  - Stop all Docker services"
	@echo "  make docker-clean - Remove all Docker containers and volumes"
	@echo ""
	@echo "Database:"
	@echo "  make backup       - Backup database"
	@echo "  make restore      - Restore database (specify file with FILE=...)"
	@echo "  make migrate      - Run database migrations"
	@echo ""
	@echo "Staging:"
	@echo "  make staging      - Setup staging environment"
	@echo "  make blue-green   - Blue-green deployment"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make logs         - View application logs"
	@echo "  make health       - Check application health"
	@echo "  make stats        - View Docker container stats"

# Installation
install:
	@echo "📦 Installing dependencies..."
	bun install

# Development
dev:
	@echo "🚀 Starting development server..."
	bun run dev

quick-start:
	@echo "🚀 Quick start (Docker + App)..."
	chmod +x scripts/quick-start.sh
	./scripts/quick-start.sh

# Production
build:
	@echo "🏗️  Building production bundle..."
	NODE_ENV=production bun run build

start:
	@echo "▶️  Starting production server..."
	NODE_ENV=production bun run start

deploy:
	@echo "🚀 Deploying to production..."
	chmod +x scripts/deploy.sh
	./scripts/deploy.sh

optimize:
	@echo "⚡ Optimizing production build..."
	chmod +x scripts/build-optimize.sh
	./scripts/build-optimize.sh

# Docker
docker-dev:
	@echo "🐳 Starting Docker development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development environment ready!"
	@echo "   App: http://localhost:3000"

docker-prod:
	@echo "🐳 Starting Docker production environment..."
	docker-compose up -d
	@echo "✅ Production environment ready!"
	@echo "   App: http://localhost:3000"

docker-admin:
	@echo "🐳 Starting Docker with admin tools..."
	docker-compose --profile admin up -d
	@echo "✅ Services ready!"
	@echo "   App: http://localhost:3000"
	@echo "   pgAdmin: http://localhost:5050"
	@echo "   Redis Commander: http://localhost:8081"

docker-stop:
	@echo "⏹️  Stopping Docker services..."
	docker-compose down
	docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	@echo "✅ Services stopped"

docker-clean:
	@echo "⚠️  WARNING: This will remove all containers and volumes!"
	@read -p "Continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Database
backup:
	@echo "💾 Creating database backup..."
	chmod +x scripts/backup-db.sh
	./scripts/backup-db.sh

restore:
ifndef FILE
	@echo "❌ Please specify backup file: make restore FILE=backups/database/backup_xxx.sql.gz"
	@exit 1
endif
	@echo "📦 Restoring database from $(FILE)..."
	chmod +x scripts/restore-db.sh
	./scripts/restore-db.sh $(FILE)

migrate:
	@echo "🗄️  Running database migrations..."
	bun run drizzle-kit push

# Staging
staging:
	@echo "🎭 Setting up staging environment..."
	chmod +x scripts/setup-staging.sh
	./scripts/setup-staging.sh

blue-green:
	@echo "🔄 Blue-green deployment..."
	chmod +x scripts/blue-green-deploy.sh
	./scripts/blue-green-deploy.sh

# Maintenance
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .next out node_modules/.cache
	@echo "✅ Cleanup complete"

logs:
	@echo "📋 Viewing application logs..."
	docker-compose logs -f app

logs-all:
	@echo "📋 Viewing all service logs..."
	docker-compose logs -f

health:
	@echo "🏥 Checking application health..."
	@curl -f http://localhost:3000/api/health | jq . || echo "❌ Health check failed"

stats:
	@echo "📊 Docker container statistics:"
	docker stats --no-stream

# Testing (placeholder for future tests)
test:
	@echo "🧪 Running tests..."
	@echo "⚠️  No tests configured yet"

lint:
	@echo "🔍 Running linter..."
	bun run lint

# Shortcuts
.PHONY: up down restart ps
up: docker-prod
down: docker-stop
restart: down up
ps:
	docker-compose ps
