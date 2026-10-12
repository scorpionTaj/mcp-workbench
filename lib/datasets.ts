import type { Dataset as DatasetRow } from "@/lib/schema";
import type { Dataset } from "@/lib/types";

/** DB row → the shape the datasets UI expects. */
export function toClientDataset(d: DatasetRow): Dataset {
  return {
    id: d.id,
    name: d.name,
    type: d.filename.endsWith(".parquet") ? "parquet" : "csv",
    size: d.size,
    uploadedAt: d.createdAt,
    indexed: d.indexed,
    rows: d.rows ?? undefined,
  };
}
