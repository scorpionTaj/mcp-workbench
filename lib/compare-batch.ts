// Pure helpers for batch runs on the Compare page: prompt list parsing, a concurrency pool, CSV export.
import { parseCsv } from "./tabular";

export const MAX_BATCH_PROMPTS = 100;
export const MAX_PROMPT_CHARS = 20_000;

export interface ParsedPrompts {
  prompts: string[];
  /** Why some or all input was not used, for the UI to show. */
  warning?: string;
}

/**
 * Reads a prompt list: a CSV/TSV whose header has a `prompt` column (any case), or else one prompt
 * per non-blank line. A `.csv`/`.tsv` file name forces CSV parsing. Empty prompts are dropped and
 * the list is cut at MAX_BATCH_PROMPTS.
 */
export function parseBatchPrompts(text: string, fileName?: string): ParsedPrompts {
  const src = text.replace(/^﻿/, "");
  const forceCsv = /\.(csv|tsv)$/i.test(fileName ?? "");
  const table = parseCsv(src, /\.tsv$/i.test(fileName ?? "") ? "\t" : undefined);
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  const col = header.indexOf("prompt");

  let prompts: string[];
  if (col >= 0) {
    prompts = table.slice(1).map((r) => (r[col] ?? "").trim());
  } else if (forceCsv) {
    return {
      prompts: [],
      warning: 'The CSV needs a header row with a "prompt" column.',
    };
  } else {
    prompts = src.split(/\r?\n/).map((l) => l.trim());
  }
  prompts = prompts.filter(Boolean);

  const warnings: string[] = [];
  const tooLong = prompts.filter((p) => p.length > MAX_PROMPT_CHARS).length;
  if (tooLong) {
    prompts = prompts.filter((p) => p.length <= MAX_PROMPT_CHARS);
    warnings.push(`Skipped ${tooLong} prompt(s) over ${MAX_PROMPT_CHARS.toLocaleString("en-US")} characters.`);
  }
  if (prompts.length > MAX_BATCH_PROMPTS) {
    warnings.push(`Only the first ${MAX_BATCH_PROMPTS} of ${prompts.length} prompts are used.`);
    prompts = prompts.slice(0, MAX_BATCH_PROMPTS);
  }
  return { prompts, ...(warnings.length && { warning: warnings.join(" ") }) };
}

/**
 * Runs `task` for every item with at most `limit` running at once, in order of the list.
 * Stops starting new items once `signal` aborts; running ones are left to the task to cancel.
 */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      await task(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

/** One CSV field, quoted when it holds a delimiter, quote or newline (RFC 4180). */
export function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}
