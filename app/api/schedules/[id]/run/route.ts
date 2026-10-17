import { NextResponse, after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { runSchedule, STALE_RUN_MS } from "@/lib/schedules";
import { notifyScheduleRun } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/** "Run now": runs the schedule immediately without changing when it next runs on its own. */
export const POST = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const owns = and(eq(schema.agentSchedules.id, id), eq(schema.agentSchedules.userId, user.id));
  const s = await db.query.agentSchedules.findFirst({ where: owns });
  if (!s) return notFound();
  const stale = !s.lastRunAt || Date.now() - +s.lastRunAt > STALE_RUN_MS;
  if (s.lastStatus === "running" && !stale) return NextResponse.json({ error: "A run is already in progress" }, { status: 409 });

  await db.update(schema.agentSchedules).set({ lastStatus: "running", lastRunAt: new Date(), lastError: null }).where(owns);
  const result = await runSchedule(s);
  const [row] = await db
    .update(schema.agentSchedules)
    .set({
      lastStatus: result.error ? "error" : "ok",
      lastError: result.error ?? null,
      lastChatId: result.chatId ?? s.lastChatId,
      runCount: s.runCount + 1,
    })
    .where(owns)
    .returning();
  // Notify like a scheduled run would (it's also how people test their webhook or email),
  // after the response so a slow webhook or mail server doesn't hold it up.
  after(() => notifyScheduleRun(s, result));
  return NextResponse.json({ ...row, chatId: result.chatId, error: result.error }, { status: result.error ? 502 : 200 });
});
