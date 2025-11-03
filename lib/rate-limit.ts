/**
 * Rate limiting middleware using memory store
 * Protects API endpoints from abuse and DoS attacks
 */

import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";

// Configuration for different endpoint types
const rateLimiters = {
  // Strict limits for authentication and sensitive operations
  strict: new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
    blockDuration: 300, // Block for 5 minutes if exceeded
  }),

  // Standard limits for API endpoints
  standard: new RateLimiterMemory({
    points: 30, // 30 requests
    duration: 60, // per 60 seconds
    blockDuration: 60, // Block for 1 minute if exceeded
  }),

  // Relaxed limits for read-only operations
  relaxed: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
    blockDuration: 30, // Block for 30 seconds if exceeded
  }),
};

/**
 * Gets the client identifier for rate limiting
 * Uses IP address or a combination of factors
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a combination of user agent and accept language
  const userAgent = request.headers.get("user-agent") || "unknown";
  const acceptLanguage = request.headers.get("accept-language") || "unknown";
  return `${userAgent}-${acceptLanguage}`;
}

/**
 * Rate limit middleware factory
 * @param limitType - Type of rate limit to apply ('strict' | 'standard' | 'relaxed')
 */
export function createRateLimiter(
  limitType: "strict" | "standard" | "relaxed" = "standard"
) {
  const limiter = rateLimiters[limitType];

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = getClientIdentifier(request);

    try {
      await limiter.consume(identifier);
      return null; // Allow request to proceed
    } catch (rateLimiterRes: any) {
      const remainingSeconds = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${remainingSeconds} seconds.`,
          retryAfter: remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": remainingSeconds.toString(),
            "X-RateLimit-Limit": limiter.points.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              Date.now() + rateLimiterRes.msBeforeNext
            ).toISOString(),
          },
        }
      );
    }
  };
}

/**
 * Wrapper function to apply rate limiting to API routes
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  limitType: "strict" | "standard" | "relaxed" = "standard"
): Promise<NextResponse> {
  const rateLimiter = createRateLimiter(limitType);
  const limitResponse = await rateLimiter(request);

  if (limitResponse) {
    return limitResponse;
  }

  return handler(request);
}
