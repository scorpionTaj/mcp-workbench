import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import logger from "@/lib/logger";

type Schedule = typeof schema.agentSchedules.$inferSelect;

export interface RunNotification {
  scheduleName: string;
  status: "ok" | "error";
  error?: string;
  summary?: string;
  chatUrl?: string;
  finishedAt: string;
}

/** Shapes the payload for the webhook's host: Slack and Discord take text; anything else gets JSON. */
export function webhookBody(url: string, n: RunNotification): Record<string, unknown> {
  const headline = `${n.status === "ok" ? "✅" : "❌"} Scheduled run "${n.scheduleName}" ${n.status === "ok" ? "finished" : "failed"}`;
  const text = [headline, n.error && `Error: ${n.error}`, n.summary, n.chatUrl].filter(Boolean).join("\n\n");
  const host = new URL(url).hostname;
  if (host === "hooks.slack.com") return { text: text.slice(0, 3900) };
  if (/(^|\.)discord(app)?\.com$/.test(host)) return { content: text.slice(0, 1900) };
  return { event: "schedule.run", ...n };
}

export const webhookHost = (encrypted: string | null) => {
  if (!encrypted) return null;
  try {
    return new URL(decrypt(encrypted)).hostname;
  } catch {
    return null;
  }
};

/** Last assistant reply in a chat, trimmed for a notification. */
async function replySummary(chatId: string) {
  const [last] = await db
    .select({ content: schema.messages.content })
    .from(schema.messages)
    .where(and(eq(schema.messages.chatId, chatId), eq(schema.messages.role, "assistant")))
    .orderBy(desc(schema.messages.createdAt))
    .limit(1);
  const text = last?.content.trim();
  return text ? (text.length > 600 ? `${text.slice(0, 600)}…` : text) : undefined;
}

/**
 * Posts a run result to the schedule's webhook if configured and wanted. Never throws: a broken
 * webhook must not affect the schedule.
 */
export async function notifyScheduleRun(s: Schedule, result: { chatId?: string; error?: string }) {
  if (!s.notifyWebhook || (s.notifyOn === "error" && !result.error)) return;
  try {
    const url = decrypt(s.notifyWebhook);
    const problem = await checkOutboundUrl(url);
    if (problem) throw new Error(`Webhook URL rejected: ${problem}`);
    const base = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "");
    const body = webhookBody(url, {
      scheduleName: s.name,
      status: result.error ? "error" : "ok",
      error: result.error,
      summary: result.chatId && !result.error ? await replySummary(result.chatId) : undefined,
      chatUrl: base && result.chatId ? `${base}/chat?id=${result.chatId}` : undefined,
      finishedAt: new Date().toISOString(),
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "mcp-workbench" },
      body: JSON.stringify(body),
      redirect: "error", // a redirect could point the server-side request somewhere internal
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  } catch (err) {
    logger.warn({ err, scheduleId: s.id }, "Schedule notification failed");
  }
}
