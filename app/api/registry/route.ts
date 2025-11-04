import { NextResponse } from "next/server";
import { fetchModelContextProtocolServers } from "@/lib/github-registry";
import { cachedRegistryServers } from "@/lib/db-cached";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    logger.info("[API Registry] Fetching MCP servers...");
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      logger.warn(
        "[API Registry] No GITHUB_TOKEN found - using multiple sources to maximize coverage"
      );
      logger.warn(
        "[API Registry] Add GITHUB_TOKEN to .env.local to avoid rate limits and get more results"
      );
    } else {
      logger.info("[API Registry] Using GITHUB_TOKEN for enhanced access");
    }

    // Wrap the fetch with Redis cache (1 hour TTL)
    const servers = await cachedRegistryServers(async () => {
      const data = await fetchModelContextProtocolServers(token);
      logger.info(
        `[API Registry] Fetched ${data.length} servers from GitHub (cache miss)`
      );
      return data;
    });

    logger.info(
      `[API Registry] Returning ${servers.length} servers (from cache or fresh)`
    );

    // Group by source for logging
    const bySource = servers.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    logger.info({ bySource }, "[API Registry] Servers by source");

    return NextResponse.json(servers);
  } catch (error) {
    logger.error({ err: error }, "[API Registry] Error fetching registry");
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch registry";

    // Return partial data with error info
    return NextResponse.json(
      {
        error: errorMessage,
        servers: [],
        details: error instanceof Error ? error.stack : undefined,
        hint: "If you're seeing rate limit errors, add a GITHUB_TOKEN to your .env.local file",
      },
      {
        status:
          error instanceof Error && errorMessage.includes("404") ? 404 : 500,
      }
    );
  }
}
