"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Suggested defaults; any model id the provider offers can be typed instead.
const SUGGESTED: Record<string, string> = {
  cohere: "rerank-v3.5",
  together: "Salesforce/Llama-Rank-V1",
};
const OFF = "__off__";

/** Choose (or turn off) the reranking model applied to this knowledge base's search results. */
export function KnowledgeReranker({
  provider,
  model,
  onSave,
}: {
  provider: string | null;
  model: string | null;
  onSave: (provider: string | null, model: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ provider: provider ?? OFF, model: model ?? "" });
  const [state, setState] = useState<{ busy?: boolean; error?: string; saved?: boolean }>({});
  const off = draft.provider === OFF;
  const dirty = (off ? null : draft.provider) !== provider || (off ? null : draft.model.trim()) !== (provider ? model : null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ busy: true });
        try {
          await onSave(off ? null : draft.provider, off ? null : draft.model.trim());
          setState({ saved: true });
        } catch (err) {
          setState({ error: err instanceof Error ? err.message : "Could not save" });
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="kb-rerank-provider">Reranker</Label>
        <Select
          value={draft.provider}
          onValueChange={(p) => setDraft({ provider: p, model: p === OFF ? "" : draft.model || SUGGESTED[p] || "" })}
        >
          <SelectTrigger id="kb-rerank-provider" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OFF}>Off</SelectItem>
            <SelectItem value="cohere">Cohere</SelectItem>
            <SelectItem value="together">Together AI</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!off && (
        <div className="space-y-1.5">
          <Label htmlFor="kb-rerank-model">Model</Label>
          <Input
            id="kb-rerank-model"
            className="w-64"
            required
            value={draft.model}
            onChange={(e) => setDraft({ ...draft, model: e.target.value })}
          />
        </div>
      )}
      <Button type="submit" size="sm" disabled={state.busy || !dirty}>
        {state.busy ? "Checking…" : "Save"}
      </Button>
      <p className="basis-full text-xs text-muted-foreground">
        {state.error ? (
          <span role="alert" className="text-destructive">
            {state.error}
          </span>
        ) : state.saved && !dirty ? (
          "Saved."
        ) : (
          "A reranker reorders the best hybrid matches by relevance before they reach the model. Uses your provider key."
        )}
      </p>
    </form>
  );
}
