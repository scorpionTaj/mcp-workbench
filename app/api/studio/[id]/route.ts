import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { resolveUploadUrl } from "@/lib/uploads";

/** Deletes a generation and its files. */
export const DELETE = withUser<{ params: Promise<{ id: string }> }>(async (_req, user, { params }) => {
  const [row] = await db
    .delete(schema.generations)
    .where(and(eq(schema.generations.id, (await params).id), eq(schema.generations.userId, user.id)))
    .returning();
  if (!row) return notFound();
  await Promise.all(row.files.map((f) => unlink(resolveUploadUrl(f)).catch(() => {})));
  return NextResponse.json({ success: true });
});
