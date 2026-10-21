.PHONY: help install dev db migrate check build up down logs backup restore

help: ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dependencies
	bun install

db: ## Start dev Postgres (pgvector)
	bun run docker:dev

migrate: ## Apply database migrations
	bun run db:migrate

dev: db ## Start dev DB + Next dev server
	bun run dev

check: ## Typecheck, lint, test
	bun run check

build: ## Production build
	bun run build

up: ## Build and start production stack
	bun run docker:prod

down: ## Stop production stack
	bun run docker:down

logs: ## Tail production logs
	docker compose --env-file .env -f docker/compose/docker-compose.yml logs -f

backup: ## Back up production DB
	bash scripts/backup-db.sh

restore: ## Restore production DB: make restore FILE=backups/database/x.sql.gz
	bash scripts/restore-db.sh $(FILE)
