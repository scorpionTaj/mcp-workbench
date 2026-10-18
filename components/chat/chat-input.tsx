"use client";

import type React from "react";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Folder, Paperclip, Send, Slash, Sparkles, Wrench, X } from "lucide-react";
import { useComposerData, type ComposerData } from "@/hooks/use-composer";
import { expandCommand } from "@/lib/bundles";
import {
  filterItems,
  findTrigger,
  MAX_TURN_MENTIONS,
  MAX_TURN_SKILLS,
  removeTrigger,
  replaceTrigger,
  sections,
  type PickerItem,
  type PickerKind,
  type TurnContext,
} from "@/lib/composer";
import { cn } from "@/lib/utils";
import { FileUpload, type AttachedFile } from "./file-upload";

/** Something picked from "/" (a skill) or "@" (a mention), shown as a chip until the message is sent. */
interface Chip {
  kind: Exclude<PickerKind, "command">;
  id: string;
  label: string;
  upload?: AttachedFile;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: AttachedFile[], context?: TurnContext) => void;
  disabled?: boolean;
}

const ICONS: Record<PickerKind, typeof Folder> = {
  command: Slash,
  skill: Sparkles,
  folder: Folder,
  knowledge: BookOpen,
  mcp: Wrench,
  upload: Paperclip,
};

const KIND_LABEL: Record<Chip["kind"], string> = {
  skill: "Skill",
  folder: "Folder",
  knowledge: "Knowledge base",
  mcp: "MCP server",
  upload: "File",
};

// A chat started from the empty state is created first and its first message sent after the
// page navigates; this carries the picks (and files) across that hop.
const PENDING_KEY = "mwb:pending-turn";

/** The attachments and context the composer stashed for `text`, if it was sent in the last minute. */
export function takePendingTurn(text: string): { files: AttachedFile[]; context?: TurnContext } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    const pending = raw ? JSON.parse(raw) : null;
    if (!pending || pending.text !== text || Date.now() - pending.at > 60_000) return null;
    return { files: pending.files ?? [], context: pending.context };
  } catch {
    return null;
  }
}

function stashPendingTurn(text: string, files: AttachedFile[], context?: TurnContext) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ text, files, context, at: Date.now() }));
  } catch {
    // Storage blocked: the first message of a new chat goes without its picks.
  }
}

/** "/" items: commands (only at the very start of the message) and skills, plugin ones grouped per plugin. */
function slashItems(data: ComposerData, atStart: boolean): PickerItem[] {
  const pluginGroup = (id: string | null) => {
    const p = id && data.plugins.find((x) => x.id === id);
    return p ? `Plugin · ${p.name}` : null;
  };
  const command = (c: ComposerData["commands"][number], group: string): PickerItem => ({
    kind: "command",
    id: c.id,
    label: c.name,
    description: c.description,
    hint: c.argumentHint,
    group,
  });
  const skill = (s: ComposerData["skills"][number], group: string): PickerItem => ({
    kind: "skill",
    id: s.id,
    label: s.name,
    description: s.description,
    group,
  });
  const commands = atStart ? data.commands : [];
  return [
    ...commands.filter((c) => !pluginGroup(c.pluginId)).map((c) => command(c, "Commands")),
    ...data.skills.filter((s) => !pluginGroup(s.pluginId)).map((s) => skill(s, "Skills")),
    ...data.plugins.flatMap((p) => [
      ...commands.filter((c) => c.pluginId === p.id).map((c) => command(c, `Plugin · ${p.name}`)),
      ...data.skills.filter((s) => s.pluginId === p.id).map((s) => skill(s, `Plugin · ${p.name}`)),
    ]),
  ];
}

