import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withUser } from "@/lib/api";
import { usageByDay, usageByModel, usageScope, usageTotals } from "@/lib/analytics";

const num = (v: unknown) => Number(v ?? 0);

/** Usage over the last N days from stored chats: totals, per day, per model (with cost), per agent, per tool. */
export const GET = withUser(async (req, user) => {
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 365);
  const since = sql`now() - make_interval(days => ${days})`;
  const mine = usageScope(user.id, since);

  const [totals, daily, models] = await Promise.all([
    usageTotals(mine),
    usageByDay(mine),
    usageByModel(mine, 12),
  ]);

  const agents = await db.execute(sql`
    select a.name, a.icon, count(distinct c.id) as chats, count(*) filter (where m.role = 'assistant') as replies
    from "Message" m join "Chat" c on c.id = m."chatId" join "Agent" a on a.id = c."agentId"
    where ${mine} group by a.id, a.name, a.icon order by 3 desc limit 10`);

  // Tool parts are "tool-<name>" (static) or "dynamic-tool" with a toolName (MCP).
  const tools = await db.execute(sql`
    select coalesce(p->>'toolName', substring(p->>'type' from 6)) as name,
           count(*) as calls,
           count(*) filter (where p->>'state' = 'output-error') as errors,
           count(*) filter (where p->>'state' = 'output-denied') as denied
    from "Message" m join "Chat" c on c.id = m."chatId", jsonb_array_elements(coalesce(m.parts, '[]'::jsonb)) p
    where ${mine} and (p->>'type' like 'tool-%' or p->>'type' = 'dynamic-tool')
    group by 1 order by 2 desc limit 15`);

  return NextResponse.json({
    days,
    totals,
    daily,
    models,
    agents: agents.map((a) => ({ name: String(a.name), icon: a.icon ? String(a.icon) : null, chats: num(a.chats), replies: num(a.replies) })),
    tools: tools.map((t) => ({ name: String(t.name), calls: num(t.calls), errors: num(t.errors), denied: num(t.denied) })),
  });
});
