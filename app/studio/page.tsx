"use client";

import { useState } from "react";
import useSWR from "swr";
import { AudioLines, Copy, Download, ImageIcon, Loader2, Mic, Trash2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviders } from "@/hooks/use-providers";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

type Kind = "image" | "transcription" | "speech";

interface Generation {
  id: string;
  kind: Kind;
  provider: string;
  modelId: string;
  prompt: string | null;
  text: string | null;
  files: string[];
  settings: Record<string, unknown>;
  durationMs: number | null;
  createdAt: string;
}

// Starting points per provider; any model id the provider accepts can be typed instead.
const SUGGESTED: Record<Kind, Record<string, string[]>> = {
  image: {
    openai: ["gpt-image-1", "dall-e-3", "dall-e-2"],
    google: ["imagen-4.0-generate-001", "imagen-4.0-fast-generate-001"],
    together: ["black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-dev"],
  },
  transcription: {
    openai: ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
    groq: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
  speech: {
    openai: ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"],
    google: ["gemini-2.5-flash-preview-tts"],
    groq: ["playai-tts"],
  },
};
const VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];

const TABS: { kind: Kind; label: string; icon: typeof ImageIcon }[] = [
  { kind: "image", label: "Images", icon: ImageIcon },
  { kind: "transcription", label: "Speech to text", icon: Mic },
  { kind: "speech", label: "Text to speech", icon: AudioLines },
];

