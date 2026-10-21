import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { deleteUpload } from "@/lib/storage";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const DELETE = withUser<{ params: Promise<{ datasetId: string }> }>(async (_req, user, { params }) => {
  const { datasetId } = await params;
  const [deleted] = await db
    .delete(schema.datasets)
    .where(and(eq(schema.datasets.id, datasetId), eq(schema.datasets.userId, user.id)))
    .returning();
  if (!deleted) return notFound();

  await deleteUpload(deleted.path).catch((err) =>
    logger.warn({ err, datasetId }, "Could not delete dataset file"),
  );
  return NextResponse.json({ success: true });
});
