"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureSentryException } from "@/lib/sentry-client";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    captureSentryException(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        The page could not be loaded. Try again, or return to the home page.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
        >
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-border px-4 py-2">
          Go home
        </Link>
      </div>
    </main>
  );
}
