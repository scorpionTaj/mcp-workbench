import { NextResponse } from "next/server";
import type { Dataset } from "@/lib/types";
import logger from "@/lib/logger";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";

// Mock datasets - in production, this would read from a database
const DATASETS: Dataset[] = [];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = "datasets:all";

    // Try cache first
    const cached = await cacheGet<Dataset[]>(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached);
    }

    // Cache miss - return datasets and cache them
    await cacheSet(cacheKey, DATASETS, TTL.MEDIUM);

    return NextResponse.json(DATASETS);
  } catch (error) {
    logger.error({ err: error }, "Error fetching datasets");
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}
