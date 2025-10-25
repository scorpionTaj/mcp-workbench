import { NextResponse } from "next/server";
import { fetchModelContextProtocolServers } from "@/lib/github-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[API Registry] Fetching MCP servers...");
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      console.warn(
        "[API Registry] No GITHUB_TOKEN found - using multiple sources to maximize coverage"
      );
      console.warn(
        "[API Registry] Add GITHUB_TOKEN to .env.local to avoid rate limits and get more results"
      );
    } else {
      console.log("[API Registry] Using GITHUB_TOKEN for enhanced access");
    }

    const servers = await fetchModelContextProtocolServers(token);

    console.log(
      `[API Registry] Successfully fetched ${servers.length} servers from all sources`
    );

    // Group by source for logging
    const bySource = servers.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log("[API Registry] Servers by source:", bySource);

    return NextResponse.json(servers);
  } catch (error) {
    console.error("[API Registry] Error fetching registry:", error);
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
