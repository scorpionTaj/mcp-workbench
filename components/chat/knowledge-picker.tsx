"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { useKnowledgeBases } from "@/hooks/use-knowledge";

/** Lets a chat search the user's knowledge bases; `selected` holds knowledge base ids. */
export function KnowledgePicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const { knowledgeBases, isLoading } = useKnowledgeBases();

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading knowledge bases…</p>;
  if (knowledgeBases.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No knowledge bases yet.{" "}
        <Link href="/knowledge" className="text-primary underline-offset-4 hover:underline">
          Add documents
        </Link>{" "}
        to let the model search them.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {knowledgeBases.map((kb) => (
        <li key={kb.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{kb.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {kb.documentCount} document(s) · {kb.chunkCount} chunks
            </p>
          </div>
          <Switch
            checked={selected.includes(kb.id)}
            aria-label={`Search ${kb.name} in this chat`}
            onCheckedChange={(v) => onChange(v ? [...selected, kb.id] : selected.filter((id) => id !== kb.id))}
          />
        </li>
      ))}
    </ul>
  );
}
