import { NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

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

    console.log("MCP Workbench Sending to LLM:", {
      provider,
      model,
      url:
        provider === "ollama"
          ? `${config.baseUrl}${config.chatCompletionsEndpoint}`
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
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MCP Workbench LLM API error:", response.status, errorText);
      throw new Error(`LLM API error: ${response.status}`);
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
      // Some models include thinking/reasoning in a separate field or tagged in content
      if (message?.reasoning) {
        reasoning = message.reasoning;
      }

      // Extract thinking tags like <think>...</think> or <reasoning>...</reasoning>
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
      const reasoningMatch = content.match(
        /<reasoning>([\s\S]*?)<\/reasoning>/i
      );

      if (thinkMatch) {
        reasoning = thinkMatch[1].trim();
        // Remove the thinking tags from the main content
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      } else if (reasoningMatch) {
        reasoning = reasoningMatch[1].trim();
        // Remove the reasoning tags from the main content
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
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
