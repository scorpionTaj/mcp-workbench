import { describe, expect, it, afterEach } from "vitest";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { consumeRateLimit, checkRateLimit, RATE_LIMITS } from "./rate-limit";

describe("rate limiting", () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT;
  });

  it("allows requests up to the limit, then returns 429 with Retry-After", async () => {
    const limiter = new RateLimiterMemory({ points: 2, duration: 60 });
    expect(await consumeRateLimit(limiter, "u1")).toBeNull();
    expect(await consumeRateLimit(limiter, "u1")).toBeNull();
    const res = await consumeRateLimit(limiter, "u1");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(res?.headers.get("X-RateLimit-Limit")).toBe("2");
  });

  it("counts each key separately", async () => {
    const limiter = new RateLimiterMemory({ points: 1, duration: 60 });
    expect(await consumeRateLimit(limiter, "a")).toBeNull();
    expect(await consumeRateLimit(limiter, "b")).toBeNull();
    expect((await consumeRateLimit(limiter, "a"))?.status).toBe(429);
  });

  it("limits a user per named route group", async () => {
    const { points } = RATE_LIMITS.studio;
    for (let i = 0; i < points; i++) expect(await checkRateLimit("studio", "user-x")).toBeNull();
    expect((await checkRateLimit("studio", "user-x"))?.status).toBe(429);
    // Other groups have their own counters.
    expect(await checkRateLimit("upload", "user-x")).toBeNull();
  });

  it("is disabled by RATE_LIMIT=off", async () => {
    process.env.RATE_LIMIT = "off";
    for (let i = 0; i < RATE_LIMITS.compare.points + 2; i++) {
      expect(await checkRateLimit("compare", "user-y")).toBeNull();
    }
  });
});
