"use client";

import type React from "react";

import { useState, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useCommands } from "@/hooks/use-skills";
import { expandCommand } from "@/lib/bundles";
import { cn } from "@/lib/utils";
import { FileUpload, type AttachedFile } from "./file-upload";

interface ChatInputProps {
  onSend: (message: string, attachments?: AttachedFile[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { commands } = useCommands();
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const enabled = commands.filter((c) => c.enabled);
  // Suggest commands while the first word is being typed: "/rev" → /review.
  const typing = /^\/(\S*)$/.exec(message);
  const suggestions =
    typing && !dismissed ? enabled.filter((c) => c.name.startsWith(typing[1].toLowerCase())).slice(0, 8) : [];

  const pick = (name: string) => {
    setMessage(`/${name} `);
    setHighlight(0);
    textareaRef.current?.focus();
  };

  // "/name args" for a known command sends its prompt with the arguments filled in.
  const expand = (text: string) => {
    const m = /^\/(\S+)(?:\s+([\s\S]*))?$/.exec(text);
    const cmd = m && enabled.find((c) => c.name === m[1]);
    return cmd ? expandCommand(cmd.prompt, (m[2] ?? "").trim()) : text;
  };

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSend(expand(message.trim()), attachments);
      setMessage("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setHighlight((h) => (h + step + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        pick(suggestions[Math.min(highlight, suggestions.length - 1)].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setHighlight(0);
    if (!e.target.value.startsWith("/")) setDismissed(false);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="space-y-3">
      {/* File Upload */}
      <FileUpload
        onFilesChange={setAttachments}
        disabled={disabled}
        maxFiles={5}
        maxSize={10}
      />

      {/* Message Input */}
      <div className="relative flex gap-2">
        {suggestions.length > 0 && (
          <ul
            id="slash-commands"
            role="listbox"
            aria-label="Slash commands"
            className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-md overflow-hidden rounded-md border bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-md"
          >
            {suggestions.map((c, i) => (
              <li
                key={c.id}
                id={`slash-${c.id}`}
                role="option"
                aria-selected={i === highlight}
                className={cn("cursor-pointer px-3 py-2 text-sm", i === highlight && "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c.name);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                <span className="font-mono">/{c.name}</span>
                {c.argumentHint && <span className="ml-2 font-mono text-muted-foreground">{c.argumentHint}</span>}
                {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
              </li>
            ))}
          </ul>
        )}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-controls={suggestions.length ? "slash-commands" : undefined}
          aria-activedescendant={suggestions.length ? `slash-${suggestions[Math.min(highlight, suggestions.length - 1)].id}` : undefined}
          placeholder={
            disabled
              ? "Select a model to start chatting..."
              : "Type a message, or / for commands (Shift+Enter for new line)"
          }
          disabled={disabled}
          className="min-h-[60px] max-h-[200px] resize-none glass border-border/50 hover:border-primary/50 focus:border-primary transition-colors"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
