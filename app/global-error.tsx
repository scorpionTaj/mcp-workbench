"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureSentryException } from "@/lib/sentry-client";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#121317",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
            The app could not be loaded. Try again, or return to the home page.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={unstable_retry}
              style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
            >
              Try again
            </button>
            <Link href="/" style={{ padding: "0.5rem 1rem", color: "inherit" }}>
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
