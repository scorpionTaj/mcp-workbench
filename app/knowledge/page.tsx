"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Globe, Library, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviders } from "@/hooks/use-providers";
import {
  useKnowledgeBase,
  useKnowledgeBases,
  type KnowledgeDocumentInfo,
  type SearchHit,
} from "@/hooks/use-knowledge";

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const ACCEPT = ".pdf,.html,.htm,.md,.markdown,.mdx,.txt,.csv,.tsv,.json,.jsonl,.yaml,.yml,.xml,.rst,.log,.py,.js,.ts,.tsx,.jsx,.go,.rs,.java,.sql";

function CreateForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const { providers } = useProviders();
  const { create } = useKnowledgeBases();
  const models = providers.flatMap((p) => p.models.filter((m) => m.isEmbedding).map((m) => `${p.provider}:${m.id}`));
  const [form, setForm] = useState({ name: "", description: "", model: "", custom: "", chunkSize: 1000, chunkOverlap: 150 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const chosen = form.model === "__custom__" ? form.custom : form.model;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const i = chosen.indexOf(":");
        if (i < 1) return setError("Pick an embedding model (provider:model)");
        setSaving(true);
        setError(null);
        try {
          const kb = await create({
            name: form.name,
            description: form.description || null,
            embeddingProvider: chosen.slice(0, i),
            embeddingModel: chosen.slice(i + 1),
            chunkSize: Number(form.chunkSize),
            chunkOverlap: Number(form.chunkOverlap),
          });
          onCreated(kb.id);
        } catch (err) {
          setError(errorText(err, "Could not create it"));
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kb-name">Name</Label>
          <Input id="kb-name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb-model">Embedding model</Label>
          <Select value={form.model} onValueChange={(model) => setForm({ ...form, model })}>
            <SelectTrigger id="kb-model">
              <SelectValue placeholder={models.length ? "Choose a model" : "No embedding models found"} />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Other (type provider:model)…</SelectItem>
            </SelectContent>
          </Select>
          {form.model === "__custom__" && (
            <Input
              aria-label="Custom embedding model"
              placeholder="openai:text-embedding-3-small"
              value={form.custom}
              onChange={(e) => setForm({ ...form, custom: e.target.value })}
            />
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kb-description">What&apos;s in it (helps the model decide when to search)</Label>
        <Input
          id="kb-description"
          maxLength={500}
          placeholder="Company HR policies: leave, expenses, remote work"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kb-chunk">Chunk size (characters)</Label>
          <Input id="kb-chunk" type="number" min={200} max={8000} value={form.chunkSize} onChange={(e) => setForm({ ...form, chunkSize: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kb-overlap">Overlap (characters)</Label>
          <Input id="kb-overlap" type="number" min={0} max={2000} value={form.chunkOverlap} onChange={(e) => setForm({ ...form, chunkOverlap: Number(e.target.value) })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">The embedding model and chunking can&apos;t change after creation, since every chunk is embedded with them.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Checking model…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function StatusBadge({ doc }: { doc: KnowledgeDocumentInfo }) {
  if (doc.status === "processing")
    return (
      <Badge variant="outline">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Indexing
      </Badge>
    );
  if (doc.status === "error")
    return (
      <Badge variant="destructive" title={doc.error ?? undefined}>
        <AlertCircle className="w-3 h-3 mr-1" /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline">
      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> {doc.chunkCount} chunks
    </Badge>
  );
}

function SearchResults({ hits, ms }: { hits: SearchHit[]; ms: number }) {
  if (!hits.length) return <p className="text-sm text-muted-foreground">No matching passages.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {hits.length} passage(s) in {ms} ms. Score = reciprocal rank fusion of vector and keyword search.
      </p>
      <ol className="space-y-2">
        {hits.map((h, i) => (
          <li key={h.chunkId} className="rounded-md border p-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {i + 1}. {h.document}
              </span>
              <span>chunk {h.position + 1}</span>
              <span>score {h.score}</span>
              {h.sourceUrl && (
                <a href={h.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  source
                </a>
              )}
            </div>
            <p className="whitespace-pre-wrap">{h.content}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function KnowledgeBaseDetail({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { knowledgeBase: kb, addFiles, addUrl, addText, removeDocument, getChunks } = useKnowledgeBase(id);
  const { remove, search } = useKnowledgeBases();
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState<{ name: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ hits: SearchHit[]; ms: number } | null>(null);
  const [chunks, setChunks] = useState<{ doc: string; items: { position: number; content: string }[] } | null>(null);

  const run = async (label: string, action: () => Promise<string | void>) => {
    setBusy(label);
    setMessage(null);
    try {
      const text = await action();
      if (text) setMessage({ ok: true, text });
    } catch (err) {
      setMessage({ ok: false, text: errorText(err, "Something went wrong") });
    } finally {
      setBusy(null);
    }
  };

  if (!kb) return <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{kb.name}</h2>
          {kb.description && <p className="text-muted-foreground">{kb.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline">
              {kb.embeddingProvider}:{kb.embeddingModel}
            </Badge>
            <Badge variant="outline">
              {kb.chunkSize} / {kb.chunkOverlap} chars
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            confirm(`Delete ${kb.name} and all its documents?`) && run("delete", async () => {
              await remove(kb.id);
              onDeleted();
            })
          }
        >
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add documents</CardTitle>
          <CardDescription>PDF, HTML, Markdown, text, code, CSV or JSON (up to 20 MB each), a web page, or pasted text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" disabled={busy !== null}>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" /> {busy === "files" ? "Uploading…" : "Upload files"}
                <input
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="sr-only"
                  aria-label="Upload files"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    if (files.length)
                      run("files", async () => {
                        const { errors } = await addFiles(files);
                        return errors.length ? `Skipped: ${errors.join("; ")}` : undefined;
                      });
                  }}
                />
              </label>
            </Button>
            <Button variant="outline" onClick={() => setPaste(paste ? null : { name: "", text: "" })}>
              <FileText className="w-4 h-4 mr-2" /> Paste text
            </Button>
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run("url", async () => {
                await addUrl(url.trim());
                setUrl("");
              });
            }}
          >
            <Input
              type="url"
              required
              placeholder="https://docs.example.com/guide"
              aria-label="Web page URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline" disabled={busy !== null}>
              <Globe className="w-4 h-4 mr-2" /> {busy === "url" ? "Fetching…" : "Add web page"}
            </Button>
          </form>
          {paste && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                run("paste", async () => {
                  await addText(paste.name, paste.text);
                  setPaste(null);
                });
              }}
            >
              <Input required placeholder="Document name" aria-label="Document name" value={paste.name} onChange={(e) => setPaste({ ...paste, name: e.target.value })} />
              <Textarea required rows={6} aria-label="Document text" value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
              <Button type="submit" size="sm" disabled={busy !== null}>
                Add text
              </Button>
            </form>
          )}
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}>
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h3 className="font-semibold">Documents ({kb.documents.length})</h3>
        {kb.documents.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        <ul className="divide-y rounded-md border">
          {kb.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.mime} · {(doc.size / 1000).toFixed(1)}k chars
                  {doc.status === "error" && doc.error && <span className="text-destructive"> · {doc.error}</span>}
                </p>
              </div>
              <StatusBadge doc={doc} />
              {doc.status === "ready" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const d = await getChunks(doc.id);
                    setChunks({ doc: d.name, items: d.chunks });
                  }}
                >
                  View chunks
                </Button>
              )}
              {doc.sourceUrl && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={doc.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${doc.name}`}>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${doc.name}`}
                onClick={() => confirm(`Delete ${doc.name}?`) && run("doc", () => removeDocument(doc.id))}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {chunks && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Chunks of {chunks.doc}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setChunks(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {chunks.items.map((c) => (
              <div key={c.position} className="rounded border p-2 text-xs">
                <p className="mb-1 text-muted-foreground">#{c.position + 1} · {c.content.length} chars</p>
                <p className="whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">Test retrieval</h3>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run("search", async () => setResults(await search([kb.id], query.trim())));
          }}
        >
          <Input
            required
            placeholder="Ask a question the documents should answer"
            aria-label="Search query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={busy !== null}>
            <Search className="w-4 h-4 mr-2" /> Search
          </Button>
        </form>
        {results && <SearchResults {...results} />}
      </section>
    </div>
  );
}

export default function KnowledgePage() {
  const { knowledgeBases, isLoading } = useKnowledgeBases();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const current = selected ?? knowledgeBases[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Knowledge</h1>
          <p className="text-muted-foreground">
            Retrieval-augmented generation: add documents, then turn a knowledge base on in a chat or agent so the model
            searches it and cites what it finds.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" /> New knowledge base
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New knowledge base</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateForm
              onCancel={() => setCreating(false)}
              onCreated={(id) => {
                setCreating(false);
                setSelected(id);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && knowledgeBases.length === 0 && !creating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Library className="w-8 h-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">No knowledge bases yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Create one with an embedding model from your providers (e.g. OpenAI text-embedding-3-small, or
              nomic-embed-text on Ollama), then add documents.
            </p>
          </CardContent>
        </Card>
      )}

      {knowledgeBases.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="Knowledge bases" className="space-y-1">
            {knowledgeBases.map((kb) => (
              <button
                key={kb.id}
                onClick={() => setSelected(kb.id)}
                aria-current={kb.id === current ? "page" : undefined}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  kb.id === current ? "border-primary" : "border-transparent hover:border-border"
                }`}
              >
                <p className="truncate font-medium">{kb.name}</p>
                <p className="text-xs text-muted-foreground">
                  {kb.documentCount} doc(s) · {kb.chunkCount} chunks
                </p>
              </button>
            ))}
          </nav>
          {current && <KnowledgeBaseDetail key={current} id={current} onDeleted={() => setSelected(null)} />}
        </div>
      )}
    </div>
  );
}
