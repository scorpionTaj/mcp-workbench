import { NextResponse } from "next/server";
import { getAllProvidersStatus } from "@/lib/llm-providers";
import logger from "@/lib/logger";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = "providers:status:all";

    // Try cache first (short TTL as provider status changes frequently)
    const cached = await cacheGet<any>(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached);
    }

    // Cache miss - fetch provider statuses
    const statuses = await getAllProvidersStatus();

    // Cache with shorter TTL (1 minute) since provider status can change
    await cacheSet(cacheKey, statuses, TTL.SHORT);

    return NextResponse.json(statuses);
  } catch (error) {
    logger.error({ err: error }, "Error fetching provider statuses");
    return NextResponse.json(
      { error: "Failed to fetch provider statuses" },
      { status: 500 }
    );
  }
}
