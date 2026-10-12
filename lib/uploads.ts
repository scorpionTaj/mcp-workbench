import path from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// The stored extension comes from this server-side map, never from the client's
// filename, so nothing a browser would execute (html, svg, js) is served from our origin.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
};

export const ALLOWED_UPLOAD_TYPES = Object.keys(EXT_BY_MIME);

export function newUploadName(ext: string): string {
  return `${Date.now()}-${randomUUID()}.${ext}`;
}

export function uploadNameForMime(mime: string): string | null {
  const ext = EXT_BY_MIME[mime];
  return ext ? newUploadName(ext) : null;
}

/** Maps a public "/uploads/<file>" URL to its path on disk, rejecting anything that escapes UPLOAD_DIR. */
export function resolveUploadUrl(url: string): string {
  const name = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
  if (!name || name.startsWith(".") || name !== path.basename(name)) {
    throw new Error("Invalid upload path");
  }
  return path.join(UPLOAD_DIR, name);
}
