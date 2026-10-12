"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetcher } from "@/lib/fetcher";
import type { McpServerInfo } from "@/hooks/use-mcp-servers";

type JsonSchema = { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
type ToolDef = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
};
type Inspection = {
  serverInfo?: { name?: string; version?: string };
  instructions: string | null;
  tools: ToolDef[];
  resources: { uri: string; name?: string; description?: string; mimeType?: string }[];
  resourceTemplates: { uriTemplate: string; name?: string }[];
  prompts: { name: string; description?: string; arguments?: { name: string; required?: boolean }[] }[];
};

const SAMPLE: Record<string, unknown> = { string: "", number: 0, integer: 0, boolean: false, array: [], object: {} };

/** A starting JSON object built from the tool's input schema. */
export function argsSkeleton(schema?: JsonSchema): string {
  const entries = Object.entries(schema?.properties ?? {}).map(([k, v]) => [k, SAMPLE[v.type ?? "string"] ?? ""]);
  return JSON.stringify(Object.fromEntries(entries), null, 2);
}

function Runner({
  serverId,
  body,
  initialArgs,
  withArgs = true,
}: {
  serverId: string;
  body: (args: unknown) => object;
  initialArgs?: string;
  withArgs?: boolean;
}) {
  const [args, setArgs] = useState(initialArgs ?? "{}");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{ ok: boolean; durationMs?: number; text: string } | null>(null);

  const run = async () => {
    let parsed: unknown = {};
    try {
      parsed = withArgs ? JSON.parse(args || "{}") : {};
    } catch {
      return setOutput({ ok: false, text: "Arguments must be valid JSON" });
    }
    setRunning(true);
    try {
      const res = await fetch(`/api/mcp/servers/${serverId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body(parsed)),
      });
      const data = await res.json();
      setOutput({
        ok: !!data.ok,
        durationMs: data.durationMs,
        text: data.ok ? JSON.stringify(data.result, null, 2) : (data.error ?? `HTTP ${res.status}`),
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      {withArgs && (
        <Textarea
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          rows={Math.min(8, args.split("\n").length + 1)}
          className="font-mono text-xs"
          aria-label="Arguments (JSON)"
        />
      )}
      <Button size="sm" onClick={run} disabled={running}>
        {running ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
        Run
      </Button>
      {output && (
        <div>
          <p className={`text-xs ${output.ok ? "text-muted-foreground" : "text-destructive"}`}>
            {output.ok ? "Success" : "Error"}
            {output.durationMs !== undefined && ` · ${output.durationMs} ms`}
          </p>
          <pre className="mt-1 max-h-72 overflow-auto rounded bg-default/50 p-2 text-[11px] whitespace-pre-wrap break-all">
            {output.text}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ServerInspector({
  server,
  onToggleTool,
}: {
  server: McpServerInfo;
  onToggleTool: (tool: string, enabled: boolean) => void;
}) {
  const { data, error, isLoading, mutate } = useSWR<Inspection>(`/api/mcp/servers/${server.id}/inspect`, fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Connecting to {server.name}…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="text-sm">
        <p className="text-destructive">Could not connect: {error?.message}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.serverInfo?.name} {data.serverInfo?.version && `v${data.serverInfo.version}`}
        {data.instructions && ` · ${data.instructions}`}
      </p>
      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Tools ({data.tools.length})</TabsTrigger>
          <TabsTrigger value="resources">Resources ({data.resources.length + data.resourceTemplates.length})</TabsTrigger>
          <TabsTrigger value="prompts">Prompts ({data.prompts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-3 mt-3">
          {data.tools.length === 0 && <p className="text-sm text-muted-foreground">No tools.</p>}
          {data.tools.map((tool) => {
            const enabled = !server.disabledTools.includes(tool.name);
            return (
              <details key={tool.name} className="rounded-lg border border-border/60 p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono font-semibold">{tool.name}</span>
                  {tool.annotations?.readOnlyHint && <Badge variant="secondary">read-only</Badge>}
                  {tool.annotations?.destructiveHint && <Badge variant="destructive">destructive</Badge>}
                  <span className="ml-auto flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    {enabled ? "Available in chat" : "Hidden from chat"}
                    <Switch
                      checked={enabled}
                      aria-label={`Allow ${tool.name} in chat`}
                      onCheckedChange={(v) => onToggleTool(tool.name, v)}
                    />
                  </span>
                </summary>
                {tool.description && <p className="mt-2 text-xs text-muted-foreground">{tool.description}</p>}
                <div className="mt-2">
                  <Runner
                    serverId={server.id}
                    initialArgs={argsSkeleton(tool.inputSchema)}
                    body={(args) => ({ kind: "tool", name: tool.name, args })}
                  />
                </div>
              </details>
            );
          })}
        </TabsContent>

        <TabsContent value="resources" className="space-y-3 mt-3">
          {data.resources.length + data.resourceTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">No resources.</p>
          )}
          {data.resources.map((r) => (
            <details key={r.uri} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer text-sm">
                <span className="font-mono">{r.uri}</span> {r.name && <span className="text-muted-foreground">· {r.name}</span>}
              </summary>
              {r.description && <p className="mt-2 text-xs text-muted-foreground">{r.description}</p>}
              <div className="mt-2">
                <Runner serverId={server.id} withArgs={false} body={() => ({ kind: "resource", uri: r.uri })} />
              </div>
            </details>
          ))}
          {data.resourceTemplates.map((t) => (
            <p key={t.uriTemplate} className="text-xs text-muted-foreground font-mono">
              Template: {t.uriTemplate}
            </p>
          ))}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-3 mt-3">
          {data.prompts.length === 0 && <p className="text-sm text-muted-foreground">No prompts.</p>}
          {data.prompts.map((p) => (
            <details key={p.name} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-mono">{p.name}</summary>
              {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
              <div className="mt-2">
                <Runner
                  serverId={server.id}
                  initialArgs={JSON.stringify(Object.fromEntries((p.arguments ?? []).map((a) => [a.name, ""])), null, 2)}
                  body={(args) => ({ kind: "prompt", name: p.name, args })}
                />
              </div>
            </details>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
