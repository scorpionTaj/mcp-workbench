import path from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Uploads live outside public/ so they are only served through the authenticated /uploads route.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
// Files from before uploads were private; still readable (by their owner) until moved.
export const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

/** Served Content-Type per stored extension (anything else is a download). */
export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
};

const ownerTag = (userId: string) => userId.replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "anon";

/** "<owner>_<time>-<uuid>.<ext>": the owner prefix lets the server check access without a lookup. */
export function newUploadName(ext: string, userId: string): string {
  return `${ownerTag(userId)}_${Date.now()}-${randomUUID()}.${ext}`;
}

export function uploadNameForMime(mime: string, userId: string): string | null {
  const ext = EXT_BY_MIME[mime];
  return ext ? newUploadName(ext, userId) : null;
}

/** The file name of an "/uploads/<file>" URL, or throws if it could escape the uploads dir. */
export function uploadName(url: string): string {
  const name = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
  if (!name || name.startsWith(".") || name !== path.basename(name) || name.includes("\\")) {
    throw new Error("Invalid upload path");
  }
  return name;
}

/** True when the file was uploaded by this user (new-style, owner-prefixed name). */
export function isOwnUpload(url: string, userId: string): boolean {
  try {
    return uploadName(url).startsWith(`${ownerTag(userId)}_`);
  } catch {
    return false;
  }
}

/** Maps a "/uploads/<file>" URL to its path on disk, rejecting anything that escapes the uploads dir. */
export function resolveUploadUrl(url: string): string {
  const name = uploadName(url);
  const current = path.join(UPLOAD_DIR, name);
  if (existsSync(current)) return current;
  const legacy = path.join(LEGACY_UPLOAD_DIR, name);
  return existsSync(legacy) ? legacy : current;
}
