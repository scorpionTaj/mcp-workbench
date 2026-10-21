import { NextResponse } from "next/server";
import { withUser, notFound } from "@/lib/api";
import { canReadUpload } from "@/lib/upload-access";
import { readUpload } from "@/lib/storage";
import { MIME_BY_EXT } from "@/lib/uploads";
import logger from "@/lib/logger";

/** Serves an uploaded file to its owner only, from whichever storage backend holds it. */
export const GET = withUser<{ params: Promise<{ name: string }> }>(async (_req, user, { params }) => {
  const url = `/uploads/${(await params).name}`;
  if (!(await canReadUpload(user.id, url))) return notFound();
  let data: Buffer | null;
  try {
    data = await readUpload(url);
  } catch (err) {
    logger.warn({ err, url }, "Upload read failed");
    return notFound();
  }
  if (!data) return notFound();
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME_BY_EXT[ext];
  const inline = Boolean(type) && !type.startsWith("text/csv") && !type.startsWith("text/tab");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type ?? "application/octet-stream",
      "Content-Disposition": inline ? "inline" : "attachment",
      "Cache-Control": "private, max-age=3600",
      // Never let a served file run script, even if a browser sniffs it as HTML.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
