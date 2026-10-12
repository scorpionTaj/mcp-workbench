"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "@/components/chat/chat-messages";
import { toDisplayMessage, type ChatUIMessage } from "@/lib/chat-messages";

export function SharedChatView({ token, chatId, messages }: { token: string; chatId: string; messages: ChatUIMessage[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueChat = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/share/${token}/fork`, { method: "POST" });
    if (res.status === 401) {
      router.push(`/sign-in?next=${encodeURIComponent(`/share/${token}`)}`);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Couldn't copy this chat");
      setBusy(false);
      return;
    }
    router.push(`/chat?id=${body.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60">
        <ChatMessages messages={messages.map((m) => toDisplayMessage(m, chatId))} isLoading={false} readOnly />
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface p-4">
        <p className="flex-1 text-sm text-muted-foreground">
          Want to pick this up? Copy the conversation into your own workspace and keep chatting.
        </p>
        <Button onClick={continueChat} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <GitBranch className="size-4" />} Continue this chat
        </Button>
        {error && (
          <p role="alert" className="w-full text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
