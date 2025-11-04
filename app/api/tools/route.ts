import { NextResponse } from "next/server";
import type { MCPServer } from "@/lib/types";
import logger from "@/lib/logger";

// Mock installed servers - in production, this would read from a database or config file
const INSTALLED_SERVERS: MCPServer[] = [];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // In production, fetch from database or config file
    return NextResponse.json(INSTALLED_SERVERS);
  } catch (error) {
    logger.error(
      { err: error },
      "MCP Workbench Error fetching installed servers"
    );
    return NextResponse.json(
      { error: "Failed to fetch installed servers" },
      { status: 500 }
    );
  }
}
