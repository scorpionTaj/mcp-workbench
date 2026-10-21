import { scrubSentryEvent } from "@/lib/sentry-scrub";

type SentryClient = typeof import("@sentry/nextjs");

let sentry: SentryClient | undefined;
let initialization: Promise<void> | undefined;
const pendingErrors: unknown[] = [];

export function initSentryClient(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    try {
      const response = await fetch("/api/sentry-config", { cache: "no-store" });
      if (!response.ok || response.status === 204) {
        pendingErrors.length = 0;
        return;
      }

      const { dsn } = (await response.json()) as { dsn?: unknown };
      if (typeof dsn !== "string" || !dsn) {
        pendingErrors.length = 0;
        return;
      }

      const client = await import("@sentry/nextjs");
      client.init({ dsn, sendDefaultPii: false, beforeSend: scrubSentryEvent });
      sentry = client;
      for (const error of pendingErrors.splice(0))
        client.captureException(error);
    } catch {
      // Monitoring must not affect app startup or rendering.
      pendingErrors.length = 0;
    }
  })();

  return initialization;
}

export function captureSentryException(error: unknown) {
  if (sentry) {
    sentry.captureException(error);
    return;
  }

  if (pendingErrors.length < 10) pendingErrors.push(error);
  void initSentryClient();
}
