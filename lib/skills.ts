import { tool, type ToolSet } from "ai";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

/**
 * Progressive disclosure: the system prompt only lists each skill's name and description;
 * the model calls load_skill / read_skill_file to pull the full text when it needs it.
 */
export async function loadChatSkills(userId: string, onlyIds: string[] = []) {
  const skills = await db.query.skills.findMany({
    where: and(
      eq(schema.skills.userId, userId),
      eq(schema.skills.enabled, true),
      ...(onlyIds.length ? [inArray(schema.skills.id, onlyIds)] : []),
    ),
    orderBy: [asc(schema.skills.name)],
    columns: { name: true, description: true },
  });
  if (!skills.length) return { system: undefined, tools: {} as ToolSet };

  const names = skills.map((s) => s.name);
  const find = (name: string) =>
    db.query.skills.findFirst({
      where: and(eq(schema.skills.userId, userId), eq(schema.skills.enabled, true), eq(schema.skills.name, name)),
    });

  const tools: ToolSet = {
    load_skill: tool({
      description: "Load the full instructions of one of the available skills before doing a task it covers.",
      inputSchema: z.object({ name: z.enum(names as [string, ...string[]]) }),
      execute: async ({ name }) => {
        const skill = await find(name);
        if (!skill) return { error: `No skill named ${name}` };
        return { name, instructions: skill.instructions, files: Object.keys(skill.resources) };
      },
    }),
    read_skill_file: tool({
      description: "Read a supporting file that a loaded skill refers to.",
      inputSchema: z.object({ name: z.enum(names as [string, ...string[]]), path: z.string() }),
      execute: async ({ name, path }) => {
        const skill = await find(name);
        const text = skill?.resources[path.replace(/^\.\//, "")];
        return text === undefined ? { error: `No file ${path} in skill ${name}` } : { path, content: text };
      },
    }),
  };

  const system = [
    "You have these skills. When a request matches one, call load_skill with its name first and follow its instructions:",
    ...skills.map((s) => `- ${s.name}: ${s.description}`),
  ].join("\n");
  return { system, tools };
}
