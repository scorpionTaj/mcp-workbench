import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { fetchProviderModels } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (provider !== "ollama" && provider !== "lmstudio") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const models = await fetchProviderModels(provider as LLMProvider);
    return NextResponse.json(models);
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Error fetching models");
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
