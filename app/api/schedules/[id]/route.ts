import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { patchSchema } from "@/lib/patch-schema";
import { visibleAgent } from "@/lib/agents";
import { planSchedule, scheduleSchema, webhookColumn, withUpcoming } from "@/lib/schedules";

type Ctx = { params: Promise<{ id: string }> };

const owns = (userId: string, id: string) =>
  and(eq(schema.agentSchedules.id, id), eq(schema.agentSchedules.userId, userId));

const updateSchema = patchSchema(scheduleSchema);

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;
  const current = await db.query.agentSchedules.findFirst({ where: owns(user.id, id) });
  if (!current) return notFound();
  if (data.agentId && !(await visibleAgent(user.id, data.agentId))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const next = { ...current, ...data };
  if (!next.provider !== !next.modelId) {
    return NextResponse.json({ error: "Set both provider and model, or neither to use the agent's" }, { status: 400 });
  }
  const plan = planSchedule(next.cron, next.timezone);
  if ("error" in plan) return NextResponse.json({ error: plan.error }, { status: 400 });
  const { notifyWebhookUrl, ...fields } = data;
  const webhook = await webhookColumn(notifyWebhookUrl);
  if ("error" in webhook) return NextResponse.json({ error: webhook.error }, { status: 400 });
  const [row] = await db
    .update(schema.agentSchedules)
    .set({ ...fields, ...webhook, nextRunAt: next.enabled ? plan.next : null })
    .where(owns(user.id, id))
    .returning();
  return NextResponse.json(withUpcoming(row));
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const rows = await db.delete(schema.agentSchedules).where(owns(user.id, id)).returning({ id: schema.agentSchedules.id });
  if (!rows.length) return notFound();
  return NextResponse.json({ success: true });
});
