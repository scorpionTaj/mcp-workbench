import { NextResponse } from "next/server";
import { clearCache } from "@/lib/github-registry";
import logger from "@/lib/logger";

export async function POST() {
  try {
    clearCache();
    return NextResponse.json({ success: true, message: "Cache cleared" });
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Error clearing cache");
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
