import { describe, expect, it } from "vitest";
import { buildReportEmail, nextReportAt, reportPeriod } from "./usage-reports";

const d = (iso: string) => new Date(iso);

describe("nextReportAt", () => {
  it("is the next Monday 08:00 UTC for weekly reports", () => {
    // 2026-10-17 is a Saturday.
    expect(nextReportAt("weekly", d("2026-10-17T12:00:00Z")).toISOString()).toBe("2026-10-19T08:00:00.000Z");
    // Monday before 08:00 → that same morning; at or after 08:00 → next week.
    expect(nextReportAt("weekly", d("2026-10-19T07:59:00Z")).toISOString()).toBe("2026-10-19T08:00:00.000Z");
    expect(nextReportAt("weekly", d("2026-10-19T08:00:00Z")).toISOString()).toBe("2026-10-26T08:00:00.000Z");
    // Sunday rolls to the next day.
    expect(nextReportAt("weekly", d("2026-10-25T23:00:00Z")).toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });

  it("is the 1st of the next month 08:00 UTC for monthly reports", () => {
    expect(nextReportAt("monthly", d("2026-10-17T12:00:00Z")).toISOString()).toBe("2026-11-01T08:00:00.000Z");
    expect(nextReportAt("monthly", d("2026-11-01T07:00:00Z")).toISOString()).toBe("2026-11-01T08:00:00.000Z");
    expect(nextReportAt("monthly", d("2026-12-05T00:00:00Z")).toISOString()).toBe("2027-01-01T08:00:00.000Z");
  });
});

describe("reportPeriod", () => {
  it("covers the previous Monday–Sunday for weekly reports", () => {
    const p = reportPeriod("weekly", d("2026-10-19T08:00:00Z"));
    expect([p.from, p.to]).toEqual(["2026-10-12", "2026-10-18"]);
    expect(p.since.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(p.until.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    // "Send now" midweek reports the last full week.
    expect(reportPeriod("weekly", d("2026-10-17T12:00:00Z")).from).toBe("2026-10-05");
  });

  it("covers the previous calendar month for monthly reports", () => {
    const p = reportPeriod("monthly", d("2026-11-01T08:00:00Z"));
    expect([p.from, p.to]).toEqual(["2026-10-01", "2026-10-31"]);
    expect(reportPeriod("monthly", d("2027-01-01T08:00:00Z")).from).toBe("2026-12-01");
    expect(reportPeriod("monthly", d("2026-03-10T00:00:00Z")).to).toBe("2026-02-28");
  });
});

describe("buildReportEmail", () => {
  const totals = { chats: 3, prompts: 10, replies: 10, tokensIn: 12000, tokensOut: 3400, costUsd: 0.4231, unpricedReplies: 2 };
  const models = [
    { provider: "openai", modelId: "gpt-x", replies: 8, tokensIn: 10000, tokensOut: 3000, costUsd: 0.4231, unpricedReplies: 0 },
    { provider: "custom", modelId: "<script>", replies: 2, tokensIn: 2000, tokensOut: 400, costUsd: null, unpricedReplies: 2 },
  ];

  it("summarizes totals, top models and unpriced replies", () => {
    const e = buildReportEmail({ frequency: "weekly", from: "2026-10-12", to: "2026-10-18", totals, models, analyticsUrl: "https://x.test/analytics" });
    expect(e.subject).toBe("Weekly usage: 10 replies, $0.42 (2026-10-12 to 2026-10-18)");
    expect(e.text).toContain("Tokens: 12,000 in, 3,400 out");
    expect(e.text).toContain("- custom:<script>: 2 replies");
    expect(e.text).toContain("2 replies had no known price");
    expect(e.text).toContain("- openai:gpt-x: 8 replies, 13,000 tokens, $0.42");
    expect(e.text).toContain("Analytics: https://x.test/analytics");
  });

  it("escapes model names in the HTML body", () => {
    const e = buildReportEmail({ frequency: "monthly", from: "2026-10-01", to: "2026-10-31", totals, models });
    expect(e.html).toContain("custom:&lt;script&gt;");
    expect(e.html).not.toContain("<script>");
  });

  it("says so when there were no replies", () => {
    const empty = { ...totals, replies: 0, prompts: 0, chats: 0, tokensIn: 0, tokensOut: 0, costUsd: null, unpricedReplies: 0 };
    const e = buildReportEmail({ frequency: "monthly", from: "2026-10-01", to: "2026-10-31", totals: empty, models: [] });
    expect(e.subject).toBe("Monthly usage: 0 replies, — (2026-10-01 to 2026-10-31)");
    expect(e.text).toContain("No model replies in this period.");
  });

  it("uses the singular for one reply", () => {
    const one = { ...totals, replies: 1, unpricedReplies: 1 };
    const e = buildReportEmail({ frequency: "weekly", from: "2026-10-05", to: "2026-10-11", totals: one, models: [{ ...models[0], replies: 1 }] });
    expect(e.subject).toContain("Weekly usage: 1 reply,");
    expect(e.text).toContain("1 reply had no known price and isn't in the cost.");
    expect(e.text).toContain("- openai:gpt-x: 1 reply,");
  });
});
