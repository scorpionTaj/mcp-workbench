import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Revokes a key: requests using it fail from now on. The row stays for the history. */
export const DELETE = withUser<Ctx>(
  async (_req, user, { params }) => {
    const { id } = await params;
    const rows = await db
      .update(schema.apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.userId, user.id), isNull(schema.apiKeys.revokedAt)))
      .returning({ id: schema.apiKeys.id });
    if (!rows.length) return notFound();
    return NextResponse.json({ success: true });
  },
  { sessionOnly: true },
);
