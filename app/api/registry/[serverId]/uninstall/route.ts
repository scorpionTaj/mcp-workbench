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
}
