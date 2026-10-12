import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { readDataset } from "@/lib/datasets";
import { profileColumns } from "@/lib/tabular";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

const SAMPLE_ROWS = 50;
const PROFILE_ROWS = 10_000;

/** Columns with types and stats (from the first 10k rows) and a sample of rows. */
export const GET = withUser<{ params: Promise<{ datasetId: string }> }>(async (_req, user, { params }) => {
  const { datasetId } = await params;
  const dataset = await db.query.datasets.findFirst({
    where: and(eq(schema.datasets.id, datasetId), eq(schema.datasets.userId, user.id)),
  });
  if (!dataset) return notFound();
  try {
    const { columns, rows, totalRows } = await readDataset(dataset, PROFILE_ROWS);
    if (dataset.rows !== totalRows || dataset.columns !== columns.length) {
      await db
        .update(schema.datasets)
        .set({ rows: totalRows, columns: columns.length, updatedAt: new Date() })
        .where(eq(schema.datasets.id, dataset.id));
    }
    return NextResponse.json({
      columns,
      profile: profileColumns(columns, rows),
      profiledRows: rows.length,
      data: rows.slice(0, SAMPLE_ROWS),
      rows: totalRows,
      size: dataset.size,
    });
  } catch (err) {
    logger.error({ err, datasetId }, "Dataset preview failed");
    return NextResponse.json({ error: "Could not read this file. Is it a valid CSV/TSV/Parquet file?" }, { status: 400 });
  }
});
