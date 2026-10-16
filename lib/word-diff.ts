export type DiffOp = "equal" | "insert" | "delete";

export interface DiffPart {
  op: DiffOp;
  text: string;
}

/** Above this many cells the LCS table is skipped and the changed middle is shown as one replace. */
const MAX_CELLS = 4_000_000;

/** Splits text into words and the whitespace between them, so joining the tokens gives the text back. */
export function tokenize(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

function push(parts: DiffPart[], op: DiffOp, text: string) {
  if (!text) return;
  const last = parts[parts.length - 1];
  if (last?.op === op) last.text += text;
  else parts.push({ op, text });
}

/**
 * Word-level diff of `a` → `b` from a longest common subsequence of tokens.
 * Deletions come before insertions at each change, and adjacent parts of the same kind are merged.
 */
export function diffWords(a: string, b: string): DiffPart[] {
  const x = tokenize(a);
  const y = tokenize(b);
  const parts: DiffPart[] = [];

  // The common prefix and suffix need no table.
  let start = 0;
  while (start < x.length && start < y.length && x[start] === y[start]) start++;
  let endX = x.length;
  let endY = y.length;
  while (endX > start && endY > start && x[endX - 1] === y[endY - 1]) {
    endX--;
    endY--;
  }
  push(parts, "equal", x.slice(0, start).join(""));

  const n = endX - start;
  const m = endY - start;
  if (n === 0 || m === 0 || (n + 1) * (m + 1) > MAX_CELLS) {
    push(parts, "delete", x.slice(start, endX).join(""));
    push(parts, "insert", y.slice(start, endY).join(""));
  } else {
    // lcs[i][j] = LCS length of x[start+i..endX) and y[start+j..endY), stored row-major.
    const w = m + 1;
    const lcs = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * w + j] = x[start + i] === y[start + j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    let del = "";
    let ins = "";
    const flush = () => {
      push(parts, "delete", del);
      push(parts, "insert", ins);
      del = ins = "";
    };
    while (i < n && j < m) {
      if (x[start + i] === y[start + j]) {
        flush();
        push(parts, "equal", x[start + i]);
        i++;
        j++;
      } else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) {
        del += x[start + i++];
      } else {
        ins += y[start + j++];
      }
    }
    del += x.slice(start + i, endX).join("");
    ins += y.slice(start + j, endY).join("");
    flush();
  }

  push(parts, "equal", x.slice(endX).join(""));
  return parts;
}

/** Counts the words (not whitespace) that each side changed. */
export function diffStats(parts: DiffPart[]): {
  inserted: number;
  deleted: number;
} {
  const words = (s: string) => tokenize(s).filter((t) => /\S/.test(t)).length;
  let inserted = 0;
  let deleted = 0;
  for (const p of parts) {
    if (p.op === "insert") inserted += words(p.text);
    else if (p.op === "delete") deleted += words(p.text);
  }
  return { inserted, deleted };
}
