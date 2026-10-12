import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { installPlugin, loadPlugin } from "@/lib/plugins";

export const maxDuration = 60;

const sourceSchema = z.union([
  z.object({ url: z.string().min(3).max(500) }),
  z.object({ marketplaceUrl: z.string().min(3).max(500), name: z.string().min(1).max(200) }),
]);

const countOf = (table: typeof schema.skills | typeof schema.commands | typeof schema.agents | typeof schema.mcpServers) =>
  sql<number>`(select count(*)::int from ${table} where ${table.pluginId} = "plugins"."id")`;

export const GET = withUser(async (_req, user) => {
  const plugins = await db.query.plugins.findMany({
    where: eq(schema.plugins.userId, user.id),
    orderBy: [asc(schema.plugins.name)],
    extras: {
      skillCount: countOf(schema.skills).as("skillCount"),
      commandCount: countOf(schema.commands).as("commandCount"),
      agentCount: countOf(schema.agents).as("agentCount"),
      serverCount: countOf(schema.mcpServers).as("serverCount"),
    },
  });
  return NextResponse.json(plugins);
});

/**
 * { source, preview: true } → what the plugin contains, nothing saved (shown for review).
 * { source, secrets } → installs it; secrets fill ${VAR} placeholders in MCP server headers.
 */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(
    req,
    z.object({
      source: sourceSchema,
      preview: z.boolean().optional(),
      secrets: z.record(z.string().max(100), z.string().max(4000)).default({}),
    }),
  );
  if (error) return error;
  try {
    if (data.preview) {
      const { bundle } = await loadPlugin(data.source);
      return NextResponse.json({
        manifest: bundle.manifest,
        skills: bundle.skills.map((s) => ({ name: s.name, description: s.description, files: Object.keys(s.resources).length })),
        agents: bundle.agents.map((a) => ({ name: a.name, description: a.description })),
        commands: bundle.commands.map((c) => ({ name: c.name, description: c.description })),
        mcpServers: bundle.mcpServers.map((m) => ({ name: m.name, url: m.url, missingSecrets: m.missingSecrets })),
        warnings: bundle.warnings,
      });
    }
    return NextResponse.json(await installPlugin(user.id, data.source, data.secrets), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Install failed" }, { status: 400 });
  }
});
