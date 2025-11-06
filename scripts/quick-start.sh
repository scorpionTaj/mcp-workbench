#!/bin/bash
# ============================================================================
# MCP Workbench - Quick Start Script
# One-command setup for development
# ============================================================================

set -e

echo "🚀 MCP Workbench - Quick Start"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created. Please update it with your configuration."
        echo "⚠️  Edit .env file and run this script again."
        exit 0
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Run migrations
echo "🗄️  Running database migrations..."
bun run drizzle-kit push || echo "⚠️  Migrations may need manual intervention"

echo ""
echo "✅ Quick start complete!"
echo ""
echo "Application: http://localhost:3000"
echo "Database: localhost:5432"
echo "Redis: localhost:6379"
echo ""
echo "Available commands:"
echo "  bun run dev          - Start development server"
echo "  bun run build        - Build production bundle"
echo "  bun run start        - Start production server"
echo ""
echo "To stop services: docker-compose -f docker-compose.dev.yml down"
