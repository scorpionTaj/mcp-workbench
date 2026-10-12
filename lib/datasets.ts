import { readFile } from "node:fs/promises";
import type { Dataset as DatasetRow } from "@/lib/schema";
import type { Dataset } from "@/lib/types";
import { resolveUploadUrl } from "@/lib/uploads";
import { csvToRows, parseCsv, toCell, type Row } from "@/lib/tabular";

export const DATASET_MAX_BYTES = 50 * 1024 * 1024;

/** DB row → the shape the datasets UI expects. */
export function toClientDataset(d: DatasetRow): Dataset {
  return {
    id: d.id,
    name: d.name,
    type: d.filename.endsWith(".parquet") ? "parquet" : d.filename.endsWith(".tsv") ? "tsv" : "csv",
    size: d.size,
    uploadedAt: d.createdAt,
    indexed: d.indexed,
    rows: d.rows ?? undefined,
    columns: d.columns ?? undefined,
  };
}

/** Reads up to `limit` rows of a stored CSV/TSV/Parquet dataset, plus the total row count. */
export async function readDataset(d: DatasetRow, limit: number): Promise<{ columns: string[]; rows: Row[]; totalRows: number }> {
  const bytes = await readFile(resolveUploadUrl(d.path));
  if (d.filename.endsWith(".parquet")) {
    const { parquetMetadata, parquetReadObjects, parquetSchema } = await import("hyparquet");
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const metadata = parquetMetadata(buffer);
    const columns = parquetSchema(metadata).children.map((c) => c.element.name);
    const totalRows = Number(metadata.num_rows);
    const objects = await parquetReadObjects({ file: buffer, metadata, rowStart: 0, rowEnd: Math.min(limit, totalRows) });
    const rows = objects.map((o) => Object.fromEntries(columns.map((c) => [c, toCell(o[c])])));
    return { columns, rows, totalRows };
  }
  const table = parseCsv(bytes.toString("utf8"), d.filename.endsWith(".tsv") ? "\t" : undefined);
  const { columns, rows } = csvToRows(table);
  return { columns, rows: rows.slice(0, limit), totalRows: rows.length };
}
