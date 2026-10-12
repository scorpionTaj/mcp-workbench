import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { connectServer } from "@/lib/mcp";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

const callSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tool"), name: z.string().min(1), args: z.record(z.string(), z.unknown()).default({}) }),
  z.object({ kind: z.literal("resource"), uri: z.string().min(1) }),
  z.object({ kind: z.literal("prompt"), name: z.string().min(1), args: z.record(z.string(), z.unknown()).default({}) }),
]);

/** Inspector: run a tool, read a resource or render a prompt, and report timing. */
export const POST = withUser<{ params: Promise<{ id: string }> }>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, callSchema);
  if (error) return error;
  const server = await db.query.mcpServers.findFirst({
    where: and(eq(schema.mcpServers.id, id), eq(schema.mcpServers.userId, user.id)),
  });
  if (!server) return notFound();

  const started = Date.now();
  let client;
  try {
    client = await connectServer(server);
    const result =
      data.kind === "tool"
        ? await client.callTool({ name: data.name, arguments: data.args })
        : data.kind === "resource"
          ? await client.readResource({ uri: data.uri })
          : await client.experimental_getPrompt({ name: data.name, arguments: data.args });
    return NextResponse.json({ ok: true, durationMs: Date.now() - started, result });
  } catch (err) {
    logger.warn({ err, server: server.name, kind: data.kind }, "MCP inspector call failed");
    return NextResponse.json(
      { ok: false, durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  } finally {
    await client?.close();
  }
});
