import type { Instrumentation } from "next";

export async function register() {
  // Scheduled agent runs need Node (DB, MCP clients); the edge runtime has no use for them.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.SENTRY_DSN) await import("./sentry.server.config");
    const { startScheduler } = await import("@/lib/schedules");
    startScheduler();
  }

  if (process.env.NEXT_RUNTIME === "edge" && process.env.SENTRY_DSN) {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(...args);
  }
};
