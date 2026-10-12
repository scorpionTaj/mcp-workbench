import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

const { agents } = schema;

/** Built-in agents, the user's own, and ones other users shared publicly. */
export const visibleTo = (userId: string) =>
  or(isNull(agents.userId), eq(agents.userId, userId), eq(agents.isPublic, true));

export const ownedBy = (userId: string, id: string) => and(eq(agents.id, id), eq(agents.userId, userId));

export async function visibleAgent(userId: string, id: string) {
  return db.query.agents.findFirst({ where: and(eq(agents.id, id), visibleTo(userId)) });
}

export const agentInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  category: z.string().trim().min(1).max(40).default("general"),
  icon: z.string().max(16).optional().nullable(),
  systemPrompt: z.string().trim().min(1).max(20_000),
  provider: z.string().max(50).optional().nullable(),
  modelId: z.string().max(200).optional().nullable(),
  temperature: z.number().min(0).max(2).optional().nullable(),
  maxSteps: z.number().int().min(1).max(50).default(8),
  toolServerIds: z.array(z.string()).max(50).default([]),
  skillIds: z.array(z.string()).max(100).default([]),
  starterPrompts: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
  isPublic: z.boolean().default(false),
});

/** Agents can only reference MCP servers the author owns. */
export async function ownServerIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: schema.mcpServers.id })
    .from(schema.mcpServers)
    .where(and(eq(schema.mcpServers.userId, userId), inArray(schema.mcpServers.id, ids)));
  return rows.map((r) => r.id);
}

/** Agents can only reference the author's own skills. */
export async function ownSkillIds(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: schema.skills.id })
    .from(schema.skills)
    .where(and(eq(schema.skills.userId, userId), inArray(schema.skills.id, ids)));
  return rows.map((r) => r.id);
}

/** System prompt for a chat: the agent's instructions first, then the chat's own additions. */
export function composeSystemPrompt(agentPrompt: string | null | undefined, chatPrompt: string | null | undefined) {
  return [agentPrompt, chatPrompt].map((p) => p?.trim()).filter(Boolean).join("\n\n") || undefined;
}
