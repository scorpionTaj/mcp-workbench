import { and, eq, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { usageByDay, usageByModel, usageScope, usageTotals } from "@/lib/analytics";
import { buildAnalyticsCsv, type UsageModel } from "@/lib/analytics-csv";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatCost } from "@/lib/pricing";
import logger from "@/lib/logger";

/**
 * Usage report emails. Weekly reports go out on Mondays and cover the previous Monday–Sunday;
 * monthly ones go out on the 1st and cover the previous calendar month. Both at 08:00 UTC,
 * with the period's analytics CSV attached.
 */
export type ReportFrequency = "weekly" | "monthly";
export const REPORT_FREQUENCIES: ReportFrequency[] = ["weekly", "monthly"];

const SEND_HOUR_UTC = 8;
const DAY_MS = 86_400_000;

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** When the next report is due, strictly after `now`. */
export function nextReportAt(frequency: ReportFrequency, now: Date): Date {
  if (frequency === "weekly") {
    const today = utcDay(now);
    const daysToMonday = (8 - today.getUTCDay()) % 7; // getUTCDay: 0 = Sunday, 1 = Monday
    let next = new Date(+today + daysToMonday * DAY_MS + SEND_HOUR_UTC * 3_600_000);
    if (next <= now) next = new Date(+next + 7 * DAY_MS);
    return next;
  }
  let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, SEND_HOUR_UTC));
  if (next <= now) next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, SEND_HOUR_UTC));
  return next;
}

/**
 * The period a report sent at `at` covers: [since, until) in UTC, with inclusive YYYY-MM-DD bounds.
 * Weekly: the 7 days before the start of the week containing `at`. Monthly: the previous month.
 */
export function reportPeriod(frequency: ReportFrequency, at: Date) {
  let since: Date;
  let until: Date;
  if (frequency === "weekly") {
    const today = utcDay(at);
    until = new Date(+today - ((today.getUTCDay() + 6) % 7) * DAY_MS); // this week's Monday
    since = new Date(+until - 7 * DAY_MS);
  } else {
    until = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
    since = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 1, 1));
  }
  return { since, until, from: isoDay(since), to: isoDay(new Date(+until - DAY_MS)) };
}

