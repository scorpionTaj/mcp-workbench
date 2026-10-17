"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { send } from "@/lib/send";

/** Asks for a protected share link's password; the server then sets a cookie for this link. */
export function SharePasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mx-auto max-w-sm space-y-3 rounded-2xl border border-border/60 bg-surface p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await send(`/api/share/${token}/unlock`, "POST", { password });
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
          setBusy(false);
        }
      }}
    >
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <Lock className="size-5 text-accent" /> This chat is password-protected
      </h1>
      <p className="text-sm text-muted-foreground">Enter the password you were given with the link.</p>
      <Input
        type="password"
        aria-label="Password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !password} className="w-full">
        {busy && <Loader2 className="size-4 animate-spin" />} View chat
      </Button>
    </form>
  );
}
