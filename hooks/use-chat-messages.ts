"use client";

import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  reasoning?: string | null;
  provider?: string | null;
  modelId?: string | null;
  toolCalls?: any[] | null;
  toolResults?: any[] | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  createdAt: string;
}

export interface ChatDetail {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  systemPrompt: string | null;
  defaultProvider: string;
  defaultModelId: string | null;
  toolServerIds: string[];
  meta: any;
  messages: Message[];
}

export function useChatMessages(chatId: string | null) {
  const [isStreaming, setIsStreaming] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<ChatDetail>(
    chatId ? `/api/chats/${chatId}` : null,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  );

  const sendMessage = async (options: {
    content: string;
    provider?: "ollama" | "lmstudio";
    modelId?: string;
    toolServerIds?: string[];
  }) => {
    if (!chatId) throw new Error("No chat selected");

    console.log("MCP Workbench Sending message:", {
      chatId,
      content: options.content,
      provider: options.provider,
      modelId: options.modelId,
    });

    setIsStreaming(true);

    try {
      // Add user message
      console.log("MCP Workbench Adding user message to database...");
      const userMsgResponse = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "user",
          content: options.content,
        }),
      });

      if (!userMsgResponse.ok) {
        const errorText = await userMsgResponse.text();
        console.error(
          "MCP Workbench Failed to add user message:",
          userMsgResponse.status,
          errorText
        );
        throw new Error("Failed to send message");
      }

      const userMessage = await userMsgResponse.json();
      console.log("MCP Workbench User message added:", userMessage.id);

      // Refresh to show user message
      await mutate();

      // Get chat details for defaults
      const chat = data;
      const provider = options.provider || chat?.defaultProvider || "ollama";
      const modelId = options.modelId || chat?.defaultModelId;

      if (!modelId) {
        throw new Error("No model selected");
      }

      console.log("MCP Workbench Calling LLM API:", { provider, modelId });

      // Call LLM
      const llmResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...(data?.messages || []),
            { role: "user", content: options.content },
          ],
          model: modelId,
          provider,
          systemPrompt: chat?.systemPrompt,
          tools: options.toolServerIds || chat?.toolServerIds || [],
        }),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error(
          "MCP Workbench LLM response failed:",
          llmResponse.status,
          errorText
        );
        throw new Error("Failed to get response");
      }

      const llmData = await llmResponse.json();
      console.log("MCP Workbench LLM response received:", {
        contentLength: llmData.content?.length,
        hasReasoning: !!llmData.reasoning,
      });

      // Save assistant message
      console.log("MCP Workbench Saving assistant message to database...");
      const assistantMsgResponse = await fetch(
        `/api/chats/${chatId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: llmData.content,
            reasoning: llmData.reasoning,
            provider,
            modelId,
            toolCalls: llmData.toolCalls,
            tokensIn: llmData.tokensIn,
            tokensOut: llmData.tokensOut,
          }),
        }
      );

      if (!assistantMsgResponse.ok) {
        console.error(
          "MCP Workbench Failed to save assistant message:",
          assistantMsgResponse.status
        );
      } else {
        const assistantMessage = await assistantMsgResponse.json();
        console.log(
          "MCP Workbench Assistant message saved:",
          assistantMessage.id
        );
      }

      // Refresh to show assistant message
      await mutate();
      console.log("MCP Workbench Messages refreshed");
    } catch (error) {
      console.error("MCP Workbench Error sending message:", error);
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  const updateChat = async (updates: {
    title?: string;
    systemPrompt?: string;
    defaultProvider?: "ollama" | "lmstudio";
    defaultModelId?: string;
    toolServerIds?: string[];
  }) => {
    if (!chatId) throw new Error("No chat selected");

    const response = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update chat");
    }

    await mutate();
  };

  return {
    chat: data,
    messages: data?.messages || [],
    isLoading,
    isStreaming,
    error,
    sendMessage,
    updateChat,
    refresh: mutate,
  };
}
