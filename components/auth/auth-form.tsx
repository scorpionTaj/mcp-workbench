"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({
  mode,
  socialProviders,
}: {
  mode: "sign-in" | "sign-up";
  socialProviders: ("github" | "google")[];
}) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  // Only follow same-site relative paths after sign-in (no open redirect).
  const callbackURL = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const { error } = isSignUp
      ? await signUp.email({ email, password, name: String(form.get("name")) })
      : await signIn.email({ email, password });
    setPending(false);
    if (error) return setError(error.message ?? "Something went wrong");
    router.push(callbackURL);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.svg" alt="" width={56} height={56} priority />
        <div>
          <p className="text-xl font-semibold tracking-tight">
            MCP <span className="text-gradient">Workbench</span>
          </p>
          <p className="text-sm text-muted-foreground">Models, tools, skills and your knowledge in one place</p>
        </div>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create your account" : "Sign in to MCP Workbench"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Your chats, keys and servers stay private to you." : "Welcome back."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

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
              className="text-primary underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
