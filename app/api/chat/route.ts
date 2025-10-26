import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, provider, systemPrompt, tools } = body;

    console.log("MCP Workbench Chat API called:", {
      model,
      provider,
      messagesCount: messages?.length,
    });

    if (!model || !provider) {
      return NextResponse.json(
        { error: "Model and provider are required" },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider as LLMProvider];
    if (!config) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Build messages array with system prompt if provided
    const apiMessages = [];
    if (systemPrompt) {
      apiMessages.push({ role: "system", content: systemPrompt });
    }
    apiMessages.push(
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    );

    // Get API key - first check database, then fall back to environment variable
    let apiKey: string | undefined;

    if (config.requiresApiKey) {
      // Try to get API key from database
      const providerConfig = await prisma.providerConfig.findUnique({
        where: { provider },
      });

      apiKey =
        providerConfig?.apiKey ||
        (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);

      if (!apiKey) {
        return NextResponse.json(
          {
            error: `API key required for ${provider}. Please configure it in the Providers page.`,
          },
          { status: 400 }
        );
      }
    }

    console.log("MCP Workbench Sending to LLM:", {
      provider,
      model,
      url:
        provider === "google"
          ? `${config.baseUrl}${config.chatCompletionsEndpoint}`.replace(
              "{model}",
              model
            )
          : `${config.baseUrl}${config.chatCompletionsEndpoint}`,
      messagesCount: apiMessages.length,
    });

    // Call the appropriate LLM API using configured endpoints
    let response;
    if (provider === "ollama") {
      response = await fetch(
        `${config.baseUrl}${config.chatCompletionsEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: apiMessages,
            stream: false,
          }),
        }
      );
    } else if (provider === "lmstudio") {
      response = await fetch(
        `${config.baseUrl}${config.chatCompletionsEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: apiMessages,
            stream: false,
          }),
        }
      );
    } else if (provider === "google") {
      // Google Gemini uses a different API format
      const endpoint =
        `${config.baseUrl}${config.chatCompletionsEndpoint}`.replace(
          "{model}",
          model
        );

      // Convert messages to Gemini format
      const contents = apiMessages.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey || "",
        },
        body: JSON.stringify({ contents }),
      });
    } else if (config.type === "remote" && config.requiresApiKey) {
      // Handle other remote providers (OpenAI, Anthropic, etc.)
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authentication headers
      if (config.defaultHeaders && apiKey) {
        Object.entries(config.defaultHeaders).forEach(([key, value]) => {
          headers[key] = value.replace("{API_KEY}", apiKey);
        });
      } else if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Anthropic uses a different message format
      if (provider === "anthropic") {
        // Extract system message
        const systemMsg = apiMessages.find((m: any) => m.role === "system");
        const userMessages = apiMessages.filter(
          (m: any) => m.role !== "system"
        );

        response = await fetch(
          `${config.baseUrl}${config.chatCompletionsEndpoint}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: userMessages,
              ...(systemMsg && { system: systemMsg.content }),
              max_tokens: 4096,
            }),
          }
        );
      } else {
        // Standard OpenAI-compatible format
        response = await fetch(
          `${config.baseUrl}${config.chatCompletionsEndpoint}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: apiMessages,
              stream: false,
            }),
          }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MCP Workbench LLM API error:", response.status, errorText);

      // Try to parse error message from response
      let errorMessage = `LLM API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error && typeof errorData.error === "string") {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If parsing fails, use the raw error text if it's short enough
        if (errorText.length < 200) {
          errorMessage = errorText;
        }
      }

      // Return user-friendly error
      return NextResponse.json(
        {
          error: errorMessage,
          details: `Status: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("MCP Workbench LLM response received:", {
      provider,
      hasContent: !!data,
      usage: data.usage,
    });

    // Extract content and reasoning based on provider response format
    let content = "";
    let reasoning = "";
    let tokensIn = 0;
    let tokensOut = 0;

    if (provider === "ollama") {
      content = data.message?.content || "";
      // Ollama provides token counts
      tokensIn = data.prompt_eval_count || 0;
      tokensOut = data.eval_count || 0;
    } else if (provider === "lmstudio") {
      const message = data.choices?.[0]?.message;
      content = message?.content || "";

      // LM Studio provides OpenAI-compatible usage stats
      if (data.usage) {
        tokensIn = data.usage.prompt_tokens || 0;
        tokensOut = data.usage.completion_tokens || 0;
      }

      // Check for reasoning content in the response
      if (message?.reasoning) {
        reasoning = message.reasoning;
      }

      // Extract thinking tags
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
      const reasoningMatch = content.match(
        /<reasoning>([\s\S]*?)<\/reasoning>/i
      );

      if (thinkMatch) {
        reasoning = thinkMatch[1].trim();
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      } else if (reasoningMatch) {
        reasoning = reasoningMatch[1].trim();
        content = content
          .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
          .trim();
      }
    } else if (provider === "google") {
      // Google Gemini response format
      const candidate = data.candidates?.[0];
      content = candidate?.content?.parts?.[0]?.text || "";

      // Gemini usage metadata
      if (data.usageMetadata) {
        tokensIn = data.usageMetadata.promptTokenCount || 0;
        tokensOut = data.usageMetadata.candidatesTokenCount || 0;
      }
    } else if (provider === "anthropic") {
      // Anthropic Claude response format
      content = data.content?.[0]?.text || "";

      // Claude usage stats
      if (data.usage) {
        tokensIn = data.usage.input_tokens || 0;
        tokensOut = data.usage.output_tokens || 0;
      }
    } else {
      // Standard OpenAI-compatible format
      const message = data.choices?.[0]?.message;
      content = message?.content || "";

      if (data.usage) {
        tokensIn = data.usage.prompt_tokens || 0;
        tokensOut = data.usage.completion_tokens || 0;
      }

      // Check for reasoning content
      if (message?.reasoning) {
        reasoning = message.reasoning;
      }

      // Extract thinking tags
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
      const reasoningMatch = content.match(
        /<reasoning>([\s\S]*?)<\/reasoning>/i
      );

      if (thinkMatch) {
        reasoning = thinkMatch[1].trim();
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      } else if (reasoningMatch) {
        reasoning = reasoningMatch[1].trim();
        content = content
          .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
          .trim();
      }
    }

    console.log("MCP Workbench Returning content:", {
      contentLength: content.length,
      hasReasoning: !!reasoning,
      reasoningLength: reasoning.length,
      tokensIn,
      tokensOut,
      totalTokens: tokensIn + tokensOut,
    });

    return NextResponse.json({
      content,
      reasoning,
      tokensIn,
      tokensOut,
      toolCalls: [], // TODO: Implement MCP tool calls
    });
  } catch (error) {
    console.error("MCP Workbench Chat API error:", error);
    console.error("MCP Workbench Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
