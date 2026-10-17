import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import { escapeHtml, sendEmail } from "@/lib/email";
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

/** Subject and body of the "run finished" email. */
export function runEmail(n: RunNotification) {
  const subject = `${n.status === "ok" ? "✅" : "❌"} Scheduled run "${n.scheduleName}" ${n.status === "ok" ? "finished" : "failed"}`;
  const parts = [n.error && `Error: ${n.error}`, n.summary, n.chatUrl && `Open the chat: ${n.chatUrl}`].filter(Boolean) as string[];
  const text = [...parts, `Finished at ${n.finishedAt}. You get this email because notifications are on for this schedule.`].join("\n\n");
  const html = [
    n.error && `<p><strong>Error:</strong> ${escapeHtml(n.error)}</p>`,
    n.summary && `<p style="white-space:pre-wrap">${escapeHtml(n.summary)}</p>`,
    n.chatUrl && `<p><a href="${escapeHtml(n.chatUrl)}">Open the chat</a></p>`,
    `<p style="color:#888;font-size:12px">Finished at ${escapeHtml(n.finishedAt)}. You get this email because notifications are on for this schedule.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: subject.slice(0, 200), text, html };
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

async function postWebhook(encrypted: string, n: RunNotification) {
  const url = decrypt(encrypted);
  const problem = await checkOutboundUrl(url);
  if (problem) throw new Error(`Webhook URL rejected: ${problem}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "mcp-workbench" },
    body: JSON.stringify(webhookBody(url, n)),
    redirect: "error", // a redirect could point the server-side request somewhere internal
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

async function emailOwner(s: Schedule, n: RunNotification, chatId?: string) {
  const [owner] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, s.userId));
  if (!owner) return;
  await sendEmail({ to: owner.email, ...runEmail(n), idempotencyKey: `schedule-run/${s.id}/${chatId ?? n.finishedAt}` });
}

/**
 * Sends a run result to the schedule's webhook and/or the owner's email, if configured and
 * wanted. Never throws: a broken notification must not affect the schedule.
 */
export async function notifyScheduleRun(s: Schedule, result: { chatId?: string; error?: string }) {
  if (!s.notifyWebhook && !s.notifyEmail) return;
  if (s.notifyOn === "error" && !result.error) return;
  let n: RunNotification;
  try {
    const base = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "");
    n = {
      scheduleName: s.name,
      status: result.error ? "error" : "ok",
      error: result.error,
      summary: result.chatId && !result.error ? await replySummary(result.chatId) : undefined,
      chatUrl: base && result.chatId ? `${base}/chat?id=${result.chatId}` : undefined,
      finishedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn({ err, scheduleId: s.id }, "Schedule notification failed");
    return;
  }
  await Promise.all([
    s.notifyWebhook &&
      postWebhook(s.notifyWebhook, n).catch((err) => logger.warn({ err, scheduleId: s.id }, "Schedule webhook failed")),
    s.notifyEmail &&
      emailOwner(s, n, result.chatId).catch((err) => logger.warn({ err, scheduleId: s.id }, "Schedule email failed")),
  ]);
}
