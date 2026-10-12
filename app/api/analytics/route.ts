import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { withUser } from "@/lib/api";

const num = (v: unknown) => Number(v ?? 0);

/** Usage over the last N days from stored chats: totals, per day, per model, per agent, per tool. */
export const GET = withUser(async (req, user) => {
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 365);
  const since = sql`now() - make_interval(days => ${days})`;
  const mine = sql`c."userId" = ${user.id} and m."createdAt" >= ${since}`;

  const [totals] = await db.execute(sql`
    select count(distinct c.id) as chats,
           count(*) filter (where m.role = 'user') as prompts,
           count(*) filter (where m.role = 'assistant') as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn",
           coalesce(sum(m."tokensOut"), 0) as "tokensOut"
    from "Message" m join "Chat" c on c.id = m."chatId" where ${mine}`);

  const daily = await db.execute(sql`
    select to_char(date_trunc('day', m."createdAt"), 'YYYY-MM-DD') as day,
           count(*) filter (where m.role = 'assistant') as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn",
           coalesce(sum(m."tokensOut"), 0) as "tokensOut"
    from "Message" m join "Chat" c on c.id = m."chatId" where ${mine}
    group by 1 order by 1`);

  const models = await db.execute(sql`
    select m.provider, m."modelId", count(*) as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn", coalesce(sum(m."tokensOut"), 0) as "tokensOut"
    from "Message" m join "Chat" c on c.id = m."chatId"
    where ${mine} and m.role = 'assistant' and m."modelId" is not null
    group by 1, 2 order by sum(coalesce(m."tokensIn", 0) + coalesce(m."tokensOut", 0)) desc, count(*) desc limit 12`);

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
    totals: {
      chats: num(totals?.chats),
      prompts: num(totals?.prompts),
      replies: num(totals?.replies),
      tokensIn: num(totals?.tokensIn),
      tokensOut: num(totals?.tokensOut),
    },
    daily: daily.map((d) => ({ day: String(d.day), replies: num(d.replies), tokensIn: num(d.tokensIn), tokensOut: num(d.tokensOut) })),
    models: models.map((m) => ({
      provider: String(m.provider ?? ""),
      modelId: String(m.modelId),
      replies: num(m.replies),
      tokensIn: num(m.tokensIn),
      tokensOut: num(m.tokensOut),
    })),
    agents: agents.map((a) => ({ name: String(a.name), icon: a.icon ? String(a.icon) : null, chats: num(a.chats), replies: num(a.replies) })),
    tools: tools.map((t) => ({ name: String(t.name), calls: num(t.calls), errors: num(t.errors), denied: num(t.denied) })),
  });
});
