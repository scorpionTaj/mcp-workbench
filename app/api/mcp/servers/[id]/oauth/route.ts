import { NextResponse } from "next/server";
import { auth } from "@ai-sdk/mcp";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { checkOutboundUrl } from "@/lib/url-guard";
import { DbOAuthProvider } from "@/lib/mcp-oauth";
import logger from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

const ownedServer = async (userId: string, id: string) =>
  db.query.mcpServers.findFirst({
    where: and(eq(schema.mcpServers.id, id), eq(schema.mcpServers.userId, userId)),
  });

/** Starts sign-in: returns the authorization URL to open, or reports it's already connected. */
export const POST = withUser<Ctx>(async (_req, user, { params }) => {
  const server = await ownedServer(user.id, (await params).id);
  if (!server) return notFound();
  if (server.authType !== "oauth") return NextResponse.json({ error: "This server doesn't use OAuth" }, { status: 400 });
  const problem = await checkOutboundUrl(server.url);
  if (problem) return NextResponse.json({ error: `URL: ${problem}` }, { status: 400 });

  const provider = await DbOAuthProvider.load(server.id);
  // A fresh sign-in also refreshes the dynamic client registration (see forgetDynamicClient).
  if (!provider.connected) await provider.forgetDynamicClient();
  try {
    const result = await auth(provider, { serverUrl: server.url });
    if (result === "AUTHORIZED") return NextResponse.json({ connected: true });
    if (!provider.authorizationUrl) throw new Error("The server did not provide a sign-in page");
    return NextResponse.json({ authorizeUrl: provider.authorizationUrl.toString() });
  } catch (err) {
    logger.warn({ err, serverId: server.id }, "MCP OAuth start failed");
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sign-in failed" }, { status: 502 });
  }
});

/** Signs out: forgets the tokens (the client registration is kept for next time). */
export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const server = await ownedServer(user.id, (await params).id);
  if (!server) return notFound();
  await (await DbOAuthProvider.load(server.id)).invalidateCredentials("tokens");
  return NextResponse.json({ success: true });
});
