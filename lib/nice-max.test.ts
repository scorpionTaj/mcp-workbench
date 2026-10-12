import { describe, expect, it } from "vitest";
import { niceMax } from "@/components/analytics/daily-chart";

describe("niceMax", () => {
  it("picks a tight four-tick maximum with a round step", () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(3)).toBe(4);
    expect(niceMax(10_300)).toBe(12_000);
    expect(niceMax(95)).toBe(100);
    expect(niceMax(40_000)).toBe(40_000);
    expect(niceMax(40_001)).toBe(48_000);
  });
});
