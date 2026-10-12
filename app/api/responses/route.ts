import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * LM Studio /v1/responses endpoint
 * Alternative response format for LM Studio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model } = body;

    if (!model || !prompt) {
      return NextResponse.json(
        { error: "Model and prompt are required" },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS.lmstudio;

    // Check if responses endpoint is configured
    if (!config.responsesEndpoint) {
      return NextResponse.json(
        { error: "Responses endpoint not supported" },
        { status: 400 }
      );
    }

    logger.info(
      {
        model,
        promptLength: prompt.length,
      },
      "MCP Workbench Responses API called"
    );

    const response = await fetch(
      `${config.baseUrl}${config.responsesEndpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText },
        "MCP Workbench Responses API error"
      );
      throw new Error(`Responses API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info("MCP Workbench Responses response received");

    return NextResponse.json(data);
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Responses API error");
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
