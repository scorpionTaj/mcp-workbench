"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatInspector } from "@/components/chat/chat-inspector";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useChats } from "@/hooks/use-chats";
import { Button } from "@/components/ui/button";
import { Download, PanelLeftClose, PanelLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");
  const initialMessage = searchParams.get("msg"); // Get initial message from URL
  const urlProvider = searchParams.get("provider"); // Get provider from URL
  const urlModel = searchParams.get("model"); // Get model from URL

  const { chats, createChat, deleteChat } = useChats();
  const { chat, messages, isStreaming, sendMessage, updateChat } =
    useChatMessages(chatId);

  const [showHistory, setShowHistory] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false); // Prevent duplicate creation
  const [modelParams, setModelParams] = useState({
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    frequencyPenalty: 0,
    presencePenalty: 0,
  });

  // Handle URL parameters for provider and model
  useEffect(() => {
    if (urlProvider && urlModel && !chatId && !isCreatingChat) {
      // Create a new chat with the selected model
      const modelString = `${urlProvider}:${urlModel}`;
      console.log(
        "MCP Workbench Creating new chat with model from URL:",
        modelString
      );
      setSelectedModel(modelString);
      setIsCreatingChat(true);

      // Create a new chat
      createChat({
        title: `Chat with ${urlModel}`,
        defaultProvider: urlProvider,
        defaultModelId: urlModel,
        systemPrompt: "",
        toolServerIds: [],
      })
        .then((newChat) => {
          // Navigate to the new chat without the provider/model params
          router.replace(`/chat?id=${newChat.id}`);
        })
        .catch((error) => {
          console.error("MCP Workbench Failed to create chat:", error);
          setIsCreatingChat(false);
        });
    }
  }, [urlProvider, urlModel, chatId, isCreatingChat, createChat, router]);

  // Sync state with loaded chat
  useEffect(() => {
    if (chat) {
      setSelectedModel(
        chat.defaultModelId
          ? `${chat.defaultProvider}:${chat.defaultModelId}`
          : ""
      );
      setSystemPrompt(chat.systemPrompt || "");
      setSelectedTools(chat.toolServerIds || []);
    }
  }, [chat]);

  // Send initial message if present in URL
  useEffect(() => {
    if (chatId && initialMessage && selectedModel && !isStreaming) {
      console.log(
        "MCP Workbench Sending initial message from URL:",
        initialMessage
      );
      const [provider, modelId] = selectedModel.split(":");
      sendMessage({
        content: decodeURIComponent(initialMessage),
        provider: provider as "ollama" | "lmstudio",
        modelId,
        toolServerIds: selectedTools,
      })
        .then(() => {
          // Remove msg parameter from URL after sending
          router.replace(`/chat?id=${chatId}`);
        })
        .catch((error) => {
          console.error("MCP Workbench Failed to send initial message:", error);
        });
    }
  }, [chatId, initialMessage, selectedModel]);

  const handleSend = async (content: string) => {
    console.log("MCP Workbench handleSend called:", {
      chatId,
      content,
      selectedModel,
    });

    if (!selectedModel) {
      alert("Please select a model first");
      return;
    }

    const [provider, modelId] = selectedModel.split(":");

    // Check if model is loaded before sending
    try {
      const modelCheckResponse = await fetch("/api/models/check-loaded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, modelId }),
      });

      if (!modelCheckResponse.ok) {
        const error = await modelCheckResponse.json();
        alert(error.error || "Failed to check model status");
        return;
      }

      const modelStatus = await modelCheckResponse.json();
      if (!modelStatus.loaded) {
        alert(
          modelStatus.error ||
            "Model is not loaded. Please load the model in LM Studio first."
        );
        return;
      }
    } catch (error) {
      console.error("MCP Workbench Error checking model status:", error);
      // Continue anyway if check fails (for backwards compatibility)
    }

    if (!chatId) {
      // Create new chat and redirect with message in URL
      console.log("MCP Workbench Creating new chat...");
      const newChat = await createChat({
        defaultProvider: provider as "ollama" | "lmstudio",
        defaultModelId: modelId,
        systemPrompt,
      });
      console.log("MCP Workbench New chat created:", newChat.id);

      // Navigate to the new chat with the message as a URL parameter
      router.push(`/chat?id=${newChat.id}&msg=${encodeURIComponent(content)}`);
      return;
    }

    console.log("MCP Workbench Sending message to existing chat...");
    try {
      await sendMessage({
        content,
        provider: provider as "ollama" | "lmstudio",
        modelId,
        toolServerIds: selectedTools,
      });
      console.log("MCP Workbench Message sent successfully");
    } catch (error) {
      console.error("MCP Workbench Error sending message:", error);
      alert("Failed to send message. Please check the console for details.");
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    if (chatId) {
      const [provider, modelId] = model.split(":");
      await updateChat({
        defaultProvider: provider as "ollama" | "lmstudio",
        defaultModelId: modelId,
      });
    }
  };

  const handleSystemPromptChange = async (prompt: string) => {
    setSystemPrompt(prompt);
    if (chatId) {
      await updateChat({ systemPrompt: prompt });
    }
  };

  const handleToolsChange = async (tools: string[]) => {
    setSelectedTools(tools);
    if (chatId) {
      await updateChat({ toolServerIds: tools });
    }
  };

  const handleToolToggle = async (toolId: string) => {
    const newTools = selectedTools.includes(toolId)
      ? selectedTools.filter((t) => t !== toolId)
      : [...selectedTools, toolId];
    await handleToolsChange(newTools);
  };

  const handleExportJSON = async () => {
    if (!chatId) return;
    window.open(`/api/chats/${chatId}/export.json`, "_blank");
  };

  const handleExportCSV = async () => {
    if (!chatId) return;
    window.open(`/api/chats/${chatId}/export.csv`, "_blank");
  };

  const formattedMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
    reasoning: msg.reasoning || undefined,
    timestamp: new Date(msg.createdAt),
    tokensIn: msg.tokensIn || undefined,
    tokensOut: msg.tokensOut || undefined,
    toolCalls: msg.toolCalls?.map((tc: any) => ({
      toolName: tc.name || tc.toolName,
      input: tc.input,
      output: tc.output,
      error: tc.error,
    })),
  }));

  // Calculate total tokens
  const totalTokens = messages.reduce(
    (acc, msg) => ({
      input: acc.input + (msg.tokensIn || 0),
      output: acc.output + (msg.tokensOut || 0),
    }),
    { input: 0, output: 0 }
  );

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {showHistory && (
        <div className="w-64 shrink-0">
          <ChatHistory chats={chats} currentChatId={chatId} />
        </div>
      )}

      <div className="flex-1 flex flex-col glass border-border/50 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="hover:bg-primary/5"
            >
              {showHistory ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                {chat?.title || "New Chat"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedModel
                  ? `Using ${selectedModel.split(":")[1]}`
                  : "Select a model to start"}
                {totalTokens.input + totalTokens.output > 0 && (
                  <span className="ml-3">
                    •{" "}
                    {(totalTokens.input + totalTokens.output).toLocaleString()}{" "}
                    tokens
                    <span className="text-xs ml-1">
                      ({totalTokens.input.toLocaleString()} in /{" "}
                      {totalTokens.output.toLocaleString()} out)
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={messages.length === 0}
                  className="hover:border-primary/50 hover:bg-primary/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="backdrop-blur-xl bg-popover/95 border-border/50">
                <DropdownMenuItem onClick={handleExportJSON}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ChatMessages messages={formattedMessages} isLoading={isStreaming} />

        <div className="p-4 border-t border-border/50">
          <ChatInput
            onSend={handleSend}
            disabled={!selectedModel || isStreaming}
          />
        </div>
      </div>

      <ChatSidebar
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        selectedTools={selectedTools}
        onToolsChange={handleToolsChange}
        modelParams={modelParams}
        onModelParamsChange={setModelParams}
      />

      <ChatInspector
        messages={messages}
        enabledTools={selectedTools}
        onToolToggle={handleToolToggle}
      />
    </div>
  );
}
