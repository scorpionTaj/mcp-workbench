import { NextResponse } from "next/server";
import type { MCPServer } from "@/lib/types";
import logger from "@/lib/logger";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";

// Mock installed servers - in production, this would read from a database or config file
const INSTALLED_SERVERS: MCPServer[] = [];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = "tools:installed_servers";

    // Try cache first
    const cached = await cacheGet<MCPServer[]>(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached);
    }

    // Cache miss - return servers and cache them
    await cacheSet(cacheKey, INSTALLED_SERVERS, TTL.MEDIUM);

    return NextResponse.json(INSTALLED_SERVERS);
  } catch (error) {
    logger.error({ err: error }, "Error fetching installed servers");
    return NextResponse.json(
      { error: "Failed to fetch installed servers" },
      { status: 500 }
    );
  }
}
