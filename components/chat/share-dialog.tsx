"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const EXPIRY = [
  { value: "never", label: "Never" },
  { value: "1", label: "In 1 day" },
  { value: "7", label: "In 7 days" },
  { value: "30", label: "In 30 days" },
];

/** Create, copy or revoke a chat's public read-only link, with an optional expiry and password. */
export function ShareDialog({
  chatId,
  shareId,
  shareExpiresAt,
  sharePassword,
  onChange,
}: {
  chatId: string;
  shareId: string | null;
  shareExpiresAt: string | null;
  sharePassword: boolean;
  onChange: () => void;
}) {
  // "keep" leaves the saved expiry alone; only offered once the link exists.
  const [expiry, setExpiry] = useState(shareId ? "keep" : "never");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = shareId && typeof window !== "undefined" ? `${window.location.origin}/share/${shareId}` : "";

  const [openedAt] = useState(() => Date.now());
  const expired = !!shareExpiresAt && new Date(shareExpiresAt).getTime() <= openedAt;

  const run = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setError(null);
    const body =
      method === "POST"
        ? {
            ...(expiry !== "keep" && {
              expiresAt: expiry === "never" ? null : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString(),
            }),
            ...(removePassword ? { password: null } : password && { password }),
          }
        : undefined;
    try {
      await send(`/api/chats/${chatId}/share`, method, body);
      setPassword("");
      setRemovePassword(false);
      setExpiry(method === "POST" ? "keep" : "never");
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
        {shareId && (shareExpiresAt || sharePassword) && (
          <p className="text-xs text-muted-foreground">
            {shareExpiresAt &&
              `${expired ? "Expired" : "Expires"} ${new Date(shareExpiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. `}
            {sharePassword && "Viewers need a password."}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="share-expiry">Link expires</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="share-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shareId && <SelectItem value="keep">Keep current</SelectItem>}
                {EXPIRY.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-password">Password (optional)</Label>
            <Input
              id="share-password"
              type="password"
              autoComplete="new-password"
              minLength={4}
              maxLength={200}
              value={password}
              disabled={removePassword}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={sharePassword ? "Leave blank to keep" : "No password"}
            />
            {sharePassword && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={removePassword} onChange={(e) => setRemovePassword(e.target.checked)} />
                Remove the password
              </label>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          {shareId ? (
            <>
              <Button variant="outline" disabled={busy} onClick={() => run("DELETE")}>
                Stop sharing
              </Button>
              <Button
                disabled={busy || (expiry === "keep" && !password && !removePassword) || (!!password && password.length < 4)}
                onClick={() => run("POST")}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </Button>
            </>
          ) : (
            <Button disabled={busy || (!!password && password.length < 4)} onClick={() => run("POST")}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Create link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
