"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plug, Plus, Search, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ServerForm, APPROVAL_LABELS } from "@/components/mcp/server-form";
import { ServerInspector } from "@/components/mcp/server-inspector";
import { useMcpServers } from "@/hooks/use-mcp-servers";

export default function McpInspectorPage() {
  return (
    <Suspense>
      <McpInspector />
    </Suspense>
  );
}

function McpInspector() {
  const { servers, isLoading, addServer, updateServer, removeServer, refresh } = useMcpServers();
  const params = useSearchParams();
  // Returning from an OAuth sign-in (/api/mcp/oauth/callback) opens that server with a status banner.
  const oauth = params.get("oauth");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(params.get("server"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">MCP Inspector</h1>
          <p className="text-muted-foreground">
            Connect remote MCP servers, then browse and test their tools, resources and prompts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/registry">
              <Search className="w-4 h-4 mr-2" />
              Browse registry
            </Link>
          </Button>
          <Button onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="w-4 h-4 mr-2" />
            Add server
          </Button>
        </div>
      </div>

      {oauth && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${oauth === "connected" ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"}`}
        >
          {oauth === "connected" ? "Signed in. The server's tools are now available." : `Sign-in failed: ${params.get("message") ?? "unknown error"}`}
        </div>
      )}

      {adding && (
        <Card>
          <CardHeader>
            <CardTitle>Add a remote MCP server</CardTitle>
            <CardDescription>Streamable HTTP or SSE endpoints. Local stdio servers aren&apos;t supported on the hosted app.</CardDescription>
          </CardHeader>
          <CardContent>
            <ServerForm
              submitLabel="Add server"
              onCancel={() => setAdding(false)}
              onSubmit={async (input) => {
                const server = await addServer(input);
                setAdding(false);
                setInspecting(server.id);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : servers.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Plug className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No MCP servers yet</p>
            <p className="text-sm text-muted-foreground">Add one by URL or pick from the official registry.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="flex flex-row flex-wrap items-start gap-3 space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    {server.name}
                    <Badge variant="secondary">{server.transport === "sse" ? "SSE" : "HTTP"}</Badge>
                    {server.headerNames.length > 0 && <Badge variant="outline">auth headers</Badge>}
                    {server.authType === "oauth" && (
                      <Badge variant={server.oauthConnected ? "secondary" : "outline"}>
                        {server.oauthConnected ? "OAuth signed in" : "OAuth: sign-in needed"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="break-all font-mono text-xs">{server.url}</CardDescription>
                  <p className="mt-1 text-xs text-muted-foreground">{APPROVAL_LABELS[server.approval]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={server.enabled}
                    aria-label={`Enable ${server.name}`}
                    onCheckedChange={(enabled) => updateServer(server.id, { enabled })}
                  />
                  <Button size="sm" variant="outline" onClick={() => setInspecting(inspecting === server.id ? null : server.id)}>
                    {inspecting === server.id ? "Close" : "Inspect"}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Edit ${server.name}`} onClick={() => setEditing(server.id)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${server.name}`}
                    onClick={() => confirm(`Remove ${server.name}?`) && removeServer(server.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              {(editing === server.id || inspecting === server.id) && (
                <CardContent>
                  {editing === server.id ? (
                    <ServerForm
                      initial={server}
                      submitLabel="Save"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (input) => {
                        await updateServer(server.id, input);
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <ServerInspector
                      server={server}
                      onAuthChange={refresh}
                      onToggleTool={(tool, enabled) =>
                        updateServer(server.id, {
                          disabledTools: enabled
                            ? server.disabledTools.filter((t) => t !== tool)
                            : [...server.disabledTools, tool],
                        })
                      }
                    />
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
