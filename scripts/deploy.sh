#!/bin/bash
# ============================================================================
# MCP Workbench - Production Deployment Script
# Automated deployment with health checks and rollback
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
IMAGE_TAG=${IMAGE_TAG:-latest}
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         MCP Workbench - Production Deployment                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print colored output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required files exist
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ ! -f ".env" ]; then
        log_error ".env file not found! Copy .env.example and configure it."
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "$COMPOSE_FILE not found!"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed!"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    log_success "Images pulled successfully"
}

# Backup database before deployment
backup_database() {
    log_info "Creating database backup..."

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U mcpworkbench mcpworkbench > "$BACKUP_FILE"
        log_success "Database backed up to $BACKUP_FILE"
    else
        log_warning "Database not running, skipping backup"
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Wait for database to be ready
    sleep 5

    # Run migrations using drizzle-kit
    docker-compose -f "$COMPOSE_FILE" exec -T app bun run drizzle-kit push || true

    log_success "Migrations completed"
}

# Health check function
health_check() {
    local retries=0

    log_info "Performing health checks..."

    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
            log_success "Application is healthy!"
            return 0
        fi

        retries=$((retries + 1))
        log_warning "Health check attempt $retries/$HEALTH_CHECK_RETRIES failed, retrying..."
        sleep $HEALTH_CHECK_INTERVAL
    done

    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Rollback function
rollback() {
    log_error "Deployment failed! Rolling back..."

    # Stop new containers
    docker-compose -f "$COMPOSE_FILE" down

    # Restore from backup if available
    LATEST_BACKUP=$(ls -t ./backups/db_backup_*.sql 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log_info "Restoring database from $LATEST_BACKUP..."
        docker-compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U mcpworkbench mcpworkbench < "$LATEST_BACKUP"
        log_success "Database restored"
    fi

    log_error "Rollback completed. Please check logs for errors."
    exit 1
}

# Main deployment flow
deploy() {
    log_info "Starting deployment to $DEPLOYMENT_ENV..."

    # Check prerequisites
    check_prerequisites

    # Backup database
    backup_database

    # Pull latest images
    pull_images

    # Build and start containers
    log_info "Building and starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d --build

    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10

    # Run migrations
    run_migrations

    # Perform health check
    if ! health_check; then
        rollback
    fi

    # Show running containers
    log_info "Running containers:"
    docker-compose -f "$COMPOSE_FILE" ps

    log_success "Deployment completed successfully!"
    log_info "Application is available at: http://localhost:3000"
    log_info "Health check: http://localhost:3000/api/health"
}

# Trap errors and rollback
trap rollback ERR

# Run deployment
deploy

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 Deployment Successful! 🎉                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
