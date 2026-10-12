import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { auth, type SessionUser } from "@/lib/auth";

type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Wraps a route handler so it only runs for a signed-in user, who is passed in.
 * Every query in the handler must be scoped to `user.id`.
 */
export function withUser<C = RouteContext>(
  handler: (req: NextRequest, user: SessionUser, ctx: C) => Promise<Response>,
  opts: { admin?: boolean } = {},
) {
  return async (req: NextRequest, ctx: C) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (opts.admin && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, session.user, ctx);
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
