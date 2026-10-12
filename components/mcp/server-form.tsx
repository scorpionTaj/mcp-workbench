"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { McpServerInput } from "@/hooks/use-mcp-servers";

export const APPROVAL_LABELS = {
  readonly: "Ask unless the tool is read-only",
  always: "Always ask before running a tool",
  never: "Never ask (trusted server)",
} as const;

/** "Authorization: Bearer x" lines → { Authorization: "Bearer x" } */
export function parseHeaderLines(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes(":"))
      .map((line) => {
        const i = line.indexOf(":");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()] as const;
      })
      .filter(([k, v]) => k && v),
  );
}

export function ServerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: McpServerInput & { headerNames?: string[] };
  submitLabel: string;
  onSubmit: (input: McpServerInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [transport, setTransport] = useState<"http" | "sse">(initial?.transport ?? "http");
  const [approval, setApproval] = useState<"never" | "readonly" | "always">(initial?.approval ?? "readonly");
  const [headers, setHeaders] = useState("");
  const [authType, setAuthType] = useState<"headers" | "oauth">(initial?.authType ?? "headers");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial?.url);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await onSubmit({
            name,
            url,
            transport,
            approval,
            authType,
            // When editing, a blank box keeps the stored headers.
            ...(headers.trim() || !editing ? { headers: parseHeaderLines(headers) } : {}),
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mcp-name">Name</Label>
          <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mcp-transport">Transport</Label>
          <Select value={transport} onValueChange={(v) => setTransport(v as "http" | "sse")}>
            <SelectTrigger id="mcp-transport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="http">Streamable HTTP</SelectItem>
              <SelectItem value="sse">SSE (legacy)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mcp-url">Server URL</Label>
        <Input
          id="mcp-url"
          type="url"
          placeholder="https://example.com/mcp"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <p className="text-[11px] text-muted-foreground">
          Local stdio server (npx, uvx)? Run it through the bridge:{" "}
          <code className="font-mono">bun scripts/mcp-bridge.ts -- &lt;command&gt;</code>, then add the URL and token it prints.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mcp-approval">Tool approval</Label>
        <Select value={approval} onValueChange={(v) => setApproval(v as typeof approval)}>
          <SelectTrigger id="mcp-approval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(APPROVAL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mcp-auth">Authentication</Label>
        <Select value={authType} onValueChange={(v) => setAuthType(v as "headers" | "oauth")}>
          <SelectTrigger id="mcp-auth">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="headers">None, or API key / token headers</SelectItem>
            <SelectItem value="oauth">OAuth sign-in (the server asks you to log in)</SelectItem>
          </SelectContent>
        </Select>
        {authType === "oauth" && (
          <p className="text-[11px] text-muted-foreground">
            After saving, use Sign in in the Inspector. Tokens are encrypted and refreshed automatically.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mcp-headers">Headers (optional, one per line)</Label>
        <Textarea
          id="mcp-headers"
          rows={2}
          placeholder={
            initial?.headerNames?.length
              ? `Stored: ${initial.headerNames.join(", ")}. Leave blank to keep.`
              : "Authorization: Bearer <token>"
          }
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">Header values are encrypted and never sent back to the browser.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
