"use client";

import { useState } from "react";
import { Plus, RotateCcw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComparePanel, type CompareTurn } from "@/components/compare/compare-panel";
import { useProviders } from "@/hooks/use-providers";
import { isChatModel } from "@/lib/types";

const MAX_MODELS = 4;

export default function ComparePage() {
  const { providers, isLoading } = useProviders();
  const available = providers.flatMap((p) => p.models.filter((m) => isChatModel(p.provider, m)).map((m) => `${p.provider}:${m.id}`));
  const [models, setModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState("");
  const [turn, setTurn] = useState<CompareTurn | null>(null);
  const [stopSignal, setStopSignal] = useState(0);
  const [session, setSession] = useState(0); // bumping it clears every thread
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const anyBusy = Object.values(busy).some(Boolean);

  // Returns the same state when nothing changed, so panels can report on every render.
  const onBusyChange = (model: string, b: boolean) => setBusy((s) => (s[model] === b ? s : { ...s, [model]: b }));

  const send = () => {
    const text = prompt.trim();
    if (!text || !models.length || anyBusy) return;
    setTurn((t) => ({ n: (t?.n ?? 0) + 1, text }));
    setPrompt("");
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem-2rem)] min-h-[32rem] flex-col gap-4 md:h-[calc(100dvh-3.5rem-3rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Compare models</h1>
          <p className="text-muted-foreground">Send one prompt to up to four models and compare answers, speed and token use.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {models.length < MAX_MODELS && (
            <Select value="" onValueChange={(m) => setModels((ms) => (ms.includes(m) ? ms : [...ms, m]))}>
              <SelectTrigger className="w-64" aria-label="Add a model">
                <Plus className="size-4" />
                <SelectValue placeholder={isLoading ? "Loading models…" : "Add a model"} />
              </SelectTrigger>
              <SelectContent>
                {available
                  .filter((m) => !models.includes(m))
                  .map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            disabled={anyBusy}
            onClick={() => {
              setSession((s) => s + 1);
              setTurn(null);
            }}
          >
            <RotateCcw className="size-4" /> New comparison
          </Button>
        </div>
      </div>

      <details className="rounded-xl border border-border/60 px-4 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">System prompt and temperature (shared by all models)</summary>
        <div className="mt-3 grid gap-3 pb-2 sm:grid-cols-[1fr_10rem]">
          <div className="space-y-1.5">
            <Label htmlFor="cmp-system">System prompt</Label>
            <Textarea id="cmp-system" rows={2} value={system} onChange={(e) => setSystem(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cmp-temp">Temperature</Label>
            <Input id="cmp-temp" type="number" min={0} max={2} step={0.1} placeholder="default" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          </div>
        </div>
      </details>

      {models.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 p-8 text-center text-muted-foreground">
          {available.length ? "Add two or more models to start." : "Connect a provider on the Providers page to compare its models."}
        </div>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-4 max-lg:auto-rows-[minmax(20rem,1fr)] max-lg:overflow-y-auto"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` }}
        >
          {models.map((m) => (
            <ComparePanel
              key={`${session}-${m}`}
              model={m}
              turn={turn}
              system={system}
              temperature={temperature === "" ? null : Number(temperature)}
              stopSignal={stopSignal}
              onBusyChange={onBusyChange}
              onRemove={() => {
                setModels((ms) => ms.filter((x) => x !== m));
                setBusy((s) => ({ ...s, [m]: false }));
              }}
            />
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Textarea
          aria-label="Prompt"
          rows={2}
          placeholder={models.length ? `Ask ${models.length} model(s)… (Enter to send, Shift+Enter for a new line)` : "Add models first"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-14 resize-none"
        />
        {anyBusy ? (
          <Button type="button" variant="outline" size="lg" onClick={() => setStopSignal((s) => s + 1)}>
            <Square className="size-4" /> Stop all
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!prompt.trim() || !models.length}>
            <Send className="size-4" /> Send
          </Button>
        )}
      </form>
    </div>
  );
}
