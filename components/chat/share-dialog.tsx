"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { send } from "@/lib/send";

/** Create, copy or revoke a chat's public read-only link. */
export function ShareDialog({
  chatId,
  shareId,
  onChange,
}: {
  chatId: string;
  shareId: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = shareId && typeof window !== "undefined" ? `${window.location.origin}/share/${shareId}` : "";

  const run = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/chats/${chatId}/share`, method);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={shareId ? "secondary" : "ghost"} size="sm">
          <Share2 className="w-4 h-4" />
          <span className="max-md:sr-only">{shareId ? "Shared" : "Share"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this chat</DialogTitle>
          <DialogDescription>
            Anyone with the link can read the conversation, without signing in. Attachments, token
            counts and your system prompt aren&apos;t included. Messages you add later show up too.
          </DialogDescription>
        </DialogHeader>
        {shareId ? (
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="Share link" onFocus={(e) => e.target.select()} />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This chat is private.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          {shareId ? (
            <Button variant="outline" disabled={busy} onClick={() => run("DELETE")}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Stop sharing
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => run("POST")}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Create link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
