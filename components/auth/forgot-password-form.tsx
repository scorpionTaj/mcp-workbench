"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, authLinkClass } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm({ canEmail }: { canEmail: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) return setError(error.status === 429 ? "Too many requests. Try again in a minute." : (error.message ?? "Something went wrong"));
    setSentTo(email);
  }

  const backToSignIn = (
    <p className="text-center text-sm text-muted-foreground">
      <Link href="/sign-in" className={authLinkClass}>
        Back to sign in
      </Link>
    </p>
  );

  if (!canEmail) {
    return (
      <AuthShell title="Reset your password" description="This instance can't send email, so passwords can't be reset here.">
        <p className="text-sm text-muted-foreground">Ask the administrator to set up email or reset your account.</p>
        {backToSignIn}
      </AuthShell>
    );
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your inbox"
        description={
          <>
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we sent it a link to
            reset the password. The link expires in 1 hour.
          </>
        }
      >
        {backToSignIn}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" description="Enter your email and we'll send you a reset link.">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Send reset link
        </Button>
      </form>
      {backToSignIn}
    </AuthShell>
  );
}
