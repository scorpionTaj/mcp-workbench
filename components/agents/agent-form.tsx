"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviders } from "@/hooks/use-providers";
import { isChatModel } from "@/lib/types";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useSkills } from "@/hooks/use-skills";
import { useKnowledgeBases } from "@/hooks/use-knowledge";
import type { AgentInfo, AgentInput } from "@/hooks/use-agents";

const NO_MODEL = "__none__";

export function AgentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<AgentInfo>;
  submitLabel: string;
  onSubmit: (input: AgentInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { providers } = useProviders();
  const { servers } = useMcpServers();
  const { skills } = useSkills();
  const { knowledgeBases } = useKnowledgeBases();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    icon: initial?.icon ?? "🤖",
    category: initial?.category ?? "general",
    description: initial?.description ?? "",
    systemPrompt: initial?.systemPrompt ?? "",
    model: initial?.provider && initial.modelId ? `${initial.provider}:${initial.modelId}` : NO_MODEL,
    temperature: initial?.temperature?.toString() ?? "",
    maxSteps: initial?.maxSteps ?? 8,
    toolServerIds: initial?.toolServerIds ?? [],
    skillIds: initial?.skillIds ?? [],
    knowledgeBaseIds: initial?.knowledgeBaseIds ?? [],
    starterPrompts: (initial?.starterPrompts ?? []).join("\n"),
    isPublic: initial?.isPublic ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const models = providers.flatMap((p) => p.models.filter((m) => isChatModel(p.provider, m)).map((m) => `${p.provider}:${m.id}`));
  if (form.model !== NO_MODEL && !models.includes(form.model)) models.unshift(form.model);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const i = form.model.indexOf(":");
        try {
          await onSubmit({
            name: form.name,
            icon: form.icon || null,
            category: form.category || "general",
            description: form.description || null,
            systemPrompt: form.systemPrompt,
            provider: form.model === NO_MODEL ? null : form.model.slice(0, i),
            modelId: form.model === NO_MODEL ? null : form.model.slice(i + 1),
            temperature: form.temperature === "" ? null : Number(form.temperature),
            maxSteps: Number(form.maxSteps),
            toolServerIds: form.toolServerIds,
            skillIds: form.skillIds,
            knowledgeBaseIds: form.knowledgeBaseIds,
            starterPrompts: form.starterPrompts.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8),
            isPublic: form.isPublic,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[5rem_1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="agent-icon">Icon</Label>
          <Input id="agent-icon" value={form.icon} maxLength={4} onChange={(e) => set("icon", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Name</Label>
          <Input id="agent-name" value={form.name} required maxLength={80} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-category">Category</Label>
          <Input id="agent-category" value={form.category} maxLength={40} onChange={(e) => set("category", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agent-description">Description</Label>
        <Input id="agent-description" value={form.description} maxLength={500} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agent-prompt">Instructions (system prompt)</Label>
        <Textarea id="agent-prompt" rows={6} required value={form.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="agent-model">Default model</Label>
          <Select value={form.model} onValueChange={(v) => set("model", v)}>
            <SelectTrigger id="agent-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MODEL}>Use the chat&apos;s model</SelectItem>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-temperature">Temperature</Label>
          <Input
            id="agent-temperature"
            type="number"
            min={0}
            max={2}
            step={0.1}
            placeholder="chat default"
            value={form.temperature}
            onChange={(e) => set("temperature", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agent-steps">Max tool steps</Label>
          <Input
            id="agent-steps"
            type="number"
            min={1}
            max={50}
            value={form.maxSteps}
            onChange={(e) => set("maxSteps", Number(e.target.value))}
          />
        </div>
      </div>
      {servers.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">MCP servers this agent can use</legend>
          <div className="flex flex-wrap gap-3">
            {servers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.toolServerIds.includes(s.id)}
                  onChange={(e) =>
                    set(
                      "toolServerIds",
                      e.target.checked ? [...form.toolServerIds, s.id] : form.toolServerIds.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {knowledgeBases.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Knowledge bases this agent searches</legend>
          <div className="flex flex-wrap gap-3">
            {knowledgeBases.map((kb) => (
              <label key={kb.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.knowledgeBaseIds.includes(kb.id)}
                  onChange={(e) =>
                    set(
                      "knowledgeBaseIds",
                      e.target.checked ? [...form.knowledgeBaseIds, kb.id] : form.knowledgeBaseIds.filter((id) => id !== kb.id),
                    )
                  }
                />
                {kb.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {skills.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Skills</legend>
          <p className="text-xs text-muted-foreground">None checked = every enabled skill is available.</p>
          <div className="flex flex-wrap gap-3">
            {skills.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm font-mono" title={s.description}>
                <input
                  type="checkbox"
                  checked={form.skillIds.includes(s.id)}
                  onChange={(e) =>
                    set("skillIds", e.target.checked ? [...form.skillIds, s.id] : form.skillIds.filter((id) => id !== s.id))
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="agent-starters">Starter prompts (one per line)</Label>
        <Textarea id="agent-starters" rows={3} value={form.starterPrompts} onChange={(e) => set("starterPrompts", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={form.isPublic} onCheckedChange={(v) => set("isPublic", v)} aria-label="Share with all users" />
        Share with all users (they won&apos;t see your MCP servers or keys)
      </label>
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
