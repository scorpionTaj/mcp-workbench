import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { searchKnowledge } from "@/lib/knowledge";

/** Search playground: the same hybrid retrieval the chat's search_knowledge tool uses. */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(
    req,
    z.object({
      knowledgeBaseIds: z.array(z.string()).min(1).max(20),
      query: z.string().trim().min(1).max(2000),
      limit: z.number().int().min(1).max(30).default(8),
    }),
  );
  if (error) return error;
  const started = Date.now();
  try {
    const hits = await searchKnowledge(user.id, data.knowledgeBaseIds, data.query, data.limit);
    return NextResponse.json({ hits, ms: Date.now() - started });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 400 });
  }
});
