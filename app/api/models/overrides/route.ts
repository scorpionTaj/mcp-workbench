import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { cachedModelOverrides, upsertModelOverride } from "@/lib/db-cached";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use cached version for better performance
    const overrides = await cachedModelOverrides();
    return NextResponse.json(overrides);
  } catch (error) {
    logger.error({ err: error }, "Error fetching model overrides");
    return NextResponse.json(
      { error: "Failed to fetch overrides" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { provider, modelId, isReasoning } = await request.json();

    // Use cached wrapper that handles invalidation
    const override = await upsertModelOverride(provider, modelId, isReasoning);

    return NextResponse.json(override);
  } catch (error) {
    logger.error({ err: error }, "Error setting model override");
    return NextResponse.json(
      { error: "Failed to set override" },
      { status: 500 }
    );
  }
}
