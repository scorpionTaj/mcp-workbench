import { NextResponse } from "next/server";
import { clearCache } from "@/lib/github-registry";
import { invalidateRegistryCache } from "@/lib/cache";
import logger from "@/lib/logger";
import { withUser } from "@/lib/api";

export const POST = withUser(async (_req, user) => {
  try {
    // Clear both in-memory cache (github-registry) and Redis cache
    clearCache();
    await invalidateRegistryCache();

    logger.info("[API Registry] Cache cleared (both in-memory and Redis)");

    return NextResponse.json({
      success: true,
      message: "Registry cache cleared (in-memory and Redis)",
    });
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Error clearing cache");
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}, { admin: true });
