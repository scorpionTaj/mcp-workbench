import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // In production, this would:
    // 1. Stop the MCP server if running
    // 2. Remove the server package
    // 3. Clean up configuration
    // 4. Update the installed servers list

    console.log(`MCP Workbench Uninstalling MCP server: ${serverId}`);

    // Simulate uninstallation delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({ success: true, serverId });
  } catch (error) {
    console.error("MCP Workbench Error uninstalling server:", error);
    return NextResponse.json(
      { error: "Failed to uninstall server" },
      { status: 500 }
    );
  }
}
