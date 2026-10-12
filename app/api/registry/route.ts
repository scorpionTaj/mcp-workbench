import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { searchRegistry } from "@/lib/mcp-registry";
import logger from "@/lib/logger";

export const GET = withUser(async (req) => {
  const params = new URL(req.url).searchParams;
  try {
    return NextResponse.json(
      await searchRegistry({
        search: params.get("search")?.slice(0, 100) || undefined,
        cursor: params.get("cursor") || undefined,
        remoteOnly: params.get("remoteOnly") !== "false",
      }),
    );
  } catch (err) {
    logger.warn({ err }, "MCP registry fetch failed");
    return NextResponse.json({ error: "The MCP registry is unavailable right now" }, { status: 502 });
  }
});
