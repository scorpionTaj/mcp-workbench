import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    // In production, this would:
    // 1. Update the server's enabled status in the database
    // 2. Start or stop the MCP server process
    // 3. Update the MCP client connections

    console.log(`MCP Workbench Toggling MCP server: ${serverId}`);

    return NextResponse.json({ success: true, serverId });
  } catch (error) {
    console.error("MCP Workbench Error toggling server:", error);
    return NextResponse.json(
      { error: "Failed to toggle server" },
      { status: 500 }
    );
  }
}
