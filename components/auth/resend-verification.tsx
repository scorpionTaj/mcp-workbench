"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Sends the verification email again; the link lands on /email-verified, then `next`. */
export function ResendVerification({ email, next }: { email: string; next: string }) {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("pending");
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `/email-verified?next=${encodeURIComponent(next)}`,
    });
    setState(error ? "error" : "sent");
    setMessage(error ? (error.status === 429 ? "Too many requests. Try again in a minute." : (error.message ?? "Could not send the email")) : null);
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={state === "pending" || state === "sent"} onClick={resend}>
        {state === "pending" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {state === "sent" ? "Verification email sent" : "Resend verification email"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
