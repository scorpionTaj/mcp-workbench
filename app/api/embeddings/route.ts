import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Embeddings endpoint for generating vector embeddings
 * Supports both Ollama and LM Studio
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input, model, provider } = body;

    if (!model || !provider || !input) {
      return NextResponse.json(
        { error: "Model, provider, and input are required" },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider as LLMProvider];
    if (!config) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Check if embeddings endpoint is configured
    if (!config.embeddingsEndpoint) {
      return NextResponse.json(
        { error: "Embeddings not supported for this provider" },
        { status: 400 }
      );
    }

    logger.info("MCP Workbench Embeddings API called:", {
      model,
      provider,
      inputType: Array.isArray(input) ? "array" : "string",
      inputLength: Array.isArray(input) ? input.length : 1,
    });

    // Call the embeddings endpoint
    let response;
    if (provider === "ollama") {
      response = await fetch(`${config.baseUrl}${config.embeddingsEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: typeof input === "string" ? input : input[0],
        }),
      });
    } else if (provider === "lmstudio") {
      response = await fetch(`${config.baseUrl}${config.embeddingsEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: input, // Can be string or array of strings
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
        "MCP Workbench Embeddings API error:",
        response.status,
        errorText
      );
      throw new Error(`Embeddings API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info("MCP Workbench Embeddings response received");

    // Format response in OpenAI-compatible format
    if (provider === "ollama") {
      return NextResponse.json({
        object: "list",
        data: [
          {
            object: "embedding",
            embedding: data.embedding,
            index: 0,
          },
        ],
        model: model,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          total_tokens: data.prompt_eval_count || 0,
        },
      });
    } else if (provider === "lmstudio") {
      // LM Studio already returns OpenAI-compatible format
      return NextResponse.json(data);
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("MCP Workbench Embeddings API error:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
