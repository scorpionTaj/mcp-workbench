import { NextResponse } from "next/server";
import { asc, count, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser } from "@/lib/api";
import { escapeLike } from "@/lib/chat-organization";

const LIMIT = 200;

/** Admins: every account with its role and chat count, optionally filtered by name or email. */
export const GET = withUser(
  async (req) => {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
    const u = schema.user;
    const rows = await db
      .select({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        chats: count(schema.chats.id),
      })
      .from(u)
      .leftJoin(schema.chats, eq(schema.chats.userId, u.id))
      .where(q ? or(ilike(u.email, `%${escapeLike(q)}%`), ilike(u.name, `%${escapeLike(q)}%`)) : undefined)
      .groupBy(u.id)
      .orderBy(asc(u.createdAt))
      .limit(LIMIT + 1);
    return NextResponse.json({ users: rows.slice(0, LIMIT), truncated: rows.length > LIMIT });
  },
  { admin: true },
);
