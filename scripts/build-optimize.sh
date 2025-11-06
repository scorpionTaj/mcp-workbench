#!/bin/bash
# ============================================================================
# MCP Workbench - Production Build Optimization Script
# Analyzes and optimizes production build
# ============================================================================

set -e

echo "🔧 MCP Workbench - Production Build Optimization"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
bun install --frozen-lockfile

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf .next out

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build with optimization
echo -e "${BLUE}Building production bundle...${NC}"
bun run build

# Analyze bundle size
echo ""
echo -e "${GREEN}✅ Build completed!${NC}"
echo ""
echo "Build Analysis:"
echo "==============="

if [ -d ".next" ]; then
    echo -e "${BLUE}Build output:${NC}"
    du -sh .next
    echo ""

    echo -e "${BLUE}Static files:${NC}"
    du -sh .next/static
    echo ""

    echo -e "${BLUE}Server bundle:${NC}"
    du -sh .next/server
    echo ""
fi

# Check for large files
echo -e "${BLUE}Large files (>500KB):${NC}"
find .next -type f -size +500k -exec ls -lh {} \; | awk '{ print $9 ": " $5 }'
echo ""

# Production optimization recommendations
echo -e "${YELLOW}Optimization Recommendations:${NC}"
echo "1. ✅ Code splitting enabled (automatic with Next.js)"
echo "2. ✅ Tree shaking enabled (automatic with production build)"
echo "3. ✅ Minification enabled (automatic)"
echo "4. ✅ Image optimization configured"
echo "5. Consider enabling compression in nginx/reverse proxy"
echo "6. Enable HTTP/2 for better performance"
echo "7. Use CDN for static assets if deploying globally"
echo ""

echo -e "${GREEN}Build optimization complete!${NC}"
