"use client";

import { useMemo, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { diffStats, diffWords } from "@/lib/word-diff";

export interface DiffAnswer {
  /** The model ("provider:modelId"), used as the option value. */
  id: string;
  text: string;
}

/** Word-level diff of two texts: removed words struck through, added ones highlighted. */
export function WordDiff({ from, to, note }: { from: string; to: string; note?: string }) {
  const parts = useMemo(() => diffWords(from, to), [from, to]);
  const stats = diffStats(parts);
  return (
    <>
      <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
        <span>
          <span className="rounded-sm bg-danger/20 px-1 line-through decoration-danger/70">removed</span> {stats.deleted} {stats.deleted === 1 ? "word" : "words"}
        </span>
        <span>
          <span className="rounded-sm bg-success/20 px-1">added</span> {stats.inserted} {stats.inserted === 1 ? "word" : "words"}
        </span>
        {note && <span>{note}</span>}
      </p>
      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border/60 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((p, i) =>
          p.op === "equal" ? (
            <span key={i}>{p.text}</span>
          ) : p.op === "delete" ? (
            <del key={i} className="rounded-sm bg-danger/20 line-through decoration-danger/70" aria-label={`removed: ${p.text}`}>
              {p.text}
            </del>
          ) : (
            <ins key={i} className="rounded-sm bg-success/20 no-underline" aria-label={`added: ${p.text}`}>
              {p.text}
            </ins>
          ),
        )}
      </div>
    </>
  );
}

/** Word-level diff between two of the given answers; the reader picks which two. */
export function AnswerDiff({ answers }: { answers: DiffAnswer[] }) {
  const [a, setA] = useState(answers[0]?.id ?? "");
  const [b, setB] = useState(answers[1]?.id ?? "");
  const left = answers.find((x) => x.id === a);
  const right = answers.find((x) => x.id === b);

  const picker = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="min-w-0 flex-1 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose an answer" />
        </SelectTrigger>
        <SelectContent>
          {answers.map((x) => (
            <SelectItem key={x.id} value={x.id}>
              {x.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {picker("diff-a", "From", a, setA)}
        {picker("diff-b", "To", b, setB)}
      </div>
      {left && right && (
        <WordDiff from={left.text} to={right.text} note={a === b ? "Both sides are the same answer." : undefined} />
      )}
    </div>
  );
}

/** A button that opens AnswerDiff in a dialog; disabled until there are two answers. */
export function AnswerDiffDialog({
  answers,
  title = "Compare answers",
  size = "default",
}: {
  answers: DiffAnswer[];
  title?: string;
  size?: "default" | "sm";
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} disabled={answers.length < 2}>
          <GitCompareArrows className="size-4" /> Diff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Word-level differences between two answers.</DialogDescription>
        </DialogHeader>
        {/* Keyed so reopening with new answers resets the picks. */}
        <AnswerDiff key={answers.map((x) => x.id).join("|")} answers={answers} />
      </DialogContent>
    </Dialog>
  );
}
