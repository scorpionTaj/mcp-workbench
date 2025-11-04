import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  let serverId: string | undefined;
  try {
    const resolvedParams = await params;
    serverId = resolvedParams.serverId;

    // In production, this would:
    // 1. Update the server's enabled status in the database
    // 2. Start or stop the MCP server process
    // 3. Update the MCP client connections

    logger.info(`MCP Workbench Toggling MCP server: ${serverId}`);

    return NextResponse.json({ success: true, serverId });
  } catch (error) {
    logger.error(
      { err: error, serverId },
      "MCP Workbench Error toggling server"
    );
    return NextResponse.json(
      { error: "Failed to toggle server" },
      { status: 500 }
    );
  }
}
