import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { addDocument, extractText, fetchUrl, KnowledgeError, KNOWLEDGE_LIMITS, processDocument } from "@/lib/knowledge";

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const jsonSchema = z.union([
  z.object({ url: z.string().url().max(2000) }),
  z.object({ name: z.string().trim().min(1).max(300), text: z.string().min(1).max(KNOWLEDGE_LIMITS.textChars) }),
]);

/**
 * Adds documents: multipart `files`, or JSON { url } / { name, text }. Responds once the text is
 * extracted; chunking and embedding continue in the background (status "processing" → "ready").
 */
export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const kb = await db.query.knowledgeBases.findFirst({
    where: and(eq(schema.knowledgeBases.id, (await params).id), eq(schema.knowledgeBases.userId, user.id)),
  });
  if (!kb) return notFound();

  const sources: { name: string; text: string; mime: string; sourceUrl?: string }[] = [];
  const errors: string[] = [];
  try {
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File);
      if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });
      if (files.length > 20) return NextResponse.json({ error: "Upload at most 20 files at a time" }, { status: 400 });
      for (const file of files) {
        if (file.size > KNOWLEDGE_LIMITS.fileBytes) {
          errors.push(`${file.name}: larger than 20 MB`);
          continue;
        }
        try {
          sources.push({ name: file.name, ...(await extractText(file.name, new Uint8Array(await file.arrayBuffer()))) });
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "could not read"}`);
        }
      }
    } else {
      const parsed = jsonSchema.safeParse(await req.json().catch(() => null));
      if (!parsed.success) return NextResponse.json({ error: "Send files, { url } or { name, text }" }, { status: 400 });
      const body = parsed.data;
      sources.push("url" in body ? { ...(await fetchUrl(body.url)), sourceUrl: body.url } : { ...body, mime: "text/plain" });
    }
  } catch (err) {
    if (err instanceof KnowledgeError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof Error && /fetch|abort|timeout/i.test(err.message)) {
      // undici puts the real reason (DNS, refused, TLS) in `cause`.
      const cause = err.cause instanceof Error ? `: ${err.cause.message}` : "";
      return NextResponse.json({ error: `Could not fetch the URL (${err.message}${cause})` }, { status: 400 });
    }
    throw err;
  }

  const documents = [];
  for (const source of sources) {
    try {
      const { doc, text } = await addDocument(kb, source);
      documents.push(doc);
      after(() => processDocument(user, kb, doc.id, text));
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }
  if (!documents.length) return NextResponse.json({ error: errors.join("; ") || "Nothing to add" }, { status: 400 });
  return NextResponse.json({ documents, errors }, { status: 201 });
});
