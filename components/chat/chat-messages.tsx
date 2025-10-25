"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  User,
  Bot,
  Wrench,
  Brain,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

function ReasoningSection({ reasoning }: { reasoning: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-background/50 transition-colors border border-border/50">
        <Brain className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium flex-1 text-left">
          Thinking Process
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="p-3 rounded-md bg-muted/30 border border-border/30">
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap break-words text-sm italic">
              {reasoning}
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
          <p className="text-muted-foreground text-sm">
            Select a model from the sidebar and send a message to begin chatting
            with your local LLM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-4",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          )}

          <div
            className={cn(
              "max-w-[70%] rounded-lg p-4",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {/* Reasoning/Thinking Process (only for assistant messages) */}
            {message.role === "assistant" && message.reasoning && (
              <ReasoningSection reasoning={message.reasoning} />
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>

            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                {message.toolCalls.map((toolCall, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <Wrench className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{toolCall.toolName}</span>
                      {toolCall.error && (
                        <span className="text-destructive ml-2">
                          Error: {toolCall.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs opacity-60 mt-2 flex items-center gap-2">
              <span>
                {new Date(message.timestamp).toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {message.role === "assistant" &&
                (message.tokensIn || message.tokensOut) && (
                  <span className="text-muted-foreground">
                    •{" "}
                    {(
                      (message.tokensIn || 0) + (message.tokensOut || 0)
                    ).toLocaleString()}{" "}
                    tokens
                  </span>
                )}
            </div>
          </div>

          {message.role === "user" && (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="max-w-[70%] rounded-lg p-4 bg-secondary">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
