import { Cron } from "croner";
import { z } from "zod";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db, schema } from "@/lib/db";
import { visibleAgent } from "@/lib/agents";
import { startChatTurn } from "@/lib/chat-turn";
import type { ChatUIMessage } from "@/lib/chat-messages";
import logger from "@/lib/logger";
import { encrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import { notifyScheduleRun, webhookHost } from "@/lib/notify";

type Schedule = typeof schema.agentSchedules.$inferSelect;

/** Runs closer together than this are refused; a scheduled run is a full agent turn. */
export const MIN_INTERVAL_MINUTES = 15;
/** A run still marked "running" after this long is assumed lost (server restart) and may run again. */
export const STALE_RUN_MS = 30 * 60_000;
const BATCH = 3;

export function isTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Next run after `from`, or an error message for an invalid or too-frequent schedule. */
export function planSchedule(cron: string, timezone: string, from = new Date()): { next: Date } | { error: string } {
  if (cron.trim().split(/\s+/).length !== 5) return { error: "Use a 5-field cron expression (minute hour day month weekday)" };
  if (!isTimezone(timezone)) return { error: `Unknown time zone: ${timezone}` };
  let job: Cron;
  try {
    job = new Cron(cron, { timezone, paused: true });
  } catch (err) {
    return { error: `Invalid cron expression: ${err instanceof Error ? err.message : String(err)}` };
  }
  const [a, b, c] = job.nextRuns(3, from);
  if (!a) return { error: "This schedule never runs" };
  const gaps = [b && +b - +a, c && b && +c - +b].filter((g): g is number => typeof g === "number");
  if (gaps.some((g) => g < MIN_INTERVAL_MINUTES * 60_000)) {
    return { error: `Runs must be at least ${MIN_INTERVAL_MINUTES} minutes apart` };
  }
  return { next: a };
}

export const scheduleSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  prompt: z.string().trim().min(1).max(10_000),
  cron: z.string().trim().min(9).max(100),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  provider: z.string().max(50).nullable().default(null),
  modelId: z.string().max(200).nullable().default(null),
  enabled: z.boolean().default(true),
  // null removes the webhook; omitted keeps it.
  notifyWebhookUrl: z.string().trim().url().max(2000).nullable().optional(),
  notifyOn: z.enum(["always", "error"]).default("error"),
  notifyEmail: z.boolean().default(false),
});

/** Validates and encrypts a webhook URL from the API; undefined = leave unchanged. */
export async function webhookColumn(url: string | null | undefined): Promise<{ notifyWebhook?: string | null } | { error: string }> {
  if (url === undefined) return {};
  if (url === null || url === "") return { notifyWebhook: null };
  const problem = await checkOutboundUrl(url);
  if (problem) return { error: `Webhook URL: ${problem}` };
  return { notifyWebhook: encrypt(url) };
}

export const withUpcoming = ({ notifyWebhook, ...s }: Schedule) => ({
  ...s,
  // The webhook URL is a secret; the client only sees which host it points to.
  webhookHost: webhookHost(notifyWebhook),
  upcoming: s.enabled ? upcomingRuns(s.cron, s.timezone) : [],
});

/** Upcoming run times, for previews. */
export function upcomingRuns(cron: string, timezone: string, count = 3): Date[] {
  try {
    return new Cron(cron, { timezone, paused: true }).nextRuns(count);
  } catch {
    return [];
  }
}

/**
 * One scheduled run: a new chat linked to the agent, the prompt as the user's message and the
 * agent's reply. Unattended, so tools that need approval are left out.
 */
