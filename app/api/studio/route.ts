import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser } from "@/lib/api";

const KINDS = ["image", "transcription", "speech"] as const;

/** GET ?kind= → the user's recent Studio generations, newest first. */
export const GET = withUser(async (req, user) => {
  const kind = new URL(req.url).searchParams.get("kind");
  const rows = await db.query.generations.findMany({
    where: and(
      eq(schema.generations.userId, user.id),
      ...(KINDS.includes(kind as (typeof KINDS)[number]) ? [eq(schema.generations.kind, kind as (typeof KINDS)[number])] : []),
    ),
    orderBy: [desc(schema.generations.createdAt)],
    limit: 60,
  });
  return NextResponse.json(rows);
});
