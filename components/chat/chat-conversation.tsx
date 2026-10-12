"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { AlertCircle, RotateCcw, Square } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatInspector } from "@/components/chat/chat-inspector";
import { Button } from "@/components/ui/button";
import { toDisplayMessage, type ChatUIMessage } from "@/lib/chat-messages";
import type { AttachedFile } from "@/components/chat/file-upload";

export type ChatPanel = "settings" | "inspector" | null;

/** Right-hand chat panel: a column on wide screens, an overlay drawer below xl. */
export function SidePanel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex min-h-0 w-80 shrink-0 flex-col max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(22rem,100vw)] max-xl:bg-background max-xl:p-3 max-xl:shadow-2xl">
      {children}
    </aside>
  );
}

export interface ModelParams {
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/** "ollama:llama3:8b" → ["ollama", "llama3:8b"] (model ids may contain colons). */
export function splitModel(value: string): [string, string] {
  const i = value.indexOf(":");
  return [value.slice(0, i), value.slice(i + 1)];
}

// The server holds the history, so only the newest message is sent along with the request options.
const transport = new DefaultChatTransport<ChatUIMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    body: { ...body, id, message: messages[messages.length - 1] },
  }),
});

const toFileParts = (files: AttachedFile[] = []) =>
  files.map((f) => ({ type: "file" as const, mediaType: f.type, filename: f.name, url: f.url }));

export function ChatConversation({
  chatId,
  initialMessages,
  selectedModel,
  persistedIds,
  starterPrompts,
  modelParams,
  initialMessage,
  onInitialMessageSent,
  onTurnFinished,
  header,
  sidebar,
  panel,
  enabledTools,
  onToolToggle,
}: {
  chatId: string;
  initialMessages: ChatUIMessage[];
  selectedModel: string;
  persistedIds: Set<string>;
  starterPrompts?: string[];
  modelParams: ModelParams;
  initialMessage?: string | null;
  onInitialMessageSent?: () => void;
  onTurnFinished?: () => void;
  header: ReactNode;
  sidebar: ReactNode;
  /** Which right-hand panel is open: chat settings or the tool/message inspector. */
  panel: ChatPanel;
  enabledTools: string[];
  onToolToggle: (id: string) => void;
}) {
  // Model and settings travel with each request (read at send time, not render time).
  const requestOptions = useCallback(() => {
    const [provider, modelId] = splitModel(selectedModel);
    return {
      body: {
        provider,
        modelId,
        settings: {
          temperature: modelParams.temperature,
          topP: modelParams.topP,
          maxOutputTokens: modelParams.maxTokens,
          frequencyPenalty: modelParams.frequencyPenalty,
          presencePenalty: modelParams.presencePenalty,
        },
      },
    };
  }, [selectedModel, modelParams]);

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    clearError,
    addToolApprovalResponse,
  } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    // After the user answers every pending tool approval, continue the same reply.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => onTurnFinished?.(),
  });

  const handleApproval = useCallback(
    (id: string, approved: boolean) => addToolApprovalResponse({ id, approved, options: requestOptions() }),
    [addToolApprovalResponse, requestOptions],
  );

  const mcpErrors = messages.at(-1)?.metadata?.mcpErrors;

  const busy = status === "submitted" || status === "streaming";

  // A chat created from the empty state arrives with its first message in the URL.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (initialMessage && selectedModel && !sentInitial.current && messages.length === 0) {
      sentInitial.current = true;
      sendMessage({ text: initialMessage }, requestOptions());
      onInitialMessageSent?.();
    }
  }, [initialMessage, selectedModel, messages.length, sendMessage, onInitialMessageSent, requestOptions]);

  const display = useMemo(
    () => messages.map((m) => toDisplayMessage(m, chatId)),
    [messages, chatId],
  );

  return (
    <>
      <div className="flex-1 flex flex-col glass border-border/50 rounded-lg overflow-hidden min-h-0">
        {header}
        <ChatMessages
          messages={display}
          isLoading={status === "submitted"}
          persistedIds={persistedIds}
          onApproval={handleApproval}
        />

        {messages.length === 0 && starterPrompts && starterPrompts.length > 0 && (
          <div className="mx-4 mb-3 flex flex-wrap justify-center gap-2">
            {starterPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                disabled={!selectedModel}
                onClick={() => sendMessage({ text: prompt }, requestOptions())}
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}

        {mcpErrors && mcpErrors.length > 0 && (
          <div className="mx-4 mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            Some MCP servers were unavailable for this reply: {mcpErrors.join("; ")}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="flex-1 break-words">{error.message}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                clearError();
                regenerate(requestOptions());
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        )}

        <div className="p-4 border-t border-border/50 space-y-2">
          {busy && (
            <div className="flex justify-center">
              <Button size="sm" variant="outline" onClick={() => stop()}>
                <Square className="w-3 h-3 mr-1" />
                Stop generating
              </Button>
            </div>
          )}
          <ChatInput
            disabled={!selectedModel || busy}
            onSend={(text, files) => sendMessage({ text, files: toFileParts(files) }, requestOptions())}
          />
        </div>
      </div>

      {panel === "settings" && sidebar}
      {panel === "inspector" && (
        <SidePanel>
          <ChatInspector messages={display} enabledTools={enabledTools} onToolToggle={onToolToggle} />
        </SidePanel>
      )}
    </>
  );
}
