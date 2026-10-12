// Pure text helpers for RAG: no network or DB, so they are unit-tested directly.

export interface Chunk {
  position: number;
  content: string;
}

// Split on the largest boundary that fits: paragraphs, then lines, sentences, words.
const SEPARATORS = ["\n\n", "\n", ". ", " "];

function split(text: string, size: number, seps: string[]): string[] {
  if (text.length <= size) return [text];
  const [sep, ...rest] = seps;
  if (sep === undefined) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }
  const pieces = text.split(sep).map((p, i, all) => (i < all.length - 1 ? p + sep : p));
  return pieces.flatMap((p) => (p.length > size ? split(p, size, rest) : [p]));
}

/**
 * Recursive character splitter: packs paragraph/line/sentence pieces into chunks of at most
 * `size` characters, carrying the last `overlap` characters of each chunk into the next.
 */
export function chunkText(text: string, size = 1000, overlap = 150): Chunk[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  overlap = Math.max(0, Math.min(overlap, Math.floor(size / 2)));

  const chunks: string[] = [];
  let current = "";
  for (const piece of split(clean, size - overlap, SEPARATORS)) {
    if (current && current.length + piece.length > size) {
      chunks.push(current.trim());
      // Start the next chunk with the tail of this one, cut at a word boundary.
      const tail = current.slice(-overlap);
      current = overlap ? tail.slice(tail.indexOf(" ") + 1) : "";
    }
    current += piece;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean).map((content, position) => ({ position, content }));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Readable text from an HTML page: drops scripts/styles/nav chrome, keeps block structure. */
export function htmlToText(html: string): { title: string | null; text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() || null;
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const text = body
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6]|pre|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title: title && htmlToText(title).text, text };
}

/**
 * Reciprocal rank fusion: merges ranked id lists (e.g. vector and keyword search) into one.
 * Items found by several searches rise; k=60 is the usual damping constant.
 */
export function reciprocalRankFusion(lists: string[][], k = 60): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1)));
  }
  return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}

/**
 * A Postgres to_tsquery string that matches ANY of the query's words ("a | b | c"), so natural
 * questions still hit; ts_rank then favours chunks matching more of them. Null when no words.
 */
export function keywordQuery(query: string): string | null {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].slice(0, 32);
  return words.length ? words.join(" | ") : null;
}
