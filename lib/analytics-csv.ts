// CSV export of usage analytics. Pure: no DB imports, so it can be unit tested.

export interface UsageDay {
  day: string; // YYYY-MM-DD
  replies: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number | null; // null: no reply that day had a known price
  unpricedReplies: number;
}

export interface UsageModel {
  provider: string;
  modelId: string;
  replies: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number | null;
  unpricedReplies: number;
}

export type CsvCell = string | number | null | undefined;

/** One CSV field: quoted when needed, and text a spreadsheet would run as a formula is defused. */
export function csvCell(value: CsvCell): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const ANALYTICS_CSV_HEADER = [
  "scope",
  "date",
  "provider",
  "model",
  "replies",
  "tokens_in",
  "tokens_out",
  "cost_usd",
  "unpriced_replies",
];

/**
 * One file with a `scope` column: a "day" row per day, a "model" row per model, then one "total"
 * row for the range. Filter on scope before summing. cost_usd is empty when no price was known.
 */
export function buildAnalyticsCsv({
  from,
  to,
  daily,
  models,
}: {
  from: string;
  to: string;
  daily: UsageDay[];
  models: UsageModel[];
}): string {
  const sumCost = (xs: { costUsd: number | null }[]) =>
    xs.some((x) => x.costUsd != null) ? round(xs.reduce((s, x) => s + (x.costUsd ?? 0), 0)) : null;
  const sum = (xs: UsageDay[], k: "replies" | "tokensIn" | "tokensOut" | "unpricedReplies") => xs.reduce((s, x) => s + x[k], 0);
  return toCsv(ANALYTICS_CSV_HEADER, [
    ...daily.map((d) => ["day", d.day, "", "", d.replies, d.tokensIn, d.tokensOut, round(d.costUsd), d.unpricedReplies]),
    ...models.map((m) => ["model", "", m.provider, m.modelId, m.replies, m.tokensIn, m.tokensOut, round(m.costUsd), m.unpricedReplies]),
    [
      "total",
      `${from}..${to}`,
      "",
      "",
      sum(daily, "replies"),
      sum(daily, "tokensIn"),
      sum(daily, "tokensOut"),
      sumCost(daily),
      sum(daily, "unpricedReplies"),
    ],
  ]);
}

// Six decimals: below a ten-thousandth of a cent, without float noise like 0.30000000000000004.
function round(usd: number | null): number | null {
  return usd == null ? null : Math.round(usd * 1e6) / 1e6;
}

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const parseDay = (s: string | null) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || isoDay(d) !== s ? null : d;
};

export const MAX_EXPORT_DAYS = 366;

/**
 * An inclusive UTC date range from `from`/`to` (YYYY-MM-DD). Missing values default to the last
 * 30 days ending today. Returns an error message for bad or reversed dates and over-long ranges.
 */
export function parseExportRange(
  fromParam: string | null,
  toParam: string | null,
  now = new Date(),
): { from: string; to: string; since: Date; until: Date } | { error: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = toParam ? parseDay(toParam) : today;
  if (!to) return { error: "`to` must be a date like 2026-01-31" };
  const from = fromParam ? parseDay(fromParam) : new Date(to.getTime() - 29 * DAY_MS);
  if (!from) return { error: "`from` must be a date like 2026-01-01" };
  if (from > to) return { error: "`from` must not be after `to`" };
  if ((to.getTime() - from.getTime()) / DAY_MS + 1 > MAX_EXPORT_DAYS) {
    return { error: `The range can be at most ${MAX_EXPORT_DAYS} days` };
  }
  return { from: isoDay(from), to: isoDay(to), since: from, until: new Date(to.getTime() + DAY_MS) };
}
