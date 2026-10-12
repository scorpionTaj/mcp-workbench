"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Activity, Download, PanelLeftClose, PanelLeft, SlidersHorizontal } from "lucide-react";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHistory } from "@/components/chat/chat-history";
import { ShareDialog } from "@/components/chat/share-dialog";
import {
  ChatConversation,
  SidePanel,
  type ChatPanel,
  splitModel,
  type ModelParams,
} from "@/components/chat/chat-conversation";
import { useChats } from "@/hooks/use-chats";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatUIMessage } from "@/lib/chat-messages";

interface ChatDetail {
  id: string;
  title: string | null;
  systemPrompt: string | null;
  defaultProvider: string;
  defaultModelId: string | null;
  toolServerIds: string[];
  knowledgeBaseIds: string[];
  shareId: string | null;
  messages: ChatUIMessage[];
  agent?: {
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
    starterPrompts: string[];
    temperature: number | null;
  };
}

import { fetcher } from "@/lib/fetcher";

const DEFAULT_PARAMS: ModelParams = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get("id");
  const initialMessage = searchParams.get("msg");
  const urlProvider = searchParams.get("provider");
  const urlModel = searchParams.get("model");

  const { chats, createChat, refresh: refreshChats } = useChats();
  const { data: chat, mutate: mutateChat } = useSWR<ChatDetail>(
    chatId ? `/api/chats/${chatId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const [showHistory, setShowHistory] = useState(true);
  const [panel, setPanel] = useState<ChatPanel>("settings");
  const togglePanel = (p: Exclude<ChatPanel, null>) => setPanel((cur) => (cur === p ? null : p));
  // Side columns start closed on screens too narrow to show them next to the conversation.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!window.matchMedia("(min-width: 1024px)").matches) setShowHistory(false);
    if (!window.matchMedia("(min-width: 1280px)").matches) setPanel(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [modelParams, setModelParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [creating, setCreating] = useState(false);
  const persistedIds = useMemo(() => new Set(chat?.messages.map((m) => m.id)), [chat]);

  // Load per-chat settings when switching chats.
  const syncedChatId = useRef<string | null>(null);
  useEffect(() => {
    if (!chat || syncedChatId.current === chat.id) return;
    syncedChatId.current = chat.id;
    setSelectedModel(chat.defaultModelId ? `${chat.defaultProvider}:${chat.defaultModelId}` : "");
    setSystemPrompt(chat.systemPrompt || "");
    setSelectedTools(chat.toolServerIds || []);
    setSelectedKnowledge(chat.knowledgeBaseIds || []);
    const agentTemperature = chat.agent?.temperature;
    if (agentTemperature != null) setModelParams((p) => ({ ...p, temperature: agentTemperature }));
  }, [chat]);

  const updateChat = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!chatId) return;
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [chatId],
  );

  const startChat = useCallback(
    async (model: string, firstMessage?: string) => {
      const [provider, modelId] = splitModel(model);
      setCreating(true);
      try {
        const newChat = await createChat({
          defaultProvider: provider,
          defaultModelId: modelId,
          systemPrompt,
          toolServerIds: selectedTools,
          knowledgeBaseIds: selectedKnowledge,
        });
        const msg = firstMessage ? `&msg=${encodeURIComponent(firstMessage)}` : "";
        router.push(`/chat?id=${newChat.id}${msg}`);
      } finally {
        setCreating(false);
      }
    },
    [createChat, router, systemPrompt, selectedTools, selectedKnowledge],
  );

  // Deep link from the Models page: /chat?provider=x&model=y
  const handledDeepLink = useRef(false);
  useEffect(() => {
    if (urlProvider && urlModel && !chatId && !handledDeepLink.current) {
      handledDeepLink.current = true;
      setSelectedModel(`${urlProvider}:${urlModel}`);
      startChat(`${urlProvider}:${urlModel}`);
    }
  }, [urlProvider, urlModel, chatId, startChat]);

  const systemPromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
    if (systemPromptTimer.current) clearTimeout(systemPromptTimer.current);
    systemPromptTimer.current = setTimeout(() => updateChat({ systemPrompt: prompt }), 500);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    const [defaultProvider, defaultModelId] = splitModel(model);
    updateChat({ defaultProvider, defaultModelId });
  };

  const handleToolsChange = (tools: string[]) => {
    setSelectedTools(tools);
    updateChat({ toolServerIds: tools });
  };

  const handleKnowledgeChange = (ids: string[]) => {
    setSelectedKnowledge(ids);
    updateChat({ knowledgeBaseIds: ids });
  };

  const branchFrom = async (messageId: string) => {
    const res = await fetch(`/api/chats/${chatId}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    if (!res.ok) return;
    const { id } = await res.json();
    refreshChats();
    router.push(`/chat?id=${id}`);
  };

  const header = (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          aria-label={showHistory ? "Hide chat history" : "Show chat history"}
        >
          {showHistory ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <h1 className="text-lg font-semibold truncate">{chat?.title || "New Chat"}</h1>
        {chat?.agent && (
          <Link
            href="/agents"
            className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            title={chat.agent.description ?? undefined}
          >
            {chat.agent.icon} {chat.agent.name}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
      <Button
        variant={panel === "settings" ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={panel === "settings"}
        onClick={() => togglePanel("settings")}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="max-md:sr-only">Settings</span>
      </Button>
      {chatId && (
        <Button
          variant={panel === "inspector" ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={panel === "inspector"}
          onClick={() => togglePanel("inspector")}
        >
          <Activity className="w-4 h-4" />
          <span className="max-md:sr-only">Inspector</span>
        </Button>
      )}
      {chatId && chat?.id === chatId && (
        <ShareDialog chatId={chatId} shareId={chat.shareId} onChange={() => mutateChat()} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!chatId}>
            <Download className="w-4 h-4" />
            <span className="max-md:sr-only">Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => window.open(`/api/chats/${chatId}/export.json`, "_blank")}>
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`/api/chats/${chatId}/export.csv`, "_blank")}>
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );

  const sidebar = (
    <SidePanel>
    <ChatSidebar
      selectedModel={selectedModel}
      onModelChange={handleModelChange}
      systemPrompt={systemPrompt}
      onSystemPromptChange={handleSystemPromptChange}
      selectedTools={selectedTools}
      onToolsChange={handleToolsChange}
      selectedKnowledge={selectedKnowledge}
      onKnowledgeChange={handleKnowledgeChange}
      modelParams={modelParams}
      onModelParamsChange={setModelParams}
    />
    </SidePanel>
  );

  const toggleTool = (id: string) =>
    handleToolsChange(
      selectedTools.includes(id) ? selectedTools.filter((t) => t !== id) : [...selectedTools, id],
    );

  return (
    <div className="flex gap-4 h-[calc(100dvh-3.5rem-2rem)] md:h-[calc(100dvh-3.5rem-3rem)] min-h-[28rem] overflow-hidden">
      {showHistory && (
        <div className="w-64 shrink-0 flex flex-col min-h-0 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-[min(18rem,100vw)] max-lg:bg-background max-lg:p-3 max-lg:shadow-2xl">
          <ChatHistory chats={chats} currentChatId={chatId} />
        </div>
      )}

      {chatId && chat?.id === chatId ? (
        <ChatConversation
          key={chatId}
          chatId={chatId}
          initialMessages={chat.messages}
          persistedIds={persistedIds}
          starterPrompts={chat.agent?.starterPrompts}
          selectedModel={selectedModel}
          modelParams={modelParams}
          initialMessage={initialMessage}
          onInitialMessageSent={() => router.replace(`/chat?id=${chatId}`)}
          onTurnFinished={() => {
            refreshChats();
            mutateChat();
          }}
          header={header}
          sidebar={sidebar}
          panel={panel}
          enabledTools={selectedTools}
          onToolToggle={toggleTool}
          onBranch={branchFrom}
        />
      ) : (
        <>
          <div className="flex-1 flex flex-col glass border-border/50 rounded-lg overflow-hidden min-h-0">
            {header}
            <ChatMessages messages={[]} isLoading={Boolean(chatId) || creating} />
            <div className="p-4 border-t border-border/50">
              <ChatInput
                disabled={!selectedModel || creating || Boolean(chatId)}
                onSend={(text) => startChat(selectedModel, text)}
              />
            </div>
          </div>
          {panel === "settings" && sidebar}
        </>
      )}
    </div>
  );
}
