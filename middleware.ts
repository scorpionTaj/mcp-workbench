import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Performance monitoring middleware
 * Logs response times for all API routes and tracks slow endpoints
 * Compatible with Edge Runtime
 */
export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;

  // Only monitor API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Clone the response to add timing headers
  const response = NextResponse.next();

  // Calculate response time after the response is ready
  const responseTime = Date.now() - startTime;

  // Add performance headers
  response.headers.set("X-Response-Time", `${responseTime}ms`);
  response.headers.set("X-Request-Start", startTime.toString());

  // Log to console (Edge Runtime compatible)
  const logData = {
    method: request.method,
    path: pathname,
    responseTime,
    timestamp: new Date().toISOString(),
  };

  // Log slow endpoints (> 1000ms) as warnings
  if (responseTime > 1000) {
    console.warn(
      `[SLOW] ${logData.method} ${logData.path} - ${responseTime}ms`
    );
  } else if (responseTime > 500) {
    // Log moderately slow endpoints (> 500ms) as info
    console.log(
      `[MODERATE] ${logData.method} ${logData.path} - ${responseTime}ms`
    );
  } else if (process.env.NODE_ENV === "development") {
    // Log fast endpoints only in development
    console.debug(
      `[API] ${logData.method} ${logData.path} - ${responseTime}ms`
    );
  }

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all API routes:
     * - /api/*
     */
    "/api/:path*",
  ],
};
