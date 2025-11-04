/**
 * Performance API Endpoint
 * Returns cache statistics and performance metrics
 */

import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
  getPerformanceReport,
  getCacheRecommendations,
} from "@/lib/performance";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance
 * Returns performance metrics and cache statistics
 */
export async function GET() {
  try {
    const report = getPerformanceReport(logger);
    const recommendations = getCacheRecommendations();

    return NextResponse.json({
      ...report,
      recommendations,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching performance metrics");
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
}
