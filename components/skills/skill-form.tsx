"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SkillDetail, SkillInput } from "@/hooks/use-skills";

/** Create or edit a skill: SKILL.md fields plus optional text resource files. */
export function SkillForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SkillDetail;
  submitLabel: string;
  onSubmit: (input: SkillInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [files, setFiles] = useState<{ path: string; text: string }[]>(
    Object.entries(initial?.resources ?? {}).map(([path, text]) => ({ path, text })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Plugin skills are namespaced "plugin:skill" and keep their name.
  const fromPlugin = Boolean(initial?.pluginId);

  const setFile = (i: number, patch: Partial<{ path: string; text: string }>) =>
    setFiles((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const paths = files.map((f) => f.path.trim());
        if (paths.some((p) => !p)) return setError("Every file needs a path");
        if (new Set(paths).size !== paths.length) return setError("File paths must be unique");
        setSaving(true);
        setError(null);
        try {
          await onSubmit({
            ...(fromPlugin ? {} : { name }),
            description,
            instructions,
            resources: Object.fromEntries(files.map((f) => [f.path.trim(), f.text])),
          } as SkillInput);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="skill-name">Name</Label>
          <Input
            id="skill-name"
            value={name}
            required
            maxLength={64}
            disabled={fromPlugin}
            placeholder="pdf-forms"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill-description">When to use it</Label>
          <Input
            id="skill-description"
            value={description}
            required
            maxLength={1000}
            placeholder="Fill and check PDF forms. Use when the user asks about PDF form fields."
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The model always sees the name and description, and loads the instructions only when the skill is relevant.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="skill-instructions">Instructions (SKILL.md body, Markdown)</Label>
        <Textarea
          id="skill-instructions"
          rows={10}
          required
          className="font-mono text-sm"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Resource files</legend>
        <p className="text-xs text-muted-foreground">
          Reference material the model can open with read_skill_file, e.g. reference.md or templates/report.md.
        </p>
        {files.map((f, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <div className="flex gap-2">
              <Input
                aria-label="File path"
                placeholder="reference.md"
                value={f.path}
                maxLength={300}
                onChange={(e) => setFile(i, { path: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${f.path || "file"}`}
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              aria-label={`Contents of ${f.path || "file"}`}
              rows={4}
              className="font-mono text-xs"
              value={f.text}
              onChange={(e) => setFile(i, { text: e.target.value })}
            />
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setFiles((fs) => [...fs, { path: "", text: "" }])}>
          <Plus className="w-3 h-3 mr-1" /> Add file
        </Button>
      </fieldset>
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
