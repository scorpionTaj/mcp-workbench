# Docker Configuration

This directory contains all Docker-related files for the MCP Workbench application.

## Structure

```
docker/
├── Dockerfile              # Production Dockerfile (multi-stage build)
├── Dockerfile.dev          # Development Dockerfile (hot reload)
├── .dockerignore           # Docker build context excludes
└── compose/
    ├── docker-compose.yml           # Production compose file
    ├── docker-compose.dev.yml       # Development compose file (hot reload)
    ├── docker-compose.blue.yml      # Blue environment (port 3001)
    └── docker-compose.green.yml     # Green environment (port 3002)
```

## Quick Commands

### Development

```bash
# Start development environment
make docker-dev
# or
docker-compose -f docker/compose/docker-compose.dev.yml up -d

# View logs
make logs
```

### Production

```bash
# Start production environment
make docker-prod
# or
docker-compose -f docker/compose/docker-compose.yml up -d
```

### Blue-Green Deployment

```bash
# Deploy with zero downtime
make blue-green
```

### Management

```bash
# Stop all services
make docker-stop

# Clean up containers and volumes
make docker-clean

# View all logs
make logs-all

# View container status
make ps
```

## Environment Setup

Before running Docker services, ensure your `.env` file is configured:

```bash
# Database
POSTGRES_USER=mcpworkbench
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=mcpworkbench

# Redis
REDIS_PASSWORD=your_secure_redis_password

# Application
NEXTAUTH_SECRET=your_secret_key
ENCRYPTION_KEY=your_encryption_key_32_characters_long
```

## Services

### Production Environment (docker-compose.yml)

- **PostgreSQL** - Database (port 5432)
- **Redis** - Cache layer (port 6379)
- **MCP Workbench** - Next.js application (port 3000)
- **pgAdmin** (optional, profile: admin) - Database management UI (port 5050)
- **Redis Commander** (optional, profile: admin) - Redis management UI (port 8081)

### Development Environment (docker-compose.dev.yml)

- **PostgreSQL** - Database (port 5432)
- **Redis** - Cache layer (port 6379)
- **MCP Workbench Dev** - Next.js dev server with hot reload (port 3000)

## Volumes

### Production

- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence
- `pgadmin_data` - pgAdmin configuration
- `app_logs` - Application logs

### Development

- `postgres_dev_data` - PostgreSQL data for development
- `redis_dev_data` - Redis data for development
- Host volume mounts for live code changes

## Networks

- `mcp-network` - Production network
- `mcp-dev-network` - Development network

## Health Checks

Both Dockerfiles include health checks:

- **Production**: HTTP GET to `/api/health` every 30 seconds
- **Development**: Inherits from base image health checks

## Building Images

```bash
# Build production image
docker build -f docker/Dockerfile -t mcp-workbench:latest .

# Build development image
docker build -f docker/Dockerfile.dev -t mcp-workbench:dev .
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Use different port
docker-compose -f docker/compose/docker-compose.yml -e APP_PORT=3001 up
```

### Database Connection Issues

```bash
# Check database logs
docker-compose -f docker/compose/docker-compose.yml logs postgres

# Reset database
docker-compose -f docker/compose/docker-compose.yml exec postgres dropdb -U mcpworkbench mcpworkbench
```

### Clear Cache

```bash
# Remove all MCP containers and volumes
make docker-clean
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
