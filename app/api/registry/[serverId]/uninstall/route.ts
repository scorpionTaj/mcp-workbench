import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withUser<{ params: Promise<{ serverId: string }> }>(async (request, user, { params }) => {
  let serverId: string | undefined;
  try {
    const resolvedParams = await params;
    serverId = resolvedParams.serverId;

    // In production, this would:
    // 1. Stop the MCP server if running
    // 2. Remove the server package
    // 3. Clean up configuration
    // 4. Update the installed servers list

    logger.info(`MCP Workbench Uninstalling MCP server: ${serverId}`);

    // Simulate uninstallation delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({ success: true, serverId });
  } catch (error) {
    logger.error(
      { err: error, serverId },
      "MCP Workbench Error uninstalling server"
    );
    return NextResponse.json(
      { error: "Failed to uninstall server" },
      { status: 500 }
    );
  }
});
