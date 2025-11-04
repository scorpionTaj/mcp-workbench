"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/hooks/use-chat-messages";
import { cn } from "@/lib/utils";
import {
  User,
  Bot,
  Wrench,
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

function ReasoningSection({ reasoning }: { reasoning: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-primary/5 transition-colors glass border-border/50">
        <div className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Brain className="w-4 h-4 text-violet-500 shrink-0" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">
          Thinking Process
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="p-4 rounded-lg glass border-violet-500/20">
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
            <p className="whitespace-pre-wrap wrap-break-word text-sm italic leading-relaxed">
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
          <div className="p-5 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-4">
            <Bot className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
          <p className="text-muted-foreground">
            Select a model from the sidebar and send a message to begin chatting
            with your LLM.
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
            "flex gap-4 animate-in fade-in slide-in-from-bottom duration-500",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          )}

          <div
            className={cn(
              "max-w-[70%] rounded-lg p-4 shadow-sm",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "glass border-border/50"
            )}
          >
            {/* Reasoning/Thinking Process (only for assistant messages) */}
            {message.role === "assistant" && message.reasoning && (
              <ReasoningSection reasoning={message.reasoning} />
            )}

            {/* File attachments (only for user messages) */}
            {message.role === "user" &&
              message.attachments &&
              message.attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.attachments.map((attachment) => {
                    const isImage = attachment.mime.startsWith("image/");
                    return (
                      <div
                        key={attachment.id}
                        className="rounded-lg overflow-hidden border border-primary-foreground/10"
                      >
                        {isImage ? (
                          <div className="relative w-full max-w-xs">
                            <Image
                              src={attachment.url}
                              alt={attachment.name}
                              width={300}
                              height={300}
                              className="w-full h-auto object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-primary-foreground/5">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="text-sm truncate flex-1">
                              {attachment.name}
                            </span>
                            <span className="text-xs opacity-70">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Message content with markdown rendering */}
            <MarkdownRenderer content={message.content} />

            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                {message.toolCalls.map((toolCall, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className="p-1 rounded bg-amber-500/10 border border-amber-500/20">
                      <Wrench className="w-3 h-3 text-amber-500 shrink-0" />
                    </div>
                    <div>
                      <span className="font-semibold">{toolCall.toolName}</span>
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

            <div className="text-xs opacity-70 mt-3 flex items-center gap-2">
              <span>
                {new Date(message.createdAt).toLocaleTimeString("en-US", {
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
            <div className="w-9 h-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-4 animate-in fade-in duration-500">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="max-w-[70%] rounded-lg p-4 glass border-border/50">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
