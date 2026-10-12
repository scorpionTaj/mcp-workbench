"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviders } from "@/hooks/use-providers";
import { send } from "@/lib/send";

interface Result {
  texts: string[];
  embeddings: number[][];
  dimensions: number;
  similarity: number[][];
  tokens: number | null;
  ms: number;
}

const EXAMPLE = ["The cat sat on the mat.", "A kitten is resting on a rug.", "Quarterly revenue grew by 12%.", "Sales increased this quarter."].join("\n");

// Similarity → background: transparent at 0, full accent at 1.
const cellStyle = (v: number) => ({
  background: `color-mix(in oklab, var(--accent) ${Math.round(Math.max(0, v) * 100)}%, transparent)`,
  color: v > 0.6 ? "var(--accent-foreground)" : undefined,
});

export function EmbeddingsGenerator() {
  const { providers, isLoading } = useProviders();
  const models = providers.flatMap((p) => p.models.filter((m) => m.isEmbedding).map((m) => `${p.provider}:${m.id}`));
  const [model, setModel] = useState("");
  const [text, setText] = useState(EXAMPLE);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const texts = text.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare texts</CardTitle>
          <CardDescription>One text per line (up to 20). Similar meanings get similar vectors, so their cosine similarity is high.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const i = model.indexOf(":");
              setBusy(true);
              setError(null);
              try {
                const r = await send<Omit<Result, "texts">>("/api/embeddings", "POST", {
                  provider: model.slice(0, i),
                  model: model.slice(i + 1),
                  input: texts,
                });
                setResult({ ...r, texts });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Embedding failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="emb-model">Embedding model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="emb-model" className="w-full sm:w-96">
                  <SelectValue placeholder={isLoading ? "Loading models…" : models.length ? "Choose a model" : "No embedding models found"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isLoading && !models.length && (
                <p className="text-xs text-muted-foreground">
                  Connect a provider with embedding models (e.g. OpenAI text-embedding-3-small, Ollama nomic-embed-text).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emb-text">Texts</Label>
              <Textarea id="emb-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={!model || !texts.length || busy}>
              <Sparkles className="size-4" /> {busy ? "Embedding…" : `Embed ${texts.length} text(s)`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{result.dimensions} dimensions</Badge>
            <Badge variant="secondary">{result.ms} ms</Badge>
            {result.tokens !== null && <Badge variant="secondary">{result.tokens} tokens</Badge>}
          </div>

          {result.texts.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cosine similarity</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="border-separate border-spacing-1 text-xs">
                  <thead>
                    <tr>
                      <th />
                      {result.texts.map((_, j) => (
                        <th key={j} className="px-2 font-medium text-muted-foreground">
                          {j + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.texts.map((t, i) => (
                      <tr key={i}>
                        <th className="max-w-64 truncate pr-2 text-left font-normal" title={t}>
                          <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                          {t}
                        </th>
                        {result.similarity[i].map((v, j) => (
                          <td key={j} className="min-w-14 rounded-md px-2 py-1.5 text-center font-mono tabular-nums" style={cellStyle(v)}>
                            {v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.embeddings.map((v, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-xs">
                  <span className="w-48 shrink-0 truncate" title={result.texts[i]}>
                    {result.texts[i]}
                  </span>
                  <code className="min-w-0 flex-1 truncate text-muted-foreground">
                    [{v.slice(0, 8).map((x) => x.toFixed(4)).join(", ")}, …]
                  </code>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Copy vector ${i + 1}`}
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(v))}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
