"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, GitBranch, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BranchCompare } from "@/components/chat/branch-compare";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { BranchNode } from "@/lib/chat-branches";

interface BranchTree {
  rootId: string;
  currentId: string;
  truncated: boolean;
  nodes: BranchNode[];
}

/**
 * The chat's branch tree (shown only when it has a parent or branches): open any branch, or
 * tick two and compare them from where they split.
 */
export function BranchesDialog({ chatId }: { chatId: string }) {
  const { data } = useSWR<BranchTree>(`/api/chats/${chatId}/branches`, fetcher, { revalidateOnFocus: false });
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  if (!data || data.nodes.length < 2) return null;

  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const [a, b] = picked.map((id) => byId.get(id)).filter((n): n is BranchNode => !!n);
  // Ticking a third branch drops the oldest pick.
  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setComparing(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <GitBranch className="w-4 h-4" />
          <span className="max-md:sr-only">Branches</span>
          <span className="text-xs text-muted-foreground">{data.nodes.length}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{comparing ? "Compare branches" : "Branches"}</DialogTitle>
          <DialogDescription>
            {comparing
              ? "Messages from the point where the two branches split."
              : "Every chat branched from this conversation. Tick two to compare them."}
          </DialogDescription>
        </DialogHeader>

        {comparing && a && b ? (
          <>
            <div>
              <Button variant="ghost" size="sm" onClick={() => setComparing(false)}>
                <ArrowLeft className="size-4" /> Back to the tree
              </Button>
            </div>
            <BranchCompare a={a} b={b} onOpen={() => setOpen(false)} />
          </>
        ) : (
          <>
            <ul className="space-y-0.5" aria-label="Branch tree">
              {data.nodes.map((n) => {
                const current = n.id === data.currentId;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md py-1.5 pr-2",
                      current ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-default/50",
                    )}
                    // Indent by depth; capped so deep chains stay readable on a phone.
                    style={{ paddingLeft: `${0.5 + Math.min(n.depth, 8) * 1.25}rem` }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={picked.includes(n.id)}
                      onChange={() => toggle(n.id)}
                      aria-label={`Compare ${n.title || "Untitled chat"}`}
                    />
                    {n.depth > 0 && <GitBranch className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        {current ? (
                          <span className="truncate text-sm font-medium" aria-current="page">
                            {n.title || "Untitled chat"}
                          </span>
                        ) : (
                          <Link
                            href={`/chat?id=${n.id}`}
                            onClick={() => setOpen(false)}
                            className="truncate text-sm hover:underline"
                          >
                            {n.title || "Untitled chat"}
                          </Link>
                        )}
                        {current && <span className="shrink-0 text-xs text-accent">this chat</span>}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {n.messageCount} {n.messageCount === 1 ? "message" : "messages"}
                        </span>
                      </div>
                      {n.divergedAt && (
                        <p className="truncate text-xs text-muted-foreground">
                          Branched after message {n.divergedAt.index + 1}: {n.divergedAt.preview || `(${n.divergedAt.role})`}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {data.truncated && (
              <p className="text-xs text-muted-foreground">Showing the first {data.nodes.length} branches.</p>
            )}
            <div className="flex justify-end">
              <Button disabled={!a || !b} onClick={() => setComparing(true)}>
                <GitCompareArrows className="size-4" /> Compare
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
