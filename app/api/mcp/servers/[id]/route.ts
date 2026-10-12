import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { withUser, parseBody, notFound } from "@/lib/api";
import { checkOutboundUrl } from "@/lib/url-guard";
import { patchSchema } from "@/lib/patch-schema";
import { serverInputSchema, toPublicServer } from "../route";

type Ctx = { params: Promise<{ id: string }> };

const owns = (userId: string, id: string) =>
  and(eq(schema.mcpServers.id, id), eq(schema.mcpServers.userId, userId));

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, patchSchema(serverInputSchema));
  if (error) return error;
  if (data.url) {
    const problem = await checkOutboundUrl(data.url);
    if (problem) return NextResponse.json({ error: `URL: ${problem}` }, { status: 400 });
  }

  const { headers, ...rest } = data;
  const [server] = await db
    .update(schema.mcpServers)
    .set({
      ...rest,
      // Omitted headers = keep the stored ones; {} clears them.
      ...(headers !== undefined && {
        headers: Object.keys(headers).length ? encrypt(JSON.stringify(headers)) : null,
      }),
      updatedAt: new Date(),
    })
    .where(owns(user.id, id))
    .returning();
  if (!server) return notFound();
  return NextResponse.json(toPublicServer(server));
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const deleted = await db.delete(schema.mcpServers).where(owns(user.id, id)).returning({ id: schema.mcpServers.id });
  if (!deleted.length) return notFound();
  return NextResponse.json({ success: true });
});
