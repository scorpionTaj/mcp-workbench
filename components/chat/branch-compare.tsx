"use client";

import useSWR from "swr";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { WordDiff } from "@/components/compare/answer-diff";
import { fetcher } from "@/lib/fetcher";
import { sharedPrefixLength } from "@/lib/chat-branches";
import { textOf, type ChatUIMessage } from "@/lib/chat-messages";

interface Side {
  id: string;
  title: string | null;
}

const keyOf = (m: ChatUIMessage) => ({ role: m.role, createdAt: m.metadata?.createdAt ?? 0 });
const firstReply = (messages: ChatUIMessage[]) => messages.find((m) => m.role === "assistant");

function MessageList({ messages }: { messages: ChatUIMessage[] }) {
  if (!messages.length) return <p className="text-sm text-muted-foreground">No messages after the split.</p>;
  return (
    <ol className="space-y-2">
      {messages.map((m) => (
        <li key={m.id} className={`rounded-lg border border-border/60 p-2.5 ${m.role === "user" ? "bg-default/40" : ""}`}>
          <p className="mb-1 text-xs font-medium text-muted-foreground capitalize">{m.role}</p>
          <p className="text-sm whitespace-pre-wrap break-words">{textOf(m) || <em className="text-muted-foreground">(no text)</em>}</p>
        </li>
      ))}
    </ol>
  );
}

/** Two branches side by side from where they diverge, with the first differing replies word-diffed. */
export function BranchCompare({ a, b, onOpen }: { a: Side; b: Side; onOpen: () => void }) {
  const left = useSWR<{ messages: ChatUIMessage[] }>(`/api/chats/${a.id}`, fetcher);
  const right = useSWR<{ messages: ChatUIMessage[] }>(`/api/chats/${b.id}`, fetcher);

  if (left.error || right.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {(left.error ?? right.error).message}
      </p>
    );
  }
  if (!left.data || !right.data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading both branches…
      </p>
    );
  }

  const l = left.data.messages;
  const r = right.data.messages;
  const shared = sharedPrefixLength(l.map(keyOf), r.map(keyOf));
  const restL = l.slice(shared);
  const restR = r.slice(shared);
  const replyL = firstReply(restL);
  const replyR = firstReply(restR);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {shared > 0 ? (
        <details className="rounded-lg border border-border/60 px-3 py-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {shared} shared {shared === 1 ? "message" : "messages"} before the branches split
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <MessageList messages={l.slice(0, shared)} />
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">These branches share no messages.</p>
      )}

      {replyL && replyR && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">First different reply</h3>
          <WordDiff
            from={textOf(replyL)}
            to={textOf(replyR)}
            note={textOf(replyL) === textOf(replyR) ? "Both replies have the same text." : undefined}
          />
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { side: a, rest: restL },
          { side: b, rest: restR },
        ].map(({ side, rest }) => (
          <section key={side.id} className="min-w-0 space-y-2">
            <h3 className="truncate text-sm font-medium">
              <Link href={`/chat?id=${side.id}`} onClick={onOpen} className="hover:underline">
                {side.title || "Untitled chat"}
              </Link>
              <span className="ml-2 font-normal text-muted-foreground">
                {rest.length} after the split
              </span>
            </h3>
            <div className="max-h-[50vh] overflow-y-auto">
              <MessageList messages={rest} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
