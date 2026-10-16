import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import type { UsageDay, UsageModel } from "@/lib/analytics-csv";

const num = (v: unknown) => Number(v ?? 0);
const usd = (v: unknown) => (v == null ? null : Number(v));

// Cost is stored per assistant reply in its metadata (lib/chat-turn.ts); older replies have none.
const cost = sql`(m.metadata->>'costUsd')::float8`;
const unpriced = sql`count(*) filter (where m.role = 'assistant' and ${cost} is null)`;

/** Messages in a user's chats created in [since, until). */
export function usageScope(userId: string, since: SQL | Date, until?: Date): SQL {
  return sql`c."userId" = ${userId} and m."createdAt" >= ${since}${until ? sql` and m."createdAt" < ${until}` : sql``}`;
}

export async function usageTotals(scope: SQL) {
  const [t] = await db.execute(sql`
    select count(distinct c.id) as chats,
           count(*) filter (where m.role = 'user') as prompts,
           count(*) filter (where m.role = 'assistant') as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn",
           coalesce(sum(m."tokensOut"), 0) as "tokensOut",
           sum(${cost}) as "costUsd",
           ${unpriced} as "unpricedReplies"
    from "Message" m join "Chat" c on c.id = m."chatId" where ${scope}`);
  return {
    chats: num(t?.chats),
    prompts: num(t?.prompts),
    replies: num(t?.replies),
    tokensIn: num(t?.tokensIn),
    tokensOut: num(t?.tokensOut),
    costUsd: usd(t?.costUsd),
    unpricedReplies: num(t?.unpricedReplies),
  };
}

export async function usageByDay(scope: SQL): Promise<UsageDay[]> {
  const rows = await db.execute(sql`
    select to_char(date_trunc('day', m."createdAt"), 'YYYY-MM-DD') as day,
           count(*) filter (where m.role = 'assistant') as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn",
           coalesce(sum(m."tokensOut"), 0) as "tokensOut",
           sum(${cost}) as "costUsd",
           ${unpriced} as "unpricedReplies"
    from "Message" m join "Chat" c on c.id = m."chatId" where ${scope}
    group by 1 order by 1`);
  return rows.map((d) => ({
    day: String(d.day),
    replies: num(d.replies),
    tokensIn: num(d.tokensIn),
    tokensOut: num(d.tokensOut),
    costUsd: usd(d.costUsd),
    unpricedReplies: num(d.unpricedReplies),
  }));
}

export async function usageByModel(scope: SQL, limit?: number): Promise<UsageModel[]> {
  const rows = await db.execute(sql`
    select m.provider, m."modelId", count(*) as replies,
           coalesce(sum(m."tokensIn"), 0) as "tokensIn", coalesce(sum(m."tokensOut"), 0) as "tokensOut",
           sum(${cost}) as "costUsd",
           ${unpriced} as "unpricedReplies"
    from "Message" m join "Chat" c on c.id = m."chatId"
    where ${scope} and m.role = 'assistant' and m."modelId" is not null
    group by 1, 2 order by sum(coalesce(m."tokensIn", 0) + coalesce(m."tokensOut", 0)) desc, count(*) desc
    ${limit ? sql`limit ${limit}` : sql``}`);
  return rows.map((m) => ({
    provider: String(m.provider ?? ""),
    modelId: String(m.modelId),
    replies: num(m.replies),
    tokensIn: num(m.tokensIn),
    tokensOut: num(m.tokensOut),
    costUsd: usd(m.costUsd),
    unpricedReplies: num(m.unpricedReplies),
  }));
}
