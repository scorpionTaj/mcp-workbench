import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { resolveUploadUrl } from "@/lib/uploads";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const DELETE = withUser<{ params: Promise<{ datasetId: string }> }>(async (_req, user, { params }) => {
  const { datasetId } = await params;
  const [deleted] = await db
    .delete(schema.datasets)
    .where(and(eq(schema.datasets.id, datasetId), eq(schema.datasets.userId, user.id)))
    .returning();
  if (!deleted) return notFound();

  await unlink(resolveUploadUrl(deleted.path)).catch((err) =>
    logger.warn({ err, datasetId }, "Dataset file already gone"),
  );
  return NextResponse.json({ success: true });
});
