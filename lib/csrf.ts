/**
 * CSRF Protection Middleware for Next.js
 * Protects against Cross-Site Request Forgery attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { generateToken, secureCompare } from "./encryption";

const CSRF_COOKIE_NAME = "mcp-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generates a new CSRF token
 */
export function generateCsrfToken(): string {
  return generateToken(32);
}

/**
 * Gets or creates a CSRF token from the request
 */
function getOrCreateCsrfToken(request: NextRequest): string {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  return existingToken || generateCsrfToken();
}

/**
 * Validates CSRF token from request
 */
function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  return secureCompare(cookieToken, headerToken);
}

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing operations (POST, PUT, DELETE, PATCH)
 */
export async function withCsrfProtection(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Only check CSRF for state-changing methods
  const methodsToProtect = ["POST", "PUT", "DELETE", "PATCH"];

  const token = getOrCreateCsrfToken(request);

  if (!methodsToProtect.includes(request.method)) {
    // For GET requests, just set the token and continue
    const response = await handler(request);
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return response;
  }

  try {
    // Verify CSRF token for state-changing requests
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        {
          error: "CSRF validation failed",
          message:
            "Invalid or missing CSRF token. Please refresh and try again.",
        },
        { status: 403 }
      );
    }

    // Token is valid, proceed with the request
    const response = await handler(request);
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("CSRF validation error:", error);
    return NextResponse.json(
      {
        error: "CSRF validation error",
        message: "An error occurred during security validation.",
      },
      { status: 403 }
    );
  }
}

/**
 * Gets CSRF token for client-side use
 */
export function getCsrfToken(request: NextRequest): string {
  return getOrCreateCsrfToken(request);
}

/**
 * API route to get CSRF token
 */
export async function getCsrfTokenResponse(
  request: NextRequest
): Promise<NextResponse> {
  const token = getOrCreateCsrfToken(request);
  const response = NextResponse.json({ token });

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  return response;
}