export async function runSchedule(s: Schedule): Promise<{ chatId?: string; error?: string }> {
  const agent = await visibleAgent(s.userId, s.agentId);
  if (!agent) return { error: "The agent no longer exists or isn't available to you" };
  const provider = s.provider ?? agent.provider;
  const modelId = s.modelId ?? agent.modelId;
  if (!provider || !modelId) return { error: "Pick a model for this schedule (the agent has no default model)" };

  const when = new Date().toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone });
  const [chat] = await db
    .insert(schema.chats)
    .values({
      userId: s.userId,
      title: `${s.name} · ${when}`.slice(0, 200),
      agentId: agent.id,
      defaultProvider: provider,
      defaultModelId: modelId,
      meta: JSON.stringify({ scheduleId: s.id }),
    })
    .returning();

  const message: ChatUIMessage = {
    id: createId(),
    role: "user",
    parts: [{ type: "text", text: s.prompt }],
    metadata: { createdAt: Date.now() },
  };
  try {
    const stream = await startChatTurn({
      userId: s.userId,
      chat,
      messages: [message],
      save: [message],
      provider,
      modelId,
      unattended: true,
    });
    let error: string | undefined;
    for await (const chunk of stream) {
      if (chunk.type === "error") error = chunk.errorText;
    }
    return { chatId: chat.id, error };
  } catch (err) {
    return { chatId: chat.id, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Claims a due schedule and runs it. The claim moves `nextRunAt` forward in the same UPDATE that
 * re-checks it is still due, so with several app instances only one of them runs it.
 */
async function claimAndRun(s: Schedule) {
  const now = new Date();
  const plan = planSchedule(s.cron, s.timezone, now);
  const [claimed] = await db
    .update(schema.agentSchedules)
    .set({
      lastStatus: "running",
      lastRunAt: now,
      lastError: null,
      nextRunAt: "next" in plan ? plan.next : null,
      // A schedule that can no longer be planned (e.g. edited in the DB) is switched off.
      ...("error" in plan && { enabled: false, lastError: plan.error }),
    })
    .where(and(eq(schema.agentSchedules.id, s.id), lte(schema.agentSchedules.nextRunAt, now)))
    .returning();
  if (!claimed || "error" in plan) return;

  const result = await runSchedule(claimed);
  await db
    .update(schema.agentSchedules)
    .set({
      lastStatus: result.error ? "error" : "ok",
      lastError: result.error ?? null,
      lastChatId: result.chatId ?? claimed.lastChatId,
      runCount: claimed.runCount + 1,
    })
    .where(eq(schema.agentSchedules.id, s.id));
  logger.info({ scheduleId: s.id, chatId: result.chatId, error: result.error }, "Scheduled agent run finished");
  await notifyScheduleRun(claimed, result);
}

/** Runs every schedule that is due (a few at a time). Missed runs while the server was down run once. */
export async function runDueSchedules() {
  const now = new Date();
  const due = await db.query.agentSchedules.findMany({
    where: and(
      eq(schema.agentSchedules.enabled, true),
      isNotNull(schema.agentSchedules.nextRunAt),
      lte(schema.agentSchedules.nextRunAt, now),
    ),
    orderBy: [asc(schema.agentSchedules.nextRunAt)],
    limit: BATCH * 4,
  });
  // Skip schedules whose previous run is still going, unless it looks abandoned.
  const runnable = due
    .filter((s) => s.lastStatus !== "running" || !s.lastRunAt || +now - +s.lastRunAt > STALE_RUN_MS)
    .slice(0, BATCH);
  await Promise.all(
    runnable.map((s) =>
      claimAndRun(s).catch((err) => logger.error({ err, scheduleId: s.id }, "Scheduled agent run failed")),
    ),
  );
}

const TICK_MS = 30_000;
const globalForScheduler = globalThis as { agentScheduler?: NodeJS.Timeout };

/** Starts the in-process scheduler once per server process (SCHEDULER=off disables it). */
export function startScheduler() {
  if (process.env.SCHEDULER === "off" || globalForScheduler.agentScheduler) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await runDueSchedules();
    } catch (err) {
      logger.error({ err }, "Scheduler tick failed");
    }
    try {
      // Imported lazily: usage reports don't depend on the agent scheduler's modules.
      const { runDueUsageReports } = await import("@/lib/usage-reports");
      await runDueUsageReports();
    } catch (err) {
      logger.error({ err }, "Usage report tick failed");
    } finally {
      busy = false;
    }
  };
  globalForScheduler.agentScheduler = setInterval(tick, TICK_MS);
  globalForScheduler.agentScheduler.unref?.();
  logger.info("Agent scheduler started");
}
