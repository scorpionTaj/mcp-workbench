"use client";

import { Gavel, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_RUBRIC, type JudgeVerdict } from "@/lib/compare-judge";
import { cn } from "@/lib/utils";

export interface JudgeConfig {
  /** "provider:modelId", or "" when no judge is chosen. */
  model: string;
  rubric: string;
}

export const DEFAULT_JUDGE: JudgeConfig = { model: "", rubric: DEFAULT_RUBRIC };

export type JudgeState = { status: "pending" } | { status: "done"; verdict: JudgeVerdict } | { status: "error"; error: string };

const splitModel = (m: string) => {
  const i = m.indexOf(":");
  return { provider: m.slice(0, i), modelId: m.slice(i + 1) };
};

/** Asks the judge model to score one answer. */
export async function requestJudgement(judge: JudgeConfig, prompt: string, answer: string, signal?: AbortSignal): Promise<JudgeVerdict> {
  const res = await fetch("/api/compare/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...splitModel(judge.model),
      rubric: judge.rubric,
      prompt,
      answer,
    }),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Judge failed (${res.status})`);
  return body as JudgeVerdict;
}

export function JudgeSettings({ value, onChange, models }: { value: JudgeConfig; onChange: (v: JudgeConfig) => void; models: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
      <div className="space-y-1.5">
        <Label htmlFor="judge-model">Judge model</Label>
        <Select value={value.model} onValueChange={(model) => onChange({ ...value, model })}>
          <SelectTrigger id="judge-model" className="w-full">
            <SelectValue placeholder="Choose a judge" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Scores each answer 1–10 against the rubric.</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="judge-rubric">Rubric</Label>
          {value.rubric !== DEFAULT_RUBRIC && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ ...value, rubric: DEFAULT_RUBRIC })}
            >
              Reset
            </button>
          )}
        </div>
        <Textarea
          id="judge-rubric"
          rows={4}
          maxLength={5000}
          value={value.rubric}
          onChange={(e) => onChange({ ...value, rubric: e.target.value })}
        />
      </div>
    </div>
  );
}

const tone = (score: number) =>
  score >= 8 ? "border-success/50 bg-success/15" : score >= 5 ? "border-warning/50 bg-warning/15" : "border-danger/50 bg-danger/15";

/** The judge's score with its rationale, or its progress or error. */
export function JudgeScore({ state, compact = false }: { state?: JudgeState; compact?: boolean }) {
  if (!state) return null;
  if (state.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> judging…
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span className="text-xs text-danger" title={state.error}>
        {compact ? "judge failed" : `Judge failed: ${state.error}`}
      </span>
    );
  }
  const { score, rationale } = state.verdict;
  return (
    <div className={cn("flex items-start gap-2 text-xs", compact && "items-center")} title={compact ? rationale : undefined}>
      <span
        className={cn("inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold tabular-nums", tone(score))}
      >
        <Gavel className="size-3" aria-hidden /> {score}/10
      </span>
      {!compact && <span className="text-muted-foreground">{rationale}</span>}
    </div>
  );
}