export interface ReportData {
  frequency: ReportFrequency;
  from: string;
  to: string;
  totals: Awaited<ReturnType<typeof usageTotals>>;
  models: UsageModel[];
  analyticsUrl?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const replies = (n: number) => `${fmt(n)} ${n === 1 ? "reply" : "replies"}`;

/** Subject and bodies of a report email. Pure, so it's unit tested. */
export function buildReportEmail(r: ReportData) {
  const label = r.frequency === "weekly" ? "Weekly" : "Monthly";
  const cost = formatCost(r.totals.costUsd);
  const subject = `${label} usage: ${replies(r.totals.replies)}, ${cost} (${r.from} to ${r.to})`;
  const priced = r.totals.unpricedReplies
    ? `${replies(r.totals.unpricedReplies)} had no known price and ${r.totals.unpricedReplies === 1 ? "isn't" : "aren't"} in the cost.`
    : "";
  const top = r.models.slice(0, 5);
  const lines = [
    `${label} usage for ${r.from} to ${r.to} (UTC)`,
    "",
    `Chats: ${fmt(r.totals.chats)}`,
    `Prompts: ${fmt(r.totals.prompts)}`,
    `Replies: ${fmt(r.totals.replies)}`,
    `Tokens: ${fmt(r.totals.tokensIn)} in, ${fmt(r.totals.tokensOut)} out`,
    `Estimated cost: ${cost}`,
    ...(priced ? [priced] : []),
    "",
    ...(top.length
      ? [
          "Top models:",
          ...top.map(
            (m) =>
              `- ${m.provider}:${m.modelId}: ${replies(m.replies)}, ${fmt(m.tokensIn + m.tokensOut)} tokens, ${formatCost(m.costUsd)}`,
          ),
        ]
      : ["No model replies in this period."]),
    "",
    "The full breakdown by day and model is attached as CSV.",
    ...(r.analyticsUrl ? [`Analytics: ${r.analyticsUrl}`] : []),
    "You get this email because usage reports are on in Settings.",
  ];
  const row = (k: string, v: string) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#888">${k}</td><td>${escapeHtml(v)}</td></tr>`;
  const html = [
    `<p><strong>${label} usage for ${r.from} to ${r.to}</strong> (UTC)</p>`,
    "<table>",
    row("Chats", fmt(r.totals.chats)),
    row("Prompts", fmt(r.totals.prompts)),
    row("Replies", fmt(r.totals.replies)),
    row("Tokens", `${fmt(r.totals.tokensIn)} in, ${fmt(r.totals.tokensOut)} out`),
    row("Estimated cost", cost),
    "</table>",
    priced && `<p style="color:#888;font-size:12px">${escapeHtml(priced)}</p>`,
    top.length
      ? `<p><strong>Top models</strong></p><ul>${top
          .map(
            (m) =>
              `<li>${escapeHtml(`${m.provider}:${m.modelId}`)}: ${replies(m.replies)}, ${fmt(m.tokensIn + m.tokensOut)} tokens, ${escapeHtml(formatCost(m.costUsd))}</li>`,
          )
          .join("")}</ul>`
      : "<p>No model replies in this period.</p>",
    `<p>The full breakdown by day and model is attached as CSV.${
      r.analyticsUrl ? ` <a href="${escapeHtml(r.analyticsUrl)}">Open analytics</a>` : ""
    }</p>`,
    `<p style="color:#888;font-size:12px">You get this email because usage reports are on in Settings.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text: lines.join("\n"), html };
}

/** Builds and emails one report for the period that a send at `at` covers. False when email isn't configured. */
export async function sendUsageReport(userId: string, frequency: ReportFrequency, at = new Date()) {
  const [owner] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, userId));
  if (!owner) return false;
  const period = reportPeriod(frequency, at);
  const scope = usageScope(userId, period.since, period.until);
  const [totals, models, daily] = await Promise.all([usageTotals(scope), usageByModel(scope), usageByDay(scope)]);
  const base = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "");
  const email = buildReportEmail({
    frequency,
    from: period.from,
    to: period.to,
    totals,
    models,
    analyticsUrl: base ? `${base}/analytics` : undefined,
  });
  return sendEmail({
    to: owner.email,
    ...email,
    idempotencyKey: `usage-report/${userId}/${frequency}/${period.from}`,
    attachments: [
      {
        filename: `usage-${period.from}-to-${period.to}.csv`,
        content: buildAnalyticsCsv({ from: period.from, to: period.to, daily, models }),
        contentType: "text/csv",
      },
    ],
  });
}

/**
 * Sends every report that is due. Each row is claimed by moving `nextRunAt` forward in the same
 * UPDATE that re-checks it is still due, so with several instances only one sends it.
 * A report missed while the server was down goes out once, for the latest period.
 */
export async function runDueUsageReports(now = new Date()) {
  const due = await db.query.usageReports.findMany({
    where: lte(schema.usageReports.nextRunAt, now),
    limit: 20,
  });
  for (const r of due) {
    const [claimed] = await db
      .update(schema.usageReports)
      .set({ nextRunAt: nextReportAt(r.frequency, now) })
      .where(and(eq(schema.usageReports.userId, r.userId), lte(schema.usageReports.nextRunAt, now)))
      .returning();
    if (!claimed) continue;
    try {
      const sent = await sendUsageReport(r.userId, r.frequency, now);
      await db
        .update(schema.usageReports)
        .set(sent ? { lastSentAt: now, lastError: null } : { lastError: "Email isn't configured on the server" })
        .where(eq(schema.usageReports.userId, r.userId));
    } catch (err) {
      logger.warn({ err, userId: r.userId }, "Usage report failed");
      await db
        .update(schema.usageReports)
        .set({ lastError: err instanceof Error ? err.message : String(err) })
        .where(eq(schema.usageReports.userId, r.userId));
    }
  }
}
