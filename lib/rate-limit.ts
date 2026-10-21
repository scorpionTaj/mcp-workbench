import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes, type RateLimiterAbstract } from "rate-limiter-flexible";
import { NextResponse } from "next/server";
import Redis from "ioredis";
import logger from "@/lib/logger";

/**
 * Per-user limits for the expensive routes (requests per window, in seconds).
 * With REDIS_URL set the counters are shared by every instance (and survive restarts);
 * without it, or while Redis is unreachable, each instance counts in its own memory.
 * RATE_LIMIT=off disables them (sign-in limits are configured in lib/auth.ts).
 */
export const RATE_LIMITS = {
  chat: { points: 30, duration: 60 },
  compare: { points: 10, duration: 60 },
  // Batch runs and judge calls on the Compare page: one request per prompt × model.
  compareBatch: { points: 120, duration: 60 },
  studio: { points: 10, duration: 60 },
  upload: { points: 20, duration: 60 },
  // Every request made with a personal API key, counted per key (on top of the limits above).
  apiKey: { points: 120, duration: 60 },
  // Password attempts on one shared link.
  shareUnlock: { points: 10, duration: 60 },
  // "Send a report now": each one is an email to the account address.
  usageReportSend: { points: 3, duration: 300 },
  billing: { points: 5, duration: 60 },
  accountExport: { points: 3, duration: 600 },
  accountDelete: { points: 2, duration: 3600 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

const KEY_PREFIX = "rl:";

// Its own connection rather than lib/cache's: rate-limiter-flexible needs the offline queue off
// so a Redis outage fails fast to the in-memory insurance limiter instead of queueing requests.
let redis: Redis | null | undefined;

export function rateLimitRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return (redis = null);
  redis = new Redis(url, {
    password: process.env.REDIS_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: 1000,
    retryStrategy: (times) => Math.min(times * 1000, 5000),
  });
  redis.on("error", (err) => logger.warn({ err }, "Rate limit Redis error (falling back to in-memory limits)"));
  return redis;
}

type LimiterOptions = { points: number; duration: number; keyPrefix: string };

/** A Redis-backed limiter with in-memory insurance when Redis is configured, else in-memory only. */
export function createLimiter(opts: LimiterOptions, client: Redis | null = rateLimitRedis()): RateLimiterAbstract {
  const memory = new RateLimiterMemory(opts);
  if (!client) return memory;
  return new RateLimiterRedis({
    ...opts,
    keyPrefix: KEY_PREFIX + opts.keyPrefix,
    storeClient: client,
    rejectIfRedisNotReady: true,
    insuranceLimiter: memory,
  });
}

const limiters = new Map<RateLimitName, RateLimiterAbstract>();

function limiterFor(name: RateLimitName) {
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = createLimiter({ ...RATE_LIMITS[name], keyPrefix: name });
    limiters.set(name, limiter);
  }
  return limiter;
}

export const rateLimitEnabled = () => process.env.RATE_LIMIT !== "off";

/** Consumes one request for `key`; returns a 429 response when the limit is used up. */
export async function consumeRateLimit(
  limiter: RateLimiterAbstract,
  key: string,
): Promise<Response | null> {
  try {
    await limiter.consume(key);
    return null;
  } catch (err) {
    if (!(err instanceof RateLimiterRes)) throw err;
    const retryAfter = Math.max(1, Math.ceil(err.msBeforeNext / 1000));
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.`, retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limiter.points),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
}

/** Applies the named limit to `key` (a user id, API key id or share token). */
export function checkRateLimit(name: RateLimitName, key: string) {
  if (!rateLimitEnabled()) return Promise.resolve(null);
  return consumeRateLimit(limiterFor(name), key);
}

type AuthRule = { window: number; max: number };

/**
 * better-auth `rateLimit.customStorage` backed by the same Redis limiters, so the per-IP
 * sign-in limits are shared too. Only rate limits move to Redis; sessions stay in Postgres.
 */
export function authRateLimitStorage(client?: Redis) {
  if (!client && !process.env.REDIS_URL) return undefined;
  const byRule = new Map<string, RateLimiterAbstract>();
  return {
    async consume(key: string, rule: AuthRule) {
      const id = `${rule.window}:${rule.max}`;
      let limiter = byRule.get(id);
      if (!limiter) {
        // Connects on first use, not when lib/auth is imported (e.g. during the build).
        limiter = createLimiter({ points: rule.max, duration: rule.window, keyPrefix: `auth:${id}` }, client ?? rateLimitRedis());
        byRule.set(id, limiter);
      }
      try {
        await limiter.consume(key);
        return { allowed: true, retryAfter: null };
      } catch (err) {
        if (!(err instanceof RateLimiterRes)) throw err;
        return { allowed: false, retryAfter: Math.max(1, Math.ceil(err.msBeforeNext / 1000)) };
      }
    },
  };
}
