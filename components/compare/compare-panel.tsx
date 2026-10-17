"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, Copy, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { JudgeScore, type JudgeState } from "@/components/compare/judge";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";
import { formatCost } from "@/lib/pricing";

export interface CompareTurn {
  n: number;
  text: string;
}

/** A finished answer, reported to the page for diffing and judging. */
export interface CompareAnswer {
  messageId: string;
  prompt: string;
  text: string;
}

// Both measured in the browser from the moment the prompt is sent, so they share one clock
// (the server's durationMs starts later, after auth and model setup, and isn't comparable).
interface Timing {
  ttftMs?: number;
  totalMs?: number;
}

/** Output tokens per second over the streaming window (first token to last). */
function tokensPerSecond(outputTokens: number | undefined, t: Timing | undefined, fallbackMs?: number) {
  if (!outputTokens) return null;
  const window = t?.totalMs !== undefined && t.ttftMs !== undefined ? t.totalMs - t.ttftMs : fallbackMs;
  return window && window > 0 ? (outputTokens / window) * 1000 : null;
}

const fmtMs = (ms?: number) => (ms === undefined ? "–" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

/** One model's column: its own useChat thread, fed each prompt the page sends. */
export function ComparePanel({
  model,
  turn,
  system,
  temperature,
  stopSignal,
  onRemove,
  onBusyChange,
  onAnswer,
  scores,
}: {
  model: string;
  turn: CompareTurn | null;
  system: string;
  temperature: number | null;
  stopSignal: number;
  onRemove: () => void;
  onBusyChange: (model: string, busy: boolean) => void;
  onAnswer: (model: string, answer: CompareAnswer) => void;
  /** Judge results by assistant message id. */
  scores: Record<string, JudgeState>;
}) {
  const i = model.indexOf(":");
  const provider = model.slice(0, i);
  const modelId = model.slice(i + 1);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/compare",
        // The whole thread goes each time: the compare route stores nothing.
        prepareSendMessagesRequest: ({ messages, body }) => ({ body: { ...body, provider, modelId, messages } }),
      }),
    [provider, modelId],
  );
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({ id: `compare-${model}`, transport });
  const busy = status === "submitted" || status === "streaming";
  const [timings, setTimings] = useState<Record<string, Timing>>({});
  const sentAt = useRef<number | null>(null);
  const turnStartedAt = useRef<number | null>(null);

  // Send each new prompt once.
  const lastTurn = useRef(0);
  useEffect(() => {
    if (!turn || turn.n === lastTurn.current) return;
    lastTurn.current = turn.n;
    sentAt.current = performance.now();
    turnStartedAt.current = sentAt.current;
    sendMessage(
      { text: turn.text },
      { body: { system: system || undefined, ...(temperature !== null && { temperature }) } },
    );
  }, [turn, sendMessage, system, temperature]);

  useEffect(() => {
    if (stopSignal) stop();
  }, [stopSignal, stop]);

  useEffect(() => onBusyChange(model, busy), [model, busy, onBusyChange]);

  // Report the latest answer once it has finished.
  useEffect(() => {
    if (status !== "ready" || messages.length < 2) return;
    const answer = messages[messages.length - 1];
    const question = messages[messages.length - 2];
    if (answer.role !== "assistant" || question.role !== "user") return;
    if (turnStartedAt.current !== null) {
      const totalMs = Math.round(performance.now() - turnStartedAt.current);
      turnStartedAt.current = null;
      setTimings((t) => ({ ...t, [answer.id]: { ...t[answer.id], totalMs } }));
    }
    onAnswer(model, { messageId: answer.id, prompt: textOf(question), text: textOf(answer) });
  }, [status, messages, model, onAnswer]);

  // Time to first token: when the latest assistant message first has text.
  const last = messages[messages.length - 1];
  const lastText = last?.role === "assistant" ? textOf(last) : "";
  useEffect(() => {
    if (!last || last.role !== "assistant" || !lastText || sentAt.current === null) return;
    const ttft = Math.round(performance.now() - sentAt.current);
    sentAt.current = null;
    setTimings((t) => ({ ...t, [last.id]: { ...t[last.id], ttftMs: ttft } }));
  }, [last, lastText]);

  return (
    <section aria-label={model} className="glass flex min-h-0 min-w-0 flex-col rounded-2xl">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{modelId}</p>
          <p className="truncate text-xs text-muted-foreground">{provider}</p>
        </div>
        {busy && (
          <Button size="icon-sm" variant="ghost" aria-label={`Stop ${modelId}`} onClick={() => stop()}>
            <Square className="size-3.5" />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${modelId}`} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Waiting for a prompt.</p>}
        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="ml-auto w-fit max-w-[90%] rounded-xl bg-default px-3 py-2 text-sm">
              {textOf(m)}
            </p>
          ) : (
            <article key={m.id} className="space-y-2">
              <MarkdownRenderer content={textOf(m) || "…"} />
              <JudgeScore state={scores[m.id]} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span title="Time to first token">first token {fmtMs(timings[m.id]?.ttftMs)}</span>
                {(timings[m.id]?.totalMs ?? m.metadata?.durationMs) !== undefined && (
                  <span title="Time from sending to the last token">
                    total {fmtMs(timings[m.id]?.totalMs ?? m.metadata?.durationMs)}
                  </span>
                )}
                {m.metadata?.outputTokens !== undefined && <span>{m.metadata.outputTokens} tokens out</span>}
                {(() => {
                  const tps = tokensPerSecond(m.metadata?.outputTokens, timings[m.id], m.metadata?.durationMs);
                  return tps === null ? null : <span title="Output tokens per second while streaming">{tps.toFixed(1)} tok/s</span>;
                })()}
                {m.metadata?.costUsd !== undefined && <span title="Estimated cost of this answer">{formatCost(m.metadata.costUsd)}</span>}
                <button
                  className="ml-auto rounded p-1 hover:bg-default hover:text-foreground"
                  aria-label="Copy answer"
                  onClick={() => navigator.clipboard.writeText(textOf(m))}
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </article>
          ),
        )}
        {status === "submitted" && <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
            {error.message}
          </p>
        )}
      </div>
    </section>
  );
}
