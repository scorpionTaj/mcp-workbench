import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { setPluginEnabled, updatePlugin } from "@/lib/plugins";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 60;

/** { enabled } toggles the plugin; { update: true } re-fetches it from its source. */
export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, z.object({ enabled: z.boolean().optional(), update: z.literal(true).optional() }));
  if (error) return error;
  try {
    if (data.update) {
      const plugin = await updatePlugin(user.id, id);
      return plugin ? NextResponse.json(plugin) : notFound();
    }
    if (data.enabled !== undefined) {
      const plugin = await setPluginEnabled(user.id, id, data.enabled);
      return plugin ? NextResponse.json(plugin) : notFound();
    }
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
});

/** Uninstalling removes everything the plugin added (FK cascade). */
export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const deleted = await db
    .delete(schema.plugins)
    .where(and(eq(schema.plugins.id, id), eq(schema.plugins.userId, user.id)))
    .returning();
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
