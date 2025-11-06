#!/bin/bash
# ============================================================================
# MCP Workbench - Blue-Green Deployment Script
# Zero-downtime deployment with automatic rollback
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE_BLUE="docker-compose.blue.yml"
COMPOSE_FILE_GREEN="docker-compose.green.yml"
NGINX_CONF="/etc/nginx/sites-available/mcp-workbench"
HEALTH_CHECK_RETRIES=20
HEALTH_CHECK_INTERVAL=3

# State file to track active environment
STATE_FILE=".deployment-state"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Get current active environment
get_active_env() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "blue"
    fi
}

# Get inactive environment
get_inactive_env() {
    local active=$(get_active_env)
    if [ "$active" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Get compose file for environment
get_compose_file() {
    local env=$1
    if [ "$env" == "blue" ]; then
        echo "$COMPOSE_FILE_BLUE"
    else
        echo "$COMPOSE_FILE_GREEN"
    fi
}

# Get port for environment
get_port() {
    local env=$1
    if [ "$env" == "blue" ]; then
        echo "3001"
    else
        echo "3002"
    fi
}

# Health check
health_check() {
    local port=$1
    local retries=0

    log_info "Performing health checks on port $port..."

    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        if curl -f -s "http://localhost:$port/api/health" > /dev/null 2>&1; then
            log_success "Health check passed!"
            return 0
        fi

        retries=$((retries + 1))
        log_warning "Health check attempt $retries/$HEALTH_CHECK_RETRIES failed, retrying..."
        sleep $HEALTH_CHECK_INTERVAL
    done

    log_error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Switch traffic
switch_traffic() {
    local target_env=$1
    local target_port=$(get_port "$target_env")

    log_info "Switching traffic to $target_env environment (port $target_port)..."

    # Update nginx configuration
    if [ -f "$NGINX_CONF" ]; then
        sudo sed -i "s/proxy_pass http:\/\/localhost:[0-9]\+/proxy_pass http:\/\/localhost:$target_port/" "$NGINX_CONF"
        sudo nginx -t && sudo systemctl reload nginx
        log_success "Traffic switched to $target_env"
    else
        log_warning "Nginx config not found, manual traffic switching required"
    fi

    # Update state file
    echo "$target_env" > "$STATE_FILE"
}

# Deploy to environment
deploy_to_env() {
    local target_env=$1
    local compose_file=$(get_compose_file "$target_env")
    local target_port=$(get_port "$target_env")

    log_info "Deploying to $target_env environment..."

    # Stop any existing containers
    if docker-compose -f "$compose_file" ps | grep -q "Up"; then
        log_info "Stopping existing $target_env containers..."
        docker-compose -f "$compose_file" down
    fi

    # Start new containers
    log_info "Starting $target_env containers on port $target_port..."
    export APP_PORT=$target_port
    docker-compose -f "$compose_file" up -d --build

    # Wait for startup
    sleep 10

    # Health check
    if ! health_check "$target_port"; then
        log_error "Deployment to $target_env failed!"
        docker-compose -f "$compose_file" down
        return 1
    fi

    log_success "$target_env environment deployed successfully"
    return 0
}

# Main deployment
main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         MCP Workbench - Blue-Green Deployment                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local active_env=$(get_active_env)
    local inactive_env=$(get_inactive_env)

    log_info "Current active environment: $active_env"
    log_info "Deploying to inactive environment: $inactive_env"
    echo ""

    # Deploy to inactive environment
    if ! deploy_to_env "$inactive_env"; then
        log_error "Deployment failed!"
        exit 1
    fi

    # Ask for confirmation to switch traffic
    echo ""
    log_warning "Ready to switch traffic from $active_env to $inactive_env"
    read -p "Do you want to proceed? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_warning "Traffic switch cancelled. New environment is running but not active."
        log_info "To switch manually, run: ./scripts/blue-green-deploy.sh switch $inactive_env"
        exit 0
    fi

    # Switch traffic
    switch_traffic "$inactive_env"

    # Wait a bit to ensure traffic is flowing
    sleep 5

    # Stop old environment
    log_info "Stopping old $active_env environment..."
    local old_compose_file=$(get_compose_file "$active_env")
    docker-compose -f "$old_compose_file" down

    echo ""
    log_success "Blue-green deployment completed successfully!"
    log_info "Active environment: $inactive_env"
    log_info "Application available at: http://localhost:$(get_port $inactive_env)"
}

# Handle command line arguments
if [ "$1" == "switch" ] && [ -n "$2" ]; then
    switch_traffic "$2"
    exit 0
elif [ "$1" == "status" ]; then
    echo "Active environment: $(get_active_env)"
    exit 0
else
    main
fi
