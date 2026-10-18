import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser } from "@/lib/api";
import { recentUploads } from "@/lib/turn-context";

/**
 * Everything the chat composer's "/" and "@" pickers list for the signed-in user: enabled
 * commands and skills (with the plugin each came from), chat folders, knowledge bases, enabled
 * MCP servers and recently attached uploads.
 */
export const GET = withUser(async (_req, user) => {
  const [plugins, commands, skills, folders, knowledgeBases, mcpServers, uploads] = await Promise.all([
    db.query.plugins.findMany({
      where: and(eq(schema.plugins.userId, user.id), eq(schema.plugins.enabled, true)),
      columns: { id: true, name: true },
      orderBy: [asc(schema.plugins.name)],
    }),
    db.query.commands.findMany({
      where: and(eq(schema.commands.userId, user.id), eq(schema.commands.enabled, true)),
      columns: { id: true, name: true, description: true, argumentHint: true, prompt: true, pluginId: true },
      orderBy: [asc(schema.commands.name)],
    }),
    db.query.skills.findMany({
      where: and(eq(schema.skills.userId, user.id), eq(schema.skills.enabled, true)),
      columns: { id: true, name: true, description: true, pluginId: true },
      orderBy: [asc(schema.skills.name)],
    }),
    db.query.chatFolders.findMany({
      where: eq(schema.chatFolders.userId, user.id),
      columns: { id: true, name: true },
      orderBy: [asc(schema.chatFolders.name)],
    }),
    db.query.knowledgeBases.findMany({
      where: eq(schema.knowledgeBases.userId, user.id),
      columns: { id: true, name: true, description: true },
      orderBy: [asc(schema.knowledgeBases.name)],
    }),
    db.query.mcpServers.findMany({
      where: and(eq(schema.mcpServers.userId, user.id), eq(schema.mcpServers.enabled, true)),
      columns: { id: true, name: true, description: true },
      orderBy: [asc(schema.mcpServers.name)],
    }),
    recentUploads(user.id),
  ]);
  return NextResponse.json({ plugins, commands, skills, folders, knowledgeBases, mcpServers, uploads });
});
