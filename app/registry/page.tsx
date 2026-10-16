"use client";

import { useState } from "react";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { Check, ExternalLink, Loader2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import type { RegistryEntry } from "@/lib/mcp-registry";

type Page = { servers: RegistryEntry[]; nextCursor: string | null };

function AddButton({ entry, added }: { entry: RegistryEntry; added: boolean }) {
  const { addServer } = useMcpServers();
  const remote = entry.remotes[0];
  const [values, setValues] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (added) {
    return (
      <Button size="sm" variant="secondary" asChild>
        <Link href="/tools">
          <Check className="w-3 h-3 mr-1" /> Added
        </Link>
      </Button>
    );
  }

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await addServer({
        name: entry.title.slice(0, 60),
        url: remote.url,
        transport: remote.transport,
        registryName: entry.name,
        description: entry.description.slice(0, 500),
        headers: Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  if (remote.headers.length && !asking) {
    return (
      <Button size="sm" onClick={() => setAsking(true)}>
        <Plus className="w-3 h-3 mr-1" /> Add
      </Button>
    );
  }

  return (
    // Full width only when it holds header inputs; otherwise it sits beside "Docs".
    <div className={remote.headers.length ? "w-full space-y-2" : "contents"}>
      {remote.headers.map((h) => (
        <Input
          key={h.name}
          type={h.secret ? "password" : "text"}
          placeholder={`${h.name}${h.required ? " (required)" : ""}`}
          aria-label={h.name}
          value={values[h.name] ?? ""}
          onChange={(e) => setValues({ ...values, [h.name]: e.target.value })}
        />
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        onClick={add}
        disabled={busy || remote.headers.some((h) => h.required && !values[h.name]?.trim())}
      >
        {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
        {remote.headers.length ? "Connect" : "Add"}
      </Button>
    </div>
  );
}

export default function RegistryPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { servers: mine } = useMcpServers();
  const addedNames = new Set(mine.map((s) => s.registryName).filter(Boolean));

  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite<Page>(
    (index, previous) => {
      if (previous && !previous.nextCursor) return null;
      const params = new URLSearchParams({ ...(search && { search }) });
      if (previous?.nextCursor) params.set("cursor", previous.nextCursor);
      return `/api/registry?${params}`;
    },
    fetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false },
  );

  const entries = data?.flatMap((p) => p.servers) ?? [];
  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MCP Registry</h1>
        <p className="text-muted-foreground">
          Remote servers from the{" "}
          <a href="https://registry.modelcontextprotocol.io" className="underline" target="_blank" rel="noreferrer">
            official MCP Registry
          </a>
          . Add one and it becomes available in chat and the{" "}
          <Link href="/tools" className="underline">
            Inspector
          </Link>
          .
        </p>
      </div>

      <form
        className="flex gap-2 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
        }}
      >
        <Input
          placeholder="Search servers (e.g. github, weather, notion)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the registry"
        />
        <Button type="submit">
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>

      {error && <p className="text-destructive">{error.message}</p>}
      {isLoading && <p className="text-muted-foreground">Loading registry…</p>}
      {!isLoading && entries.length === 0 && !error && (
        <p className="text-muted-foreground">No remote servers match “{search}”.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Card key={entry.name} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">{entry.title}</CardTitle>
              <CardDescription className="font-mono text-[11px] break-all">{entry.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <p className="text-sm text-muted-foreground line-clamp-3">{entry.description}</p>
              <div className="flex flex-wrap gap-1">
                {entry.version && <Badge variant="secondary">v{entry.version}</Badge>}
                <Badge variant="outline">{entry.remotes[0].transport === "sse" ? "SSE" : "HTTP"}</Badge>
                {entry.remotes[0].headers.some((h) => h.required) && <Badge variant="outline">needs auth</Badge>}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <AddButton entry={entry} added={addedNames.has(entry.name)} />
                {(entry.websiteUrl || entry.repositoryUrl) && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={entry.websiteUrl ?? entry.repositoryUrl!} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" /> Docs
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && (
        <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
          {isValidating ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
