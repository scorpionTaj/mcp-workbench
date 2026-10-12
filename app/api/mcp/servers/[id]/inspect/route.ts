import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { connectServer, McpAuthRequiredError } from "@/lib/mcp";

export const dynamic = "force-dynamic";

const settled = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

/** Lists a server's tools, resources and prompts (each optional per the MCP spec). */
export const GET = withUser<{ params: Promise<{ id: string }> }>(async (_req, user, { params }) => {
  const { id } = await params;
  const server = await db.query.mcpServers.findFirst({
    where: and(eq(schema.mcpServers.id, id), eq(schema.mcpServers.userId, user.id)),
  });
  if (!server) return notFound();

  let client;
  try {
    client = await connectServer(server);
  } catch (err) {
    const needsAuth = err instanceof McpAuthRequiredError;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not connect", needsAuth },
      // Not 401: that status means "app session expired" to the client and redirects to sign-in.
      { status: needsAuth ? 403 : 502 },
    );
  }
  try {
    const [tools, resources, templates, prompts] = await Promise.allSettled([
      client.listTools(),
      client.listResources(),
      client.listResourceTemplates(),
      client.experimental_listPrompts(),
    ]);
    return NextResponse.json({
      serverInfo: client.serverInfo,
      instructions: client.instructions ?? null,
      tools: settled(tools)?.tools ?? [],
      resources: settled(resources)?.resources ?? [],
      resourceTemplates: settled(templates)?.resourceTemplates ?? [],
      prompts: settled(prompts)?.prompts ?? [],
    });
  } finally {
    await client.close();
  }
});
