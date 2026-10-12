import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { withUser, notFound } from "@/lib/api";
import { canReadUpload } from "@/lib/upload-access";
import { MIME_BY_EXT, resolveUploadUrl } from "@/lib/uploads";

/** Serves an uploaded file to its owner only. */
export const GET = withUser<{ params: Promise<{ name: string }> }>(async (_req, user, { params }) => {
  const url = `/uploads/${(await params).name}`;
  if (!(await canReadUpload(user.id, url))) return notFound();
  let data: Buffer;
  try {
    data = await readFile(resolveUploadUrl(url));
  } catch {
    return notFound();
  }
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
