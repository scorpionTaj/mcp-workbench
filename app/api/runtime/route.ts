import { NextRequest, NextResponse } from "next/server";
import { getEnvironment } from "@/lib/runtime-detection";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/runtime
 * Detect available runtimes and package managers
 */
export async function GET(request: NextRequest) {
  try {
    logger.info("MCP Workbench Detecting runtime environment via API");

    const environment = await getEnvironment();

    return NextResponse.json({
      success: true,
      data: environment,
    });
  } catch (error: any) {
    logger.error(
      { error: error.message },
      "MCP Workbench Failed to detect runtime environment"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect runtime environment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
