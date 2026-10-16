"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupPrice, type ModelPrice } from "@/lib/pricing";

const fmt = (usd: number) => `$${+usd.toFixed(4)}`;

/**
 * A model's price per 1M tokens (the user's override, else the built-in table), with an inline
 * editor. Chat and Compare use it to estimate each reply's cost.
 */
export function ModelPriceEditor({
  provider,
  modelId,
  override,
  onSave,
}: {
  provider: string;
  modelId: string;
  override?: ModelPrice;
  onSave: (price: ModelPrice | null) => Promise<void>;
}) {
  const list = lookupPrice(provider, modelId);
  const price = override ?? list;
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (next: ModelPrice | null) => {
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const valid = input !== "" && output !== "" && Number(input) >= 0 && Number(output) >= 0;
    return (
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save({ input: Number(input), output: Number(output) });
        }}
      >
        <p className="text-xs text-muted-foreground">USD per 1M tokens</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} step="any" aria-label="Input price per 1M tokens" placeholder="Input" value={input} onChange={(e) => setInput(e.target.value)} />
          <Input type="number" min={0} step="any" aria-label="Output price per 1M tokens" placeholder="Output" value={output} onChange={(e) => setOutput(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1 text-xs" disabled={!valid || saving}>
            Save price
          </Button>
          {override && (
            <Button type="button" size="sm" variant="ghost" className="text-xs" disabled={saving} onClick={() => save(null)}>
              Use default
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <DollarSign className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-xs">
        {price ? (
          <>
            {fmt(price.input)} in · {fmt(price.output)} out per 1M{override && " (custom)"}
          </>
        ) : (
          "No price known"
        )}
      </span>
      <button
        className="text-xs text-accent underline-offset-4 hover:underline"
        onClick={() => {
          setInput(price ? String(price.input) : "");
          setOutput(price ? String(price.output) : "");
          setEditing(true);
        }}
      >
        {price ? "Edit" : "Set price"}
      </button>
    </div>
  );
}
