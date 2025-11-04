import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Legacy completions endpoint (non-chat format)
 * Supports both Ollama and LM Studio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, model, provider, temperature, max_tokens } = body;

    if (!model || !provider || !prompt) {
      return NextResponse.json(
        { error: "Model, provider, and prompt are required" },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider as LLMProvider];
    if (!config) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    logger.info("MCP Workbench Completions API called:", {
      model,
      provider,
      promptLength: prompt.length,
    });

    // Call the appropriate completions endpoint
    let response;
    if (provider === "ollama") {
      response = await fetch(`${config.baseUrl}${config.completionsEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: temperature || 0.7,
            num_predict: max_tokens || 500,
          },
        }),
      });
    } else if (provider === "lmstudio") {
      response = await fetch(`${config.baseUrl}${config.completionsEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          temperature: temperature || 0.7,
          max_tokens: max_tokens || 500,
          stream: false,
        }),
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        "MCP Workbench Completions API error:",
        response.status,
        errorText
      );
      throw new Error(`Completions API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info("MCP Workbench Completions response received");

    // Extract completion based on provider response format
    let completion = "";
    if (provider === "ollama") {
      completion = data.response || "";
    } else if (provider === "lmstudio") {
      completion = data.choices?.[0]?.text || "";
    }

    return NextResponse.json({
      completion,
      usage: data.usage,
    });
  } catch (error) {
    logger.error("MCP Workbench Completions API error:", error);
    return NextResponse.json(
      { error: "Failed to generate completion" },
      { status: 500 }
    );
  }
}
