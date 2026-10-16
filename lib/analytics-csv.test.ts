import { describe, expect, it } from "vitest";
import { buildAnalyticsCsv, csvCell, parseExportRange, toCsv } from "./analytics-csv";

describe("csvCell / toCsv", () => {
  it("quotes commas, quotes and newlines, and leaves numbers bare", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(0.5)).toBe("0.5");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@sum")).toBe("'@sum");
    expect(csvCell(-3)).toBe("-3");
  });

  it("joins rows with CRLF and ends with one", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});

describe("buildAnalyticsCsv", () => {
  it("writes day, model and total rows, leaving unknown costs empty", () => {
    const csv = buildAnalyticsCsv({
      from: "2026-10-01",
      to: "2026-10-02",
      daily: [
        { day: "2026-10-01", replies: 2, tokensIn: 100, tokensOut: 50, costUsd: 0.1, unpricedReplies: 0 },
        { day: "2026-10-02", replies: 1, tokensIn: 10, tokensOut: 5, costUsd: null, unpricedReplies: 1 },
      ],
      models: [
        { provider: "openai", modelId: "gpt-4o", replies: 2, tokensIn: 100, tokensOut: 50, costUsd: 0.2, unpricedReplies: 0 },
        { provider: "custom", modelId: "my, model", replies: 1, tokensIn: 10, tokensOut: 5, costUsd: null, unpricedReplies: 1 },
      ],
    });
    expect(csv.split("\r\n")).toEqual([
      "scope,date,provider,model,replies,tokens_in,tokens_out,cost_usd,unpriced_replies",
      "day,2026-10-01,,,2,100,50,0.1,0",
      "day,2026-10-02,,,1,10,5,,1",
      "model,,openai,gpt-4o,2,100,50,0.2,0",
      'model,,custom,"my, model",1,10,5,,1',
      "total,2026-10-01..2026-10-02,,,3,110,55,0.1,1",
      "",
    ]);
  });

  it("rounds away float noise and leaves the total cost empty when nothing was priced", () => {
    const day = (d: string, costUsd: number | null) => ({ day: d, replies: 1, tokensIn: 1, tokensOut: 1, costUsd, unpricedReplies: 0 });
    const priced = buildAnalyticsCsv({ from: "a", to: "b", daily: [day("1", 0.1), day("2", 0.2)], models: [] });
    expect(priced.trim().split("\r\n").at(-1)).toBe("total,a..b,,,2,2,2,0.3,0");
    const unpriced = buildAnalyticsCsv({ from: "a", to: "b", daily: [day("1", null)], models: [] });
    expect(unpriced.trim().split("\r\n").at(-1)).toBe("total,a..b,,,1,1,1,,0");
  });
});

describe("parseExportRange", () => {
  const now = new Date("2026-10-16T15:30:00Z");

  it("defaults to the last 30 days ending today (UTC)", () => {
    const r = parseExportRange(null, null, now);
    expect(r).toMatchObject({ from: "2026-09-17", to: "2026-10-16" });
    if ("error" in r) throw new Error(r.error);
    expect(r.since.toISOString()).toBe("2026-09-17T00:00:00.000Z");
    expect(r.until.toISOString()).toBe("2026-10-17T00:00:00.000Z");
  });

  it("accepts an inclusive range and a single day", () => {
    expect(parseExportRange("2026-01-01", "2026-01-31", now)).toMatchObject({ from: "2026-01-01", to: "2026-01-31" });
    const one = parseExportRange("2026-02-28", "2026-02-28", now);
    if ("error" in one) throw new Error(one.error);
    expect(one.until.getTime() - one.since.getTime()).toBe(86_400_000);
  });

  it("rejects bad, reversed and over-long ranges", () => {
    expect(parseExportRange("2026-02-30", "2026-03-01", now)).toHaveProperty("error");
    expect(parseExportRange("yesterday", null, now)).toHaveProperty("error");
    expect(parseExportRange("2026-03-02", "2026-03-01", now)).toHaveProperty("error");
    expect(parseExportRange("2024-01-01", "2026-01-01", now)).toHaveProperty("error");
    expect(parseExportRange("2025-01-01", "2026-01-01", now)).not.toHaveProperty("error"); // 366 days
  });
});
