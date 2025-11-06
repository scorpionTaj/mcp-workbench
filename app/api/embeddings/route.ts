import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import logger from "@/lib/logger";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

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

    // Only proceed with supported providers
    if (provider !== "ollama" && 
        provider !== "lmstudio" && 
        provider !== "google" && 
        provider !== "huggingface") {
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
      if (!config.embeddingsEndpoint) {
        return NextResponse.json(
          { error: "Embeddings endpoint not configured for this provider" },
          { status: 400 }
        );
      }
      
      // Prepare headers for Ollama
      const ollamaHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (config.defaultHeaders) {
        Object.entries(config.defaultHeaders).forEach(([key, value]) => {
          if (key !== "Content-Type") { // Don't override our explicit content-type
            ollamaHeaders[key] = value;
          }
        });
      }
      
      response = await fetch(`${config.baseUrl}${config.embeddingsEndpoint}`, {
        method: "POST",
        headers: ollamaHeaders,
        body: JSON.stringify({
          model,
          prompt: typeof input === "string" ? input : input[0],
        }),
      });
    } else if (provider === "lmstudio") {
      if (!config.embeddingsEndpoint) {
        return NextResponse.json(
          { error: "Embeddings endpoint not configured for this provider" },
          { status: 400 }
        );
      }
      
      // Prepare headers for LM Studio
      const lmstudioHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (config.defaultHeaders) {
        Object.entries(config.defaultHeaders).forEach(([key, value]) => {
          if (key !== "Content-Type") { // Don't override our explicit content-type
            lmstudioHeaders[key] = value;
          }
        });
      }
      
      response = await fetch(`${config.baseUrl}${config.embeddingsEndpoint}`, {
        method: "POST",
        headers: lmstudioHeaders,
        body: JSON.stringify({
          model,
          input: input, // Can be string or array of strings
        }),
      });
    } else if (provider === "google") {
      // Get API key from database or environment
      let apiKey: string | undefined;
      if (config.requiresApiKey) {
        const providerConfig = await db.query.providerConfigs.findFirst({
          where: eq(schema.providerConfigs.provider, provider),
        });

        if (providerConfig?.apiKey) {
          apiKey = decrypt(providerConfig.apiKey);
        } else if (config.apiKeyEnvVar) {
          apiKey = process.env[config.apiKeyEnvVar];
        }

        if (!apiKey) {
          return NextResponse.json(
            { error: `API key required for ${provider}` },
            { status: 401 }
          );
        }
      }

      // Prepare headers for Google (no auth header, uses query param)
      const googleHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      const endpoint = `${config.baseUrl}/models/${model}:embedContent?key=${apiKey}`;
      response = await fetch(endpoint, {
        method: "POST",
        headers: googleHeaders,
        body: JSON.stringify({
          content: {
            parts: [{
              text: typeof input === "string" ? input : input[0]
            }]
          }
        }),
      });
    } else if (provider === "huggingface") {
      if (!config.embeddingsEndpoint) {
        return NextResponse.json(
          { error: "Embeddings endpoint not configured for this provider" },
          { status: 400 }
        );
      }
      
      // Get API key from database or environment
      let apiKey: string | undefined;
      if (config.requiresApiKey) {
        const providerConfig = await db.query.providerConfigs.findFirst({
          where: eq(schema.providerConfigs.provider, provider),
        });

        if (providerConfig?.apiKey) {
          apiKey = decrypt(providerConfig.apiKey);
        } else if (config.apiKeyEnvVar) {
          apiKey = process.env[config.apiKeyEnvVar];
        }

        if (!apiKey) {
          return NextResponse.json(
            { error: `API key required for ${provider}` },
            { status: 401 }
          );
        }
      }
      
      // Prepare headers for Hugging Face
      const hfHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      };
      
      const endpoint = `${config.baseUrl}${config.embeddingsEndpoint}`;
      response = await fetch(endpoint, {
        method: "POST",
        headers: hfHeaders,
        body: JSON.stringify({
          inputs: input, // Can be string or array of strings
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
    } else if (provider === "google") {
      // Google returns embeddings in a different format
      return NextResponse.json({
        object: "list",
        data: [
          {
            object: "embedding",
            embedding: data.embedding?.values || [],
            index: 0,
          },
        ],
        model: model,
        usage: {
          prompt_tokens: 0,
          total_tokens: 0,
        },
      });
    } else if (provider === "huggingface") {
      // Hugging Face returns embeddings as array
      const embeddings = Array.isArray(data) ? data : [data];
      return NextResponse.json({
        object: "list",
        data: embeddings.map((embedding: any, index: number) => ({
          object: "embedding",
          embedding: Array.isArray(embedding) ? embedding : embedding.embedding || embedding,
          index: index,
        })),
        model: model,
        usage: {
          prompt_tokens: 0,
          total_tokens: 0,
        },
      });
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
