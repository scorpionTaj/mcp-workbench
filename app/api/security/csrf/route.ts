import { NextRequest } from "next/server";
import { getCsrfTokenResponse } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * GET endpoint to retrieve CSRF token
 * This token must be included in the x-csrf-token header for POST/PUT/DELETE requests
 */
export async function GET(request: NextRequest) {
  return getCsrfTokenResponse(request);
}
