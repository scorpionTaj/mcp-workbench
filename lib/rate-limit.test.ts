import { describe, expect, it, afterEach, vi } from "vitest";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { authRateLimitStorage, consumeRateLimit, checkRateLimit, createLimiter, RATE_LIMITS } from "./rate-limit";

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

// Just enough of ioredis for RateLimiterRedis: the Lua increment it registers via defineCommand.
function fakeRedis() {
  const counts = new Map<string, number>();
  return {
    status: "ready",
    counts,
    defineCommand: vi.fn(),
    rlflxIncr: vi.fn(async ([key, points, secDuration]: string[]) => {
      const n = (counts.get(key) ?? 0) + Number(points);
      counts.set(key, n);
      return [n, Number(secDuration) * 1000];
    }),
  };
}

describe("rate limit backends", () => {
  it("uses memory without Redis and Redis with in-memory insurance when configured", () => {
    const opts = { points: 1, duration: 60, keyPrefix: "t" };
    expect(createLimiter(opts, null)).toBeInstanceOf(RateLimiterMemory);
    const limiter = createLimiter(opts, fakeRedis() as never);
    expect(limiter).toBeInstanceOf(RateLimiterRedis);
    expect((limiter as unknown as { insuranceLimiter: unknown }).insuranceLimiter).toBeInstanceOf(RateLimiterMemory);
  });

  it("counts in Redis, so instances share one limit", async () => {
    const redis = fakeRedis();
    const a = createLimiter({ points: 2, duration: 60, keyPrefix: "chat" }, redis as never);
    const b = createLimiter({ points: 2, duration: 60, keyPrefix: "chat" }, redis as never);
    expect(await consumeRateLimit(a, "u1")).toBeNull();
    expect(await consumeRateLimit(b, "u1")).toBeNull();
    expect((await consumeRateLimit(a, "u1"))?.status).toBe(429);
    expect(redis.counts.get("rl:chat:u1")).toBe(3);
  });

  it("falls back to the per-instance insurance limit when Redis is down", async () => {
    const redis = fakeRedis();
    redis.status = "reconnecting";
    const limiter = createLimiter({ points: 1, duration: 60, keyPrefix: "down" }, redis as never);
    expect(await consumeRateLimit(limiter, "u1")).toBeNull();
    expect((await consumeRateLimit(limiter, "u1"))?.status).toBe(429);
    expect(redis.rlflxIncr).not.toHaveBeenCalled();

    const failing = fakeRedis();
    failing.rlflxIncr.mockRejectedValue(new Error("Command timed out"));
    const limiter2 = createLimiter({ points: 1, duration: 60, keyPrefix: "err" }, failing as never);
    expect(await consumeRateLimit(limiter2, "u1")).toBeNull();
    expect((await consumeRateLimit(limiter2, "u1"))?.status).toBe(429);
  });

  it("backs better-auth's limits with Redis only when REDIS_URL is set", async () => {
    delete process.env.REDIS_URL;
    expect(authRateLimitStorage()).toBeUndefined();
    const redis = fakeRedis();
    const storage = authRateLimitStorage(redis as never)!;
    const rule = { window: 60, max: 2 };
    expect(await storage.consume("1.2.3.4|/sign-in/email", rule)).toEqual({ allowed: true, retryAfter: null });
    expect(await storage.consume("1.2.3.4|/sign-in/email", rule)).toEqual({ allowed: true, retryAfter: null });
    expect(await storage.consume("1.2.3.4|/sign-in/email", rule)).toEqual({ allowed: false, retryAfter: 60 });
    expect(redis.counts.get("rl:auth:60:2:1.2.3.4|/sign-in/email")).toBe(3);
  });
});
