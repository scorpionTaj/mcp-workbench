import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { visibleAgent } from "@/lib/agents";
import { planSchedule, scheduleSchema, webhookColumn, withUpcoming } from "@/lib/schedules";

export const GET = withUser(async (_req, user) => {
  const rows = await db.query.agentSchedules.findMany({
    where: eq(schema.agentSchedules.userId, user.id),
    orderBy: [desc(schema.agentSchedules.createdAt)],
    with: { agent: { columns: { id: true, name: true, icon: true } } },
  });
  return NextResponse.json(rows.map(withUpcoming));
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, scheduleSchema);
  if (error) return error;
  if (!(await visibleAgent(user.id, data.agentId))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (!data.provider !== !data.modelId) {
    return NextResponse.json({ error: "Set both provider and model, or neither to use the agent's" }, { status: 400 });
  }
  const plan = planSchedule(data.cron, data.timezone);
  if ("error" in plan) return NextResponse.json({ error: plan.error }, { status: 400 });
  const { notifyWebhookUrl, ...fields } = data;
  const webhook = await webhookColumn(notifyWebhookUrl);
  if ("error" in webhook) return NextResponse.json({ error: webhook.error }, { status: 400 });
  const [row] = await db
    .insert(schema.agentSchedules)
    .values({ ...fields, ...webhook, userId: user.id, nextRunAt: data.enabled ? plan.next : null })
    .returning();
  return NextResponse.json(withUpcoming(row), { status: 201 });
});
