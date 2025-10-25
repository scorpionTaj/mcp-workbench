import { NextResponse } from "next/server";
import { checkModelLoaded } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

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

    console.log("MCP Workbench Checking if model is loaded:", {
      provider,
      modelId,
    });

    const status = await checkModelLoaded(provider as LLMProvider, modelId);

    console.log("MCP Workbench Model status:", status);

    if (!status.loaded) {
      return NextResponse.json(
        { loaded: false, error: status.error },
        { status: 200 }
      );
    }

    return NextResponse.json({ loaded: true });
  } catch (error) {
    console.error("MCP Workbench Error checking model status:", error);
    return NextResponse.json(
      { error: "Failed to check model status" },
      { status: 500 }
    );
  }
}
