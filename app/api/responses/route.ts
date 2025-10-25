import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";

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

    console.log("MCP Workbench Responses API called:", {
      model,
      promptLength: prompt.length,
    });

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
      console.error(
        "MCP Workbench Responses API error:",
        response.status,
        errorText
      );
      throw new Error(`Responses API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("MCP Workbench Responses response received");

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP Workbench Responses API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
