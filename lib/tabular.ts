// Pure helpers for tabular datasets (CSV/TSV/Parquet rows): parsing, profiling, text records.

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

/** RFC 4180 CSV: quoted fields, escaped quotes (""), CRLF/LF, newlines inside quotes. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const sep = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** The most frequent of comma, tab, semicolon or pipe on the first line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  let best = ",";
  let bestCount = 0;
  for (const d of [",", "\t", ";", "|"]) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** Header row + data rows → column names (unique, non-empty) and objects with typed cells. */
export function csvToRows(table: string[][]): { columns: string[]; rows: Row[] } {
  const [header = [], ...body] = table;
  const seen = new Map<string, number>();
  const columns = header.map((h, i) => {
    const base = h.trim() || `column_${i + 1}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}_${n + 1}` : base;
  });
  const rows = body.map((cells) => Object.fromEntries(columns.map((c, i) => [c, coerce(cells[i])])));
  return { columns, rows };
}

function coerce(value: string | undefined): Cell {
  if (value === undefined) return null;
  const v = value.trim();
  if (v === "" || /^(null|na|n\/a|nan)$/i.test(v)) return null;
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === "true";
  if (/^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(v) && !/^-?0\d/.test(v)) return Number(v);
  return value;
}

/** Normalizes values from other readers (Parquet: bigint, Date, nested objects) into cells. */
export function toCell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (value instanceof Uint8Array) return `<${value.length} bytes>`;
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

export type ColumnType = "number" | "boolean" | "date" | "text" | "empty";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nulls: number;
  distinct: number;
  min?: number;
  max?: number;
  mean?: number;
  top?: { value: string; count: number }[];
}

const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Per-column type, null count, distinct count and either numeric stats or the most common values. */
export function profileColumns(columns: string[], rows: Row[]): ColumnProfile[] {
  return columns.map((name) => {
    const values = rows.map((r) => r[name]).filter((v): v is Exclude<Cell, null> => v !== null);
    const nulls = rows.length - values.length;
    const counts = new Map<string, number>();
    for (const v of values) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    const base = { name, nulls, distinct: counts.size };
    if (!values.length) return { ...base, type: "empty" as const };
    if (values.every((v) => typeof v === "number")) {
      const nums = values as number[];
      const sum = nums.reduce((a, b) => a + b, 0);
      return {
        ...base,
        type: "number" as const,
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean: Number((sum / nums.length).toPrecision(6)),
      };
    }
    const top = [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value, count]) => ({ value: value.length > 60 ? value.slice(0, 57) + "…" : value, count }));
    if (values.every((v) => typeof v === "boolean")) return { ...base, type: "boolean" as const, top };
    if (values.every((v) => typeof v === "string" && DATE.test(v))) return { ...base, type: "date" as const, top };
    return { ...base, type: "text" as const, top };
  });
}

/**
 * Rows as text records for embedding, e.g. "Row 3. name: Alice; city: Paris". Records are joined
 * with blank lines so the chunker keeps rows intact.
 */
export function rowsToText(datasetName: string, columns: string[], rows: Row[], startIndex = 1): string {
  const lines = rows.map((row, i) => {
    const fields = columns
      .filter((c) => row[c] !== null && row[c] !== "")
      .map((c) => `${c}: ${String(row[c]).replace(/\s+/g, " ").trim()}`);
    return `${datasetName}, row ${startIndex + i}. ${fields.join("; ")}`;
  });
  return lines.join("\n\n");
}
