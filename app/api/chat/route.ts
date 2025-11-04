import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { decrypt } from "@/lib/encryption";
import {
  isVisionModel,
  isSupportedVisionFileType,
} from "@/lib/vision-detection";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, provider, systemPrompt, tools, attachments } =
      body;

    logger.info(
      {
        model,
        provider,
        messagesCount: messages?.length,
        attachmentsCount: attachments?.length || 0,
      },
      "Chat API called"
    );

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

    // Check if model supports vision
    const modelSupportsVision = isVisionModel(model, provider as LLMProvider);
    const hasImageAttachments =
      attachments?.some((att: any) =>
        isSupportedVisionFileType(att.type || att.mime)
      ) || false;

    logger.info(
      {
        modelSupportsVision,
        hasImageAttachments,
        model,
        provider,
      },
      "Vision capability check"
    );

    // Process messages with attachments for vision models
    for (const message of messages) {
      if (
        message.role === "user" &&
        modelSupportsVision &&
        hasImageAttachments
      ) {
        // For vision models, format content as array with text and images
        const contentParts: any[] = [];

        // Add text content
        if (message.content) {
          contentParts.push({
            type: "text",
            text: message.content,
          });
        }

        // Add image attachments
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            if (isSupportedVisionFileType(attachment.type || attachment.mime)) {
              // Read image file and convert to base64
              try {
                const filePath = path.join(
                  process.cwd(),
                  "public",
                  attachment.url
                );
                const fileBuffer = await fs.readFile(filePath);
                const base64Image = fileBuffer.toString("base64");
                const mimeType = attachment.type || attachment.mime;

                // OpenAI/compatible format
                if (
                  [
                    "openai",
                    "lmstudio",
                    "groq",
                    "openrouter",
                    "together",
                  ].includes(provider)
                ) {
                  contentParts.push({
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  });
                } else if (provider === "anthropic") {
                  // Anthropic format
                  contentParts.push({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: mimeType,
                      data: base64Image,
                    },
                  });
                } else if (provider === "google") {
                  // Google Gemini format
                  contentParts.push({
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  });
                } else if (provider === "ollama") {
                  // Ollama format (for llava and similar)
                  contentParts.push({
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  });
                }
              } catch (error) {
                logger.error(
                  { error, attachment },
                  "Failed to read image attachment"
                );
              }
            }
          }
        }

        apiMessages.push({
          role: message.role,
          content: contentParts.length > 0 ? contentParts : message.content,
        });
      } else {
        // Non-vision or assistant messages
        apiMessages.push({ role: message.role, content: message.content });
      }
    }

    // Get API key - first check database, then fall back to environment variable
    let apiKey: string | undefined;

    if (config.requiresApiKey) {
      // Try to get API key from database
      const providerConfig = await prisma.providerConfig.findUnique({
        where: { provider },
      });

      // Decrypt the API key if it exists in the database
      const dbApiKey = providerConfig?.apiKey
        ? decrypt(providerConfig.apiKey)
        : undefined;

      apiKey =
        dbApiKey ||
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

    logger.info(
      {
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
      },
      "Sending to LLM"
    );

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
      logger.error({ status: response.status, errorText }, "LLM API error");

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
    logger.info(
      {
        provider,
        hasContent: !!data,
        usage: data.usage,
      },
      "LLM response received"
    );

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

    logger.info(
      {
        contentLength: content.length,
        hasReasoning: !!reasoning,
        reasoningLength: reasoning.length,
        tokensIn,
        tokensOut,
        totalTokens: tokensIn + tokensOut,
      },
      "Returning content"
    );

    return NextResponse.json({
      content,
      reasoning,
      tokensIn,
      tokensOut,
      toolCalls: [], // TODO: Implement MCP tool calls
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Chat API error"
    );
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
