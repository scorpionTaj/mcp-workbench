# Project Organization Guide

This document describes the overall organization and directory structure of the MCP Workbench project.

## Directory Structure

```
mcp-workbench/
├── app/                      # Next.js App Router (application code)
│   ├── api/                  # API routes
│   ├── chat/                 # Chat feature pages
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── chat/                 # Chat-related components
│   └── ...                   # Feature-specific components
│
├── config/                   # Configuration files (reference copies)
│   ├── components.json       # shadcn/ui config (reference)
│   ├── drizzle.config.ts     # Drizzle ORM config (reference)
│   ├── next.config.mjs       # Next.js config (reference)
│   ├── postcss.config.mjs    # PostCSS config (reference)
│   ├── tsconfig.json         # TypeScript config (reference)
│   └── README.md             # Configuration documentation
│
├── docker/                   # Docker configuration
│   ├── Dockerfile            # Production Docker image
│   ├── Dockerfile.dev        # Development Docker image
│   ├── .dockerignore         # Docker build excludes
│   ├── compose/
│   │   ├── docker-compose.yml        # Production environment
│   │   ├── docker-compose.dev.yml    # Development environment
│   │   ├── docker-compose.blue.yml   # Blue deployment (port 3001)
│   │   └── docker-compose.green.yml  # Green deployment (port 3002)
│   └── README.md             # Docker documentation
│
├── drizzle/                  # Database migrations
│   ├── 0001_*.sql           # Migration files
│   └── meta/                # Drizzle metadata
│
├── hooks/                    # React custom hooks
│   ├── use-chat.ts
│   ├── use-datasets.ts
│   └── ...
│
├── lib/                      # Utility functions and logic
│   ├── db.ts                # Database connection
│   ├── schema.ts            # Database schema
│   ├── types.ts             # TypeScript type definitions
│   ├── utils.ts             # General utilities
│   └── ...
│
├── public/                   # Static assets
│   └── uploads/             # User uploaded files
│
├── scripts/                  # Utility scripts
│   ├── deploy.sh            # Production deployment
│   ├── blue-green-deploy.sh # Zero-downtime deployment
│   ├── backup-db.sh         # Database backup
│   ├── quick-start.sh       # Quick setup script
│   └── ...
│
├── store/                    # Zustand state management
│   ├── chat-store.ts
│   ├── ui-store.ts
│   └── index.ts
│
├── styles/                   # Global CSS files
│   └── globals.css
│
├── .dockerignore            # Docker build excludes
├── .env.example             # Environment variables template
├── .gitignore               # Git excludes
├── Dockerfile               # ⚠️ Moved to docker/
├── Dockerfile.dev           # ⚠️ Moved to docker/
├── docker-compose.yml       # ⚠️ Moved to docker/compose/
├── docker-compose.dev.yml   # ⚠️ Moved to docker/compose/
├── docker-compose.blue.yml  # ⚠️ Moved to docker/compose/
├── docker-compose.green.yml # ⚠️ Moved to docker/compose/
├── Makefile                 # Build automation
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration (root)
├── next.config.mjs          # Next.js configuration (root)
├── postcss.config.mjs       # PostCSS configuration (root)
├── components.json          # shadcn/ui configuration (root)
├── drizzle.config.ts        # Drizzle ORM configuration (root)
├── README.md                # Project README
└── ROADMAP.txt              # Development roadmap
```

## Key Organizational Changes

### Docker Files (✅ Organized)

All Docker-related files have been consolidated into the `docker/` directory:

```bash
# Before
Dockerfile
Dockerfile.dev
docker-compose.yml
docker-compose.dev.yml
docker-compose.blue.yml
docker-compose.green.yml
.dockerignore

# After
docker/
├── Dockerfile
├── Dockerfile.dev
├── .dockerignore
└── compose/
    ├── docker-compose.yml
    ├── docker-compose.dev.yml
    ├── docker-compose.blue.yml
    └── docker-compose.green.yml
```

**Benefits:**

- Centralized Docker configuration
- Cleaner root directory
- Easy to find deployment files
- Clear separation of concerns

**Updated Commands:**

- `make docker-dev` - Development environment
- `make docker-prod` - Production environment
- `npm run docker:dev` - Using npm scripts
- `docker-compose -f docker/compose/docker-compose.yml up` - Direct command

### Configuration Files

Configuration reference files are in `config/` for documentation:

```bash
config/
├── README.md
├── components.json        # shadcn/ui config reference
├── drizzle.config.ts      # Drizzle ORM config reference
├── next.config.mjs        # Next.js config reference
├── postcss.config.mjs     # PostCSS config reference
└── tsconfig.json          # TypeScript config reference
```

**Note:** Working configuration files **must remain at the root** as required by build tools.

## Development Workflow

### Quick Start

```bash
# Using Makefile
make quick-start

# Or using npm
npm run docker:dev
bun install
```

### Adding Components

```bash
# Components are added to components/ directory
# Use shadcn/ui CLI or create manually
```

### Database Migrations

```bash
# Migrations stored in drizzle/
npm run db:migrate
```

### Deployment

```bash
# Production deployment
make deploy

# Blue-green deployment (zero-downtime)
make blue-green
```

## Common Tasks

### View Docker Logs

```bash
make logs                 # App logs
make logs-all            # All service logs
```

### Database Backup

```bash
make backup              # Create backup
make restore FILE=path   # Restore from backup
```

### Health Check

```bash
make health
```

### Clean Up

```bash
make docker-clean        # Remove containers and volumes
make clean               # Remove build artifacts
```

## Configuration Priority

1. **Environment Variables** (`.env`) - Highest priority
2. **Docker Environment** (docker-compose files)
3. **Build Configuration** (next.config.mjs, tsconfig.json)
4. **Component Configuration** (components.json)
5. **Defaults** - Lowest priority

## Important Files

- **Makefile** - All common commands
- **package.json** - Dependencies and npm scripts
- **.env.example** - Environment variable template
- **docker/README.md** - Docker-specific documentation
- **config/README.md** - Configuration documentation

## Quick Reference Commands

```bash
# Development
make dev                    # Start dev server
make docker-dev            # Start Docker dev environment
make quick-start           # Quick setup with Docker

# Production
make build                 # Build for production
make docker-prod          # Start production Docker
make deploy               # Deploy to production

# Database
make db:migrate           # Run migrations
make backup               # Backup database
make restore FILE=path    # Restore database

# Docker Management
make docker-stop          # Stop all services
make docker-clean         # Clean up containers/volumes
make logs                 # View logs
make ps                   # Container status
make health               # Health check

# Maintenance
make lint                 # Run linter
make clean                # Clean artifacts
```

## Troubleshooting

### Port Conflicts

Docker services use ports 3000, 3001, 3002, 5432, 6379. Ensure these are available or modify `.env`.

### Database Issues

Check postgres logs: `make logs` or `docker-compose -f docker/compose/docker-compose.yml logs postgres`

### Build Issues

Ensure Node.js/Bun versions match requirements in Dockerfile and package.json.

## Getting Help

- Review `docker/README.md` for Docker-specific information
- Review `config/README.md` for configuration details
- Check `Makefile` for all available commands
- See `ROADMAP.txt` for project status
