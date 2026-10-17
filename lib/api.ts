import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { auth, type SessionUser } from "@/lib/auth";
import { checkRateLimit, type RateLimitName } from "@/lib/rate-limit";
import { authenticateApiKey, bearerApiKey } from "@/lib/api-keys";

type RouteContext = { params: Promise<Record<string, string>> };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = (error = "Forbidden") => NextResponse.json({ error }, { status: 403 });

/**
 * Wraps a route handler so it only runs for a signed-in user, who is passed in.
 * Every query in the handler must be scoped to `user.id`.
 * `rateLimit` applies one of the per-user limits from lib/rate-limit.ts.
 *
 * Besides the session cookie, a personal API key works: `Authorization: Bearer mwb_…`.
 * Such requests are also limited per key, never reach admin routes (the user is treated as a
 * regular user) and are refused on `sessionOnly` routes, such as managing the keys themselves.
 * When the header carries a key, the cookie is ignored, so a bad key is a 401.
 */
export function withUser<C = RouteContext>(
  handler: (req: NextRequest, user: SessionUser, ctx: C) => Promise<Response>,
  opts: { admin?: boolean; sessionOnly?: boolean; rateLimit?: RateLimitName } = {},
) {
  return async (req: NextRequest, ctx: C) => {
    let user: SessionUser;
    const apiKey = bearerApiKey(req.headers);
    if (apiKey) {
      if (opts.admin || opts.sessionOnly) return forbidden("This endpoint can't be used with an API key");
      const found = await authenticateApiKey(apiKey);
      if (!found) return unauthorized();
      const limited = await checkRateLimit("apiKey", found.keyId);
      if (limited) return limited;
      user = { ...found.user, role: "user" } as SessionUser;
    } else {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) return unauthorized();
      if (opts.admin && session.user.role !== "admin") return forbidden();
      user = session.user;
    }
    if (opts.rateLimit) {
      const limited = await checkRateLimit(opts.rateLimit, user.id);
      if (limited) return limited;
    }
    return handler(req, user, ctx);
  };
}

/** Parses a JSON body with a zod schema; returns a 400 response instead of throwing. */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: Response }> {
  const json = await req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Invalid request body", details: result.error.issues },
        { status: 400 },
      ),
    };
  }
  return { data: result.data };
}

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
