import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { readDataset } from "@/lib/datasets";
import { addDocument, KnowledgeError, processDocument } from "@/lib/knowledge";
import { rowsToText } from "@/lib/tabular";

export const maxDuration = 300;

/**
 * Adds a dataset to a knowledge base: each row becomes a "column: value" text record, so the
 * model can find rows by meaning or keyword with search_knowledge.
 */
export const POST = withUser<{ params: Promise<{ datasetId: string }> }>(async (req, user, { params }) => {
  const { data, error } = await parseBody(
    req,
    z.object({ knowledgeBaseId: z.string().min(1), maxRows: z.number().int().min(1).max(20_000).default(5_000) }),
  );
  if (error) return error;
  const { datasetId } = await params;
  const [dataset, kb] = await Promise.all([
    db.query.datasets.findFirst({ where: and(eq(schema.datasets.id, datasetId), eq(schema.datasets.userId, user.id)) }),
    db.query.knowledgeBases.findFirst({
      where: and(eq(schema.knowledgeBases.id, data.knowledgeBaseId), eq(schema.knowledgeBases.userId, user.id)),
    }),
  ]);
  if (!dataset || !kb) return notFound();

  try {
    const { columns, rows, totalRows } = await readDataset(dataset, data.maxRows);
    const { doc, text } = await addDocument(kb, {
      name: rows.length < totalRows ? `${dataset.name} (first ${rows.length} of ${totalRows} rows)` : dataset.name,
      text: rowsToText(dataset.name, columns, rows),
      mime: dataset.filename.endsWith(".parquet") ? "application/vnd.apache.parquet" : "text/csv",
    });
    await db
      .update(schema.datasets)
      .set({ indexed: true, rows: totalRows, columns: columns.length, updatedAt: new Date() })
      .where(eq(schema.datasets.id, dataset.id));
    after(() => processDocument(user.id, kb, doc.id, text));
    return NextResponse.json({ document: doc, rows: rows.length, totalRows }, { status: 201 });
  } catch (err) {
    if (err instanceof KnowledgeError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
});
