export async function register() {
  // Scheduled agent runs need Node (DB, MCP clients); the edge runtime has no use for them.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/schedules");
    startScheduler();
  }
}
