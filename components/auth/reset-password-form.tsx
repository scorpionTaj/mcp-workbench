"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, authLinkClass } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";

// The emailed link goes through /api/auth/reset-password/:token, which lands here with
// ?token=… when it's valid or ?error=INVALID_TOKEN when it isn't.
export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) return setError("Passwords don't match");
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token: token! });
    setPending(false);
    if (error) return setError(error.code === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : (error.message ?? "Something went wrong"));
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="Password updated" description="You've been signed out everywhere else. Sign in with your new password.">
        <Button asChild className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  if (!token || params.get("error")) {
    return (
      <AuthShell title="Link expired" description="This reset link is invalid or has expired. Reset links work once, for 1 hour.">
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className={authLinkClass}>
            Request a new link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" description="At least 8 characters.">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