/** "@" items: context the message can mention. */
function mentionItems(data: ComposerData): PickerItem[] {
  return [
    ...data.folders.map((f) => ({ kind: "folder" as const, id: f.id, label: f.name, description: "Summary of its chats", group: "Folders" })),
    ...data.knowledgeBases.map((k) => ({
      kind: "knowledge" as const,
      id: k.id,
      label: k.name,
      description: k.description ?? "Search it for this message",
      group: "Knowledge bases",
    })),
    ...data.mcpServers.map((s) => ({
      kind: "mcp" as const,
      id: s.id,
      label: s.name,
      description: s.description ?? "Use its tools for this message",
      group: "MCP servers",
    })),
    ...data.uploads.map((u) => ({
      kind: "upload" as const,
      id: u.url,
      label: u.name,
      description: `${u.mediaType} · ${new Date(u.createdAt).toLocaleDateString()}`,
      group: "Recent uploads",
    })),
  ];
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [caret, setCaret] = useState(0);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [highlight, setHighlight] = useState(0);
  // Esc closes the picker for the trigger at this index until a new trigger is typed.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data, refresh } = useComposerData();
  const baseId = useId();
  const listboxId = `${baseId}-picker`;

  const trigger = disabled ? null : findTrigger(message, caret);
  const open = trigger !== null && trigger.start !== dismissedAt;

  const items = useMemo(() => {
    if (!open || !trigger) return [];
    const all = trigger.char === "/" ? slashItems(data, trigger.start === 0) : mentionItems(data);
    const taken = new Set(chips.map((c) => `${c.kind}:${c.id}`));
    return filterItems(all.filter((i) => !taken.has(`${i.kind}:${i.id}`)), trigger.query);
  }, [open, trigger, data, chips]);

  const showPicker = open && items.length > 0;
  const active = showPicker ? Math.min(highlight, items.length - 1) : -1;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Refresh the lists when a picker opens, so newly added skills, folders or files show up.
  const triggerChar = open ? trigger?.char : undefined;
  useEffect(() => {
    if (triggerChar) refresh();
  }, [triggerChar, refresh]);

  useEffect(() => {
    if (active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on baseId, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const setText = (text: string, nextCaret: number) => {
    setMessage(text);
    setCaret(nextCaret);
    setHighlight(0);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const pick = (item: PickerItem) => {
    if (!trigger) return;
    if (item.kind === "command") {
      const next = replaceTrigger(message, trigger, `/${item.label} `);
      setText(next.text, next.caret);
      return;
    }
    const upload = item.kind === "upload" ? data.uploads.find((u) => u.url === item.id) : undefined;
    const skills = chips.filter((c) => c.kind === "skill").length;
    const mentions = chips.length - skills;
    if ((item.kind === "skill" && skills >= MAX_TURN_SKILLS) || (item.kind !== "skill" && mentions >= MAX_TURN_MENTIONS)) {
      return;
    }
    setChips((cs) => [
      ...cs,
      {
        kind: item.kind,
        id: item.id,
        label: item.label,
        ...(upload && { upload: { id: upload.url, name: upload.name, size: 0, type: upload.mediaType, url: upload.url } }),
      } as Chip,
    ]);
    const next = removeTrigger(message, trigger);
    setText(next.text, next.caret);
  };

  const removeChip = (chip: Chip) => {
    setChips((cs) => cs.filter((c) => !(c.kind === chip.kind && c.id === chip.id)));
    textareaRef.current?.focus();
  };

  // "/name args" for a known command sends its prompt with the arguments filled in.
  const expand = (text: string) => {
    const m = /^\/(\S+)(?:\s+([\s\S]*))?$/.exec(text);
    const cmd = m && data.commands.find((c) => c.name === m[1]);
    return cmd ? expandCommand(cmd.prompt, (m[2] ?? "").trim()) : text;
  };

  const files = [...attachments, ...chips.flatMap((c) => (c.upload ? [c.upload] : []))];
  const canSend = !disabled && (message.trim() !== "" || files.length > 0);

  const handleSend = () => {
    if (!canSend) return;
    const context: TurnContext = {
      skillIds: chips.filter((c) => c.kind === "skill").map((c) => c.id),
      mentions: chips.flatMap((c) =>
        c.kind === "folder" || c.kind === "knowledge" || c.kind === "mcp" ? [{ type: c.kind, id: c.id }] : [],
      ),
    };
    const text = expand(message.trim());
    stashPendingTurn(text, files, context);
    onSend(text, files, context);
    setMessage("");
    setCaret(0);
    setAttachments([]);
    setChips([]);
    setDismissedAt(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (showPicker) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setHighlight((active + step + items.length) % items.length);
        return;
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        setHighlight(e.key === "Home" ? 0 : items.length - 1);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        pick(items[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissedAt(trigger!.start);
        return;
      }
    }
    // Backspace at the very start removes the last chip, like a token field.
    if (e.key === "Backspace" && chips.length && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
      e.preventDefault();
      removeChip(chips[chips.length - 1]);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    setMessage(value);
    setCaret(selectionStart ?? value.length);
    setHighlight(0);
    const t = findTrigger(value, selectionStart ?? value.length);
    if (!t || t.start !== dismissedAt) setDismissedAt(null);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const syncCaret = (e: React.SyntheticEvent<HTMLTextAreaElement>) => setCaret(e.currentTarget.selectionStart ?? 0);

  const pickerLabel = trigger?.char === "@" ? "Mention context" : "Commands and skills";

  return (
    <div className="space-y-3">
      {/* File Upload */}
      <FileUpload
        onFilesChange={setAttachments}
        disabled={disabled}
        maxFiles={5}
        maxSize={10}
      />

      {chips.length > 0 && (
        <ul aria-label="Attached to this message" className="flex flex-wrap gap-1.5">
          {chips.map((chip) => {
            const Icon = ICONS[chip.kind];
            return (
              <li
                key={`${chip.kind}:${chip.id}`}
                className="inline-flex max-w-64 items-center gap-1.5 rounded-full border border-border bg-secondary py-0.5 pl-2.5 pr-1 text-xs text-secondary-foreground"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="sr-only">{KIND_LABEL[chip.kind]}:</span>
                <span className={cn("truncate", chip.kind === "skill" && "font-mono")}>{chip.label}</span>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  aria-label={`Remove ${KIND_LABEL[chip.kind].toLowerCase()} ${chip.label}`}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Message Input */}
      <div className="relative flex gap-2">
        {showPicker && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={pickerLabel}
            className="absolute bottom-full left-0 z-20 mb-2 max-h-80 w-full max-w-md overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {sections(items).map((section) => {
              const headingId = `${baseId}-${section.group.replace(/\W+/g, "-")}`;
              return (
                <div key={section.group} role="group" aria-labelledby={headingId}>
                  <div
                    id={headingId}
                    role="presentation"
                    className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {section.group}
                  </div>
                  {section.items.map((item) => {
                    const i = items.indexOf(item);
                    const Icon = ICONS[item.kind];
                    return (
                      <div
                        key={`${item.kind}:${item.id}`}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === active}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                          i === active && "bg-primary/15",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pick(item);
                        }}
                        onMouseEnter={() => setHighlight(i)}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <span className={cn(item.kind === "command" || item.kind === "skill" ? "font-mono" : "font-medium")}>
                            {item.kind === "command" ? `/${item.label}` : item.label}
                          </span>
                          {item.hint && <span className="ml-2 font-mono text-muted-foreground">{item.hint}</span>}
                          {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {showPicker ? `${items.length} suggestion${items.length === 1 ? "" : "s"}, use arrow keys to choose` : ""}
        </div>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={syncCaret}
          onClick={syncCaret}
          role="combobox"
          aria-label="Message"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showPicker}
          aria-controls={showPicker ? listboxId : undefined}
          aria-activedescendant={showPicker ? optionId(active) : undefined}
          placeholder={
            disabled
              ? "Select a model to start chatting..."
              : "Message… / for commands and skills, @ to add context (Shift+Enter for new line)"
          }
          disabled={disabled}
          className="min-h-[60px] max-h-[200px] resize-none glass border-border/50 hover:border-primary/50 focus:border-primary transition-colors"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          aria-label="Send message"
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
