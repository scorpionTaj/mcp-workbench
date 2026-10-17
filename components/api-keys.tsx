"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";
import { send } from "@/lib/send";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

/** Create, list and revoke personal API keys (Authorization: Bearer mwb_…). */
export function ApiKeys() {
  const { data: keys = [], mutate } = useSWR<ApiKey[]>("/api/api-keys", fetcher);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const row = await send<ApiKey & { key: string }>("/api/api-keys", "POST", { name });
      setCreated(row.key);
      setName("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (key: ApiKey) => {
    if (!confirm(`Revoke "${key.name}"? Anything using it stops working.`)) return;
    try {
      await send(`/api/api-keys/${key.id}`, "DELETE");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-accent" /> API keys
        </CardTitle>
        <CardDescription>
          Call the API from scripts with <code className="text-xs">Authorization: Bearer mwb_…</code>. A key acts as
          you (without admin rights) and can&apos;t manage other keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={create} className="flex gap-2">
          <Input
            aria-label="Key name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. CI script"
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />} Create key
          </Button>
        </form>
        {created && (
          <div className="space-y-2 rounded-xl border border-success/40 bg-success/5 p-3">
            <p className="text-sm font-medium">Copy your new key now. It won&apos;t be shown again.</p>
            <div className="flex gap-2">
              <Input readOnly value={created} aria-label="New API key" className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(created);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreated(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {k.name} {k.revokedAt && <Badge variant="outline">revoked</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{k.prefix}…</span> · created {ago(k.createdAt)} ·{" "}
                    {k.lastUsedAt ? `last used ${ago(k.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                {!k.revokedAt && (
                  <Button variant="ghost" size="sm" onClick={() => revoke(k)} aria-label={`Revoke ${k.name}`}>
                    <Trash2 className="size-4" /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
