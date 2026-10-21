"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, authLinkClass, safeNext } from "@/components/auth/auth-shell";
import { ResendVerification } from "@/components/auth/resend-verification";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({
  mode,
  socialProviders,
  canEmail = false,
}: {
  mode: "sign-in" | "sign-up";
  socialProviders: ("github" | "google")[];
  /** An email transport is configured: offer password reset and verification resends. */
  canEmail?: boolean;
}) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const callbackURL = safeNext(next);
  const verifyCallbackURL = `/email-verified?next=${encodeURIComponent(callbackURL)}`;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set when the account exists but its email isn't verified yet (sign-up, or a 403 on sign-in).
  const [unverified, setUnverified] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUnverified(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (isSignUp) {
      const { data, error } = await signUp.email({
        email,
        password,
        name: String(form.get("name")),
        callbackURL: verifyCallbackURL,
      });
      setPending(false);
      if (error) return setError(error.message ?? "Something went wrong");
      // No session token means verification is required before the first sign-in.
      if (!data?.token) return setUnverified(email);
    } else {
      const { error } = await signIn.email({ email, password });
      setPending(false);
      if (error?.code === "EMAIL_NOT_VERIFIED") return setUnverified(email);
      if (error) return setError(error.message ?? "Something went wrong");
    }
    router.push(callbackURL);
    router.refresh();
  }

  if (isSignUp && unverified) {
    return (
      <AuthShell
        title="Check your inbox"
        description={
          <>
            We sent a verification link to <span className="font-medium text-foreground">{unverified}</span>. Open it to
            finish creating your account.
          </>
        }
      >
        {canEmail && <ResendVerification email={unverified} next={callbackURL} />}
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={authLinkClass}>
            Sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isSignUp ? "Create your account" : "Sign in to MCP Workbench"}
      description={isSignUp ? "Your chats, keys and servers stay private to you." : "Welcome back."}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {isSignUp && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!isSignUp && canEmail && (
              <Link href="/forgot-password" className={`text-xs ${authLinkClass}`}>
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {unverified && (
          <p role="alert" className="text-sm text-destructive">
            Verify your email before signing in. Check your inbox for the link we sent to {unverified}.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>
      {unverified && canEmail && <ResendVerification email={unverified} next={callbackURL} />}

      {socialProviders.length > 0 && (
        <div className="space-y-2">
          <p className="text-center text-xs text-muted-foreground">or continue with</p>
          {socialProviders.map((provider) => (
            <Button
              key={provider}
              variant="outline"
              className="w-full capitalize"
              onClick={() => signIn.social({ provider, callbackURL })}
            >
              {provider}
            </Button>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={`/${isSignUp ? "sign-in" : "sign-up"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className={authLinkClass}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </AuthShell>
  );
}
