import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { withUser, parseBody } from "@/lib/api";
import { checkOutboundUrl } from "@/lib/url-guard";
import { serverHeaders } from "@/lib/mcp";
import type { McpServer } from "@/lib/schema";

export const serverInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().max(500),
  transport: z.enum(["http", "sse"]).default("http"),
  headers: z.record(z.string().max(100), z.string().max(4000)).optional(),
  enabled: z.boolean().optional(),
  approval: z.enum(["never", "readonly", "always"]).optional(),
  disabledTools: z.array(z.string().max(200)).max(500).optional(),
  registryName: z.string().max(200).optional().nullable(),
});

// Header values (API keys) never leave the server; the client sees only the header names.
export const toPublicServer = (s: McpServer) => {
  const { headers, ...rest } = s;
  return { ...rest, headerNames: Object.keys(serverHeaders({ headers })) };
};

export const GET = withUser(async (_req, user) => {
  const servers = await db.query.mcpServers.findMany({
    where: eq(schema.mcpServers.userId, user.id),
    orderBy: [asc(schema.mcpServers.createdAt)],
  });
  return NextResponse.json(servers.map(toPublicServer));
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, serverInputSchema);
  if (error) return error;
  const problem = await checkOutboundUrl(data.url);
  if (problem) return NextResponse.json({ error: `URL: ${problem}` }, { status: 400 });

  const { headers, ...rest } = data;
  const [server] = await db
    .insert(schema.mcpServers)
    .values({
      ...rest,
      userId: user.id,
      headers: headers && Object.keys(headers).length ? encrypt(JSON.stringify(headers)) : null,
    })
    .returning();
  return NextResponse.json(toPublicServer(server), { status: 201 });
});
