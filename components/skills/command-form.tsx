"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommandInfo, CommandInput } from "@/hooks/use-skills";

export function CommandForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: CommandInfo;
  submitLabel: string;
  onSubmit: (input: CommandInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    argumentHint: initial?.argumentHint ?? "",
    prompt: initial?.prompt ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await onSubmit({
            name: form.name.replace(/^\//, ""),
            description: form.description || null,
            argumentHint: form.argumentHint || null,
            prompt: form.prompt,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr_12rem]">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-name">Name</Label>
          <Input id="cmd-name" value={form.name} required maxLength={64} placeholder="review" onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cmd-description">Description</Label>
          <Input id="cmd-description" value={form.description} maxLength={500} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cmd-hint">Argument hint</Label>
          <Input id="cmd-hint" value={form.argumentHint} maxLength={200} placeholder="<file>" onChange={(e) => set("argumentHint", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cmd-prompt">Prompt</Label>
        <Textarea
          id="cmd-prompt"
          rows={6}
          required
          className="font-mono text-sm"
          value={form.prompt}
          onChange={(e) => set("prompt", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Typing <code>/{form.name || "name"} some text</code> in chat sends this prompt. <code>$ARGUMENTS</code> becomes the
          text after the command; <code>$1</code>…<code>$9</code> become its words.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
