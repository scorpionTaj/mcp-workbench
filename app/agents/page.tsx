"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AgentForm } from "@/components/agents/agent-form";
import { useAgents, type AgentInfo } from "@/hooks/use-agents";

const SECTIONS: { owner: AgentInfo["owner"]; title: string }[] = [
  { owner: "me", title: "Your agents" },
  { owner: "builtin", title: "Built-in" },
  { owner: "community", title: "Shared by others" },
];

export default function AgentsPage() {
  const router = useRouter();
  const { agents, isLoading, createAgent, updateAgent, deleteAgent, startChat } = useAgents();
  const [editing, setEditing] = useState<AgentInfo | "new" | null>(null);
  const [filter, setFilter] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  const q = filter.toLowerCase();
  const shown = agents.filter((a) =>
    [a.name, a.description, a.category].some((s) => s?.toLowerCase().includes(q)),
  );

  const chat = async (id: string) => {
    setStarting(id);
    try {
      router.push(`/chat?id=${await startChat(id)}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Reusable assistants with their own instructions, model, MCP tools and step budget.
          </p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Filter agents" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-56" aria-label="Filter agents" />
          <Button onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4 mr-2" /> New agent
          </Button>
        </div>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing === "new" || !editing.id ? "New agent" : `Edit ${editing.name}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentForm
              initial={editing === "new" ? undefined : editing}
              submitLabel={editing === "new" || !editing.id ? "Create agent" : "Save"}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                // Duplicates arrive with an empty id and are created, not updated.
                if (editing === "new" || !editing.id) await createAgent(input);
                else await updateAgent(editing.id, input);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">Loading agents…</p>}

      {SECTIONS.map(({ owner, title }) => {
        const list = shown.filter((a) => a.owner === owner);
        if (!list.length) return null;
        return (
          <section key={owner} className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((agent) => (
                <Card key={agent.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span aria-hidden>{agent.icon}</span>
                      {agent.name}
                    </CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{agent.category}</Badge>
                      {agent.modelId && <Badge variant="outline">{agent.modelId}</Badge>}
                      <Badge variant="outline">{agent.maxSteps} steps</Badge>
                      {agent.toolServerIds.length > 0 && (
                        <Badge variant="outline">{agent.toolServerIds.length} MCP server(s)</Badge>
                      )}
                      {agent.knowledgeBaseIds.length > 0 && (
                        <Badge variant="outline">{agent.knowledgeBaseIds.length} knowledge base(s)</Badge>
                      )}
                      {agent.isPublic && owner === "me" && <Badge>shared</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => chat(agent.id)} disabled={starting === agent.id}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Chat
                      </Button>
                      {owner === "me" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditing(agent)} aria-label={`Edit ${agent.name}`}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${agent.name}`}
                            onClick={() => confirm(`Delete ${agent.name}?`) && deleteAgent(agent.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing({ ...agent, id: "", name: `${agent.name} (copy)`, isPublic: false, owner: "me" } as AgentInfo)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Duplicate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
