import { NextResponse } from "next/server";
import { checkModelLoaded } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, modelId } = body;

    if (!provider || !modelId) {
      return NextResponse.json(
        { error: "Provider and modelId are required" },
        { status: 400 }
      );
    }

    logger.info({ provider, modelId }, "Checking if model is loaded");

    const status = await checkModelLoaded(provider as LLMProvider, modelId);

    logger.info({ status }, "Model status");

    if (!status.loaded) {
      return NextResponse.json(
        { loaded: false, error: status.error },
        { status: 200 }
      );
    }

    return NextResponse.json({ loaded: true });
  } catch (error) {
    logger.error({ err: error }, "Error checking model status");
    return NextResponse.json(
      { error: "Failed to check model status" },
      { status: 500 }
    );
  }
}
