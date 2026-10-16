"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Download, Loader2, Play, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnswerDiffDialog } from "@/components/compare/answer-diff";
import { JudgeScore, requestJudgement, type JudgeConfig, type JudgeState } from "@/components/compare/judge";
import { MAX_BATCH_PROMPTS, parseBatchPrompts, runPool, toCsv } from "@/lib/compare-batch";

type Cell =
  | { status: "queued" }
  | { status: "running" }
  | { status: "error"; error: string }
  | {
      status: "done";
      text: string;
      inputTokens: number | null;
      outputTokens: number | null;
      durationMs: number;
      judge?: JudgeState;
    };

interface Run {
  prompts: string[];
  models: string[];
}

const key = (prompt: number, model: string) => `${prompt}\u0000${model}`;
const fmtMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Runs a list of prompts against every selected model and shows a prompts × models grid. */
export function BatchRunner({
  models,
  system,
  temperature,
  judge,
}: {
  models: string[];
  system: string;
  temperature: number | null;
  judge: JudgeConfig;
}) {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string>();
  const [concurrency, setConcurrency] = useState("3");
  const [useJudge, setUseJudge] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseBatchPrompts(input, fileName), [input, fileName]);
  const judging = useJudge && !!judge.model;
  const total = run ? run.prompts.length * run.models.length : 0;
  const finished = Object.values(cells).filter((c) => c.status === "done" || c.status === "error").length;

  const setCell = (k: string, c: Cell | ((prev: Cell | undefined) => Cell)) =>
    setCells((s) => ({ ...s, [k]: typeof c === "function" ? c(s[k]) : c }));

  const start = async () => {
    if (!parsed.prompts.length || !models.length || running) return;
    const thisRun: Run = { prompts: parsed.prompts, models: [...models] };
    const jobs = thisRun.prompts.flatMap((_, p) => thisRun.models.map((model) => ({ p, model })));
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRun(thisRun);
    setCells(Object.fromEntries(jobs.map((j) => [key(j.p, j.model), { status: "queued" } as Cell])));
    setRunning(true);
    const judgeAt = judging ? { ...judge } : null;

    await runPool(
      jobs,
      Number(concurrency),
      async ({ p, model }) => {
        const k = key(p, model);
        const prompt = thisRun.prompts[p];
        setCell(k, { status: "running" });
        const i = model.indexOf(":");
        try {
          const res = await fetch("/api/compare/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: model.slice(0, i),
              modelId: model.slice(i + 1),
              prompt,
              system: system || undefined,
              ...(temperature !== null && { temperature }),
            }),
            signal: ctrl.signal,
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
          setCell(k, {
            status: "done",
            ...body,
            ...(judgeAt && body.text && { judge: { status: "pending" } }),
          });
          if (judgeAt && body.text) {
            let judgeState: JudgeState;
            try {
              judgeState = {
                status: "done",
                verdict: await requestJudgement(judgeAt, prompt, body.text, ctrl.signal),
              };
            } catch (err) {
              judgeState = {
                status: "error",
                error: ctrl.signal.aborted ? "stopped" : (err as Error).message,
              };
            }
            setCell(k, (prev) => (prev?.status === "done" ? { ...prev, judge: judgeState } : prev!));
          }
        } catch (err) {
          setCell(k, {
            status: "error",
            error: ctrl.signal.aborted ? "Stopped" : (err as Error).message,
          });
        }
      },
      ctrl.signal,
    );
    // Anything never started stays queued; show it as stopped.
    setCells((s) =>
      Object.fromEntries(Object.entries(s).map(([k, c]) => [k, c.status === "queued" ? { status: "error", error: "Stopped" } : c])),
    );
    setRunning(false);
    abort.current = null;
  };

  const exportCsv = () => {
    if (!run) return;
    const rows = run.prompts.flatMap((prompt, p) =>
      run.models.map((model) => {
        const c = cells[key(p, model)];
        const done = c?.status === "done" ? c : null;
        const verdict = done?.judge?.status === "done" ? done.judge.verdict : null;
        return [
          p + 1,
          prompt,
          model,
          c?.status ?? "",
          done?.text ?? "",
          done?.durationMs ?? "",
          done?.inputTokens ?? "",
          done?.outputTokens ?? "",
          verdict?.score ?? "",
          verdict?.rationale ?? "",
          c?.status === "error" ? c.error : done?.judge?.status === "error" ? `judge: ${done.judge.error}` : "",
        ];
      }),
    );
    const csv = toCsv(
      [
        "prompt_index",
        "prompt",
        "model",
        "status",
        "answer",
        "duration_ms",
        "input_tokens",
        "output_tokens",
        "judge_score",
        "judge_rationale",
        "error",
      ],
      rows,
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare-batch-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Per-model averages over the finished cells.
  const summary = (model: string) => {
    if (!run) return null;
    const done = run.prompts
      .map((_, p) => cells[key(p, model)])
      .filter((c): c is Extract<Cell, { status: "done" }> => c?.status === "done");
    const scores = done.flatMap((c) => (c.judge?.status === "done" ? [c.judge.verdict.score] : []));
    return {
      ms: avg(done.map((c) => c.durationMs)),
      out: done.reduce((s, c) => s + (c.outputTokens ?? 0), 0),
      score: avg(scores),
    };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="glass space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="batch-prompts">Prompts</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setInput(await file.text());
                setFileName(file.name);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={running}>
              <Upload className="size-4" /> Upload .txt or .csv
            </Button>
          </div>
        </div>
        <Textarea
          id="batch-prompts"
          rows={6}
          placeholder={`One prompt per line, or CSV with a "prompt" column (up to ${MAX_BATCH_PROMPTS}).`}
          value={input}
          disabled={running}
          onChange={(e) => {
            setInput(e.target.value);
            setFileName(undefined);
          }}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {parsed.prompts.length} prompt(s){fileName ? ` from ${fileName}` : ""} × {models.length} model(s) ={" "}
          {parsed.prompts.length * models.length} runs.
          {parsed.warning && <span className="ml-1 text-warning">{parsed.warning}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="batch-concurrency" className="text-sm">
              At once
            </Label>
            <Select value={concurrency} onValueChange={setConcurrency}>
              <SelectTrigger id="batch-concurrency" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "6"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={useJudge} onCheckedChange={setUseJudge} disabled={running} aria-label="Score answers with the judge" />
            <span aria-hidden>Score with judge</span>
            {!judge.model && <span className="text-xs text-muted-foreground">(choose a judge above)</span>}
          </div>
          <div className="ml-auto flex gap-2">
            {run && !running && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="size-4" /> Export CSV
              </Button>
            )}
            {running ? (
              <Button variant="outline" onClick={() => abort.current?.abort()}>
                <Square className="size-4" /> Stop
              </Button>
            ) : (
              <Button onClick={start} disabled={!parsed.prompts.length || !models.length}>
                <Play className="size-4" /> Run batch
              </Button>
            )}
          </div>
        </div>
        {run && (
          <div className="space-y-1">
            <Progress value={total ? (finished / total) * 100 : 0} aria-label="Batch progress" />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {finished} of {total} done{running ? "…" : "."}
            </p>
          </div>
        )}
      </div>

      {run && (
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-default/40 text-left">
                <th className="sticky left-0 z-10 w-72 min-w-56 bg-background p-3 font-semibold">Prompt</th>
                {run.models.map((m) => {
                  const s = summary(m);
                  return (
                    <th key={m} className="min-w-72 p-3 align-top font-semibold">
                      <div className="truncate">{m}</div>
                      {s && (
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-normal text-muted-foreground">
                          {s.ms !== null && <span>avg {fmtMs(Math.round(s.ms))}</span>}
                          <span>{s.out} tokens out</span>
                          {s.score !== null && <span>avg score {s.score.toFixed(1)}</span>}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {run.prompts.map((prompt, p) => {
                const answers = run.models.flatMap((m) => {
                  const c = cells[key(p, m)];
                  return c?.status === "done" ? [{ id: m, text: c.text }] : [];
                });
                return (
                  <tr key={p} className="border-b border-border/40 align-top last:border-0">
                    <td className="sticky left-0 z-10 w-72 min-w-56 bg-background p-3">
                      <p className="line-clamp-4 whitespace-pre-wrap" title={prompt}>
                        <span className="mr-1 text-muted-foreground tabular-nums">{p + 1}.</span>
                        {prompt}
                      </p>
                      {answers.length >= 2 && (
                        <div className="mt-2">
                          <AnswerDiffDialog answers={answers} size="sm" title={`Prompt ${p + 1}`} />
                        </div>
                      )}
                    </td>
                    {run.models.map((m) => (
                      <td key={m} className="max-w-md p-3">
                        <BatchCell cell={cells[key(p, m)]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchCell({ cell }: { cell?: Cell }) {
  if (!cell || cell.status === "queued") return <span className="text-xs text-muted-foreground">queued</span>;
  if (cell.status === "running") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> running…
      </span>
    );
  }
  if (cell.status === "error") {
    return (
      <span className="flex items-start gap-1 text-xs text-danger">
        <AlertCircle className="mt-0.5 size-3 shrink-0" /> {cell.error}
      </span>
    );
  }
  return (
    <div className="space-y-2">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <p className="line-clamp-4 whitespace-pre-wrap group-open:line-clamp-none">
            {cell.text || <em className="text-muted-foreground">(empty answer)</em>}
          </p>
        </summary>
      </details>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{fmtMs(cell.durationMs)}</span>
        {cell.inputTokens !== null && <span>{cell.inputTokens} in</span>}
        {cell.outputTokens !== null && <span>{cell.outputTokens} out</span>}
      </div>
      <JudgeScore state={cell.judge} />
    </div>
  );
}