function ModelPicker({ kind, provider, model, onProvider, onModel }: {
  kind: Kind;
  provider: string;
  model: string;
  onProvider: (p: string) => void;
  onModel: (m: string) => void;
}) {
  const { providers } = useProviders();
  const connected = providers.filter((p) => p.connected);
  const flag = kind === "image" ? "isImageGeneration" : kind === "transcription" ? "isAudioTranscription" : null;
  const fromProvider = providers
    .find((p) => p.provider === provider)
    ?.models.filter((m) => (flag ? m[flag] : /tts|speech/i.test(m.id)))
    .map((m) => m.id) ?? [];
  const suggestions = [...new Set([...(SUGGESTED[kind][provider] ?? []), ...fromProvider])];
  const listId = `models-${kind}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${kind}-provider`}>Provider</Label>
        <Select
          value={provider}
          onValueChange={(p) => {
            onProvider(p);
            onModel(SUGGESTED[kind][p]?.[0] ?? "");
          }}
        >
          <SelectTrigger id={`${kind}-provider`}>
            <SelectValue placeholder={connected.length ? "Choose a provider" : "Connect a provider first"} />
          </SelectTrigger>
          <SelectContent>
            {connected.map((p) => (
              <SelectItem key={p.provider} value={p.provider}>
                {p.provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${kind}-model`}>Model</Label>
        <Input id={`${kind}-model`} list={listId} value={model} placeholder="model id" onChange={(e) => onModel(e.target.value)} required />
        <datalist id={listId}>
          {suggestions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;
}

function ImageForm({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [n, setN] = useState(1);
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await send("/api/studio/image", "POST", { provider, modelId: model, prompt, n, ...(size && { size }) });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ModelPicker kind="image" provider={provider} model={model} onProvider={setProvider} onModel={setModel} />
      <div className="space-y-1.5">
        <Label htmlFor="image-prompt">Prompt</Label>
        <Textarea id="image-prompt" rows={3} required maxLength={4000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A lighthouse on a cliff at dawn, watercolor" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="image-n">Images</Label>
          <Input id="image-n" type="number" min={1} max={4} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="image-size">Size (optional)</Label>
          <Input id="image-size" placeholder="1024x1024" pattern="\d{2,4}x\d{2,4}" value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
      </div>
      <ErrorText error={error} />
      <Button type="submit" disabled={busy || !provider || !model || !prompt.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} {busy ? "Generating…" : "Generate"}
      </Button>
    </form>
  );
}

function TranscribeForm({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        const formEl = e.currentTarget;
        setBusy(true);
        setError(null);
        const form = new FormData();
        form.append("file", file);
        form.append("provider", provider);
        form.append("modelId", model);
        try {
          const res = await fetch("/api/studio/transcribe", { method: "POST", body: form });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error ?? `Failed (${res.status})`);
          setFile(null);
          formEl.reset();
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ModelPicker kind="transcription" provider={provider} model={model} onProvider={setProvider} onModel={setModel} />
      <div className="space-y-1.5">
        <Label htmlFor="transcribe-file">Audio file (mp3, m4a, wav, webm, ogg, flac; up to 25 MB)</Label>
        <Input id="transcribe-file" type="file" accept="audio/*,video/mp4,video/webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <ErrorText error={error} />
      <Button type="submit" disabled={busy || !provider || !model || !file}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />} {busy ? "Transcribing…" : "Transcribe"}
      </Button>
    </form>
  );
}

function SpeechForm({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await send("/api/studio/speech", "POST", { provider, modelId: model, text, ...(voice && { voice }) });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ModelPicker kind="speech" provider={provider} model={model} onProvider={setProvider} onModel={setModel} />
      <div className="space-y-1.5">
        <Label htmlFor="speech-text">Text</Label>
        <Textarea id="speech-text" rows={4} required maxLength={4096} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:w-1/2">
        <Label htmlFor="speech-voice">Voice</Label>
        <Input id="speech-voice" list="speech-voices" value={voice} onChange={(e) => setVoice(e.target.value)} />
        <datalist id="speech-voices">
          {VOICES.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>
      <ErrorText error={error} />
      <Button type="submit" disabled={busy || !provider || !model || !text.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4" />} {busy ? "Synthesizing…" : "Speak"}
      </Button>
    </form>
  );
}

function HistoryItem({ g, onDelete }: { g: Generation; onDelete: () => void }) {
  const meta = (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="truncate">{g.modelId}</Badge>
          <span className="truncate">{g.provider}</span>
        </div>
        <p>
          {new Date(g.createdAt).toLocaleString()}
          {g.durationMs !== null && <span className="whitespace-nowrap"> · {(g.durationMs / 1000).toFixed(1)} s</span>}
        </p>
      </div>
      <button className="shrink-0 rounded p-1 hover:bg-default hover:text-danger" aria-label="Delete result" onClick={onDelete}>
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
  if (g.kind === "image") {
    return (
      <Card>
        <CardContent className="space-y-2">
          <div className={`grid gap-2 ${g.files.length > 1 ? "grid-cols-2" : ""}`}>
            {g.files.map((f) => (
              <a key={f} href={f} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file */}
                <img src={f} alt={g.prompt ?? "Generated image"} className="aspect-square w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-md bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Download className="size-3.5" />
                </span>
              </a>
            ))}
          </div>
          <p className="line-clamp-2 text-sm">{g.prompt}</p>
          {meta}
        </CardContent>
      </Card>
    );
  }
  if (g.kind === "speech") {
    return (
      <Card>
        <CardContent className="space-y-2">
          <p className="line-clamp-3 text-sm">{g.prompt}</p>
          {g.files[0] && <audio controls preload="none" src={g.files[0]} className="w-full" />}
          {meta}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{g.prompt}</p>
        <p className="whitespace-pre-wrap text-sm">{g.text}</p>
        <div className="flex">
          <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(g.text ?? "")}>
            <Copy className="size-3.5" /> Copy
          </Button>
        </div>
        {meta}
      </CardContent>
    </Card>
  );
}

export default function StudioPage() {
  const [tab, setTab] = useState<Kind>("image");
  const { data, mutate, isLoading } = useSWR<Generation[]>(`/api/studio?kind=${tab}`, fetcher, { revalidateOnFocus: false });
  const Form = tab === "image" ? ImageForm : tab === "transcription" ? TranscribeForm : SpeechForm;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Studio</h1>
        <p className="text-muted-foreground">Generate images, transcribe audio and turn text into speech with your providers&apos; media models.</p>
      </div>

      <div role="tablist" aria-label="Studio" className="flex w-fit flex-wrap gap-1 rounded-xl border border-border/60 p-1">
        {TABS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            role="tab"
            aria-selected={tab === kind}
            onClick={() => setTab(kind)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === kind ? "bg-default font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{TABS.find((t) => t.kind === tab)?.label}</CardTitle>
            <CardDescription>Results are saved privately to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form key={tab} onDone={() => mutate()} />
          </CardContent>
        </Card>

        <section aria-label="History" className="space-y-3">
          {isLoading && <Loader2 className="size-5 animate-spin" aria-label="Loading" />}
          {!isLoading && data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
          <div className={`grid gap-4 ${tab === "image" ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {data?.map((g) => (
              <HistoryItem
                key={g.id}
                g={g}
                onDelete={async () => {
                  if (!confirm("Delete this result?")) return;
                  await send(`/api/studio/${g.id}`, "DELETE");
                  mutate();
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
