"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { useMcpServers } from "@/hooks/use-mcp-servers";

/** Lets a chat opt into the user's MCP servers; `selected` holds server ids. */
export function McpServerPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { servers, isLoading } = useMcpServers();
  const usable = servers.filter((s) => s.enabled);

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading servers…</p>;

  if (usable.length === 0) {
    return (
      <div className="text-center py-5 rounded-lg border-dashed border-2 border-border/50 text-sm">
        <p className="text-muted-foreground">No MCP servers connected</p>
        <p className="text-xs mt-1">
          Add one from the{" "}
          <Link href="/registry" className="text-primary underline-offset-4 hover:underline">
            Registry
          </Link>{" "}
          or the{" "}
          <Link href="/tools" className="text-primary underline-offset-4 hover:underline">
            Inspector
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {usable.map((server) => {
        const on = selected.includes(server.id);
        return (
          <li key={server.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{server.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {server.approval === "never"
                  ? "Runs tools without asking"
                  : server.approval === "always"
                    ? "Asks before every tool"
                    : "Asks unless read-only"}
              </p>
            </div>
            <Switch
              checked={on}
              aria-label={`Use ${server.name} in this chat`}
              onCheckedChange={(v) => onChange(v ? [...selected, server.id] : selected.filter((id) => id !== server.id))}
            />
          </li>
        );
      })}
    </ul>
  );
}
