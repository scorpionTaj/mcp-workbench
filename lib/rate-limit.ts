import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { NextResponse } from "next/server";

/**
 * Per-user limits for the expensive routes (requests per window, in seconds).
 * Counters live in this process's memory, so each instance enforces its own limit.
 * RATE_LIMIT=off disables them (sign-in limits are configured in lib/auth.ts).
 */
export const RATE_LIMITS = {
  chat: { points: 30, duration: 60 },
  compare: { points: 10, duration: 60 },
  studio: { points: 10, duration: 60 },
  upload: { points: 20, duration: 60 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

const limiters = new Map<RateLimitName, RateLimiterMemory>();

function limiterFor(name: RateLimitName) {
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new RateLimiterMemory({ ...RATE_LIMITS[name], keyPrefix: name });
    limiters.set(name, limiter);
  }
  return limiter;
}

export const rateLimitEnabled = () => process.env.RATE_LIMIT !== "off";

/** Consumes one request for `key`; returns a 429 response when the limit is used up. */
export async function consumeRateLimit(
  limiter: RateLimiterMemory,
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

/** Applies the named limit to a signed-in user. */
export function checkRateLimit(name: RateLimitName, userId: string) {
  if (!rateLimitEnabled()) return Promise.resolve(null);
  return consumeRateLimit(limiterFor(name), userId);
}
