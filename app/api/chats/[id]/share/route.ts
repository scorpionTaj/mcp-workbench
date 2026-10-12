import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema, ownedChat } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { newShareId } from "@/lib/chat-share";

type Ctx = { params: Promise<{ id: string }> };

/** Turn on the read-only link (or return the existing one). */
export const POST = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const chat = await ownedChat(user.id, id);
  if (!chat) return notFound();
  if (chat.shareId) return NextResponse.json({ shareId: chat.shareId, sharedAt: chat.sharedAt });
  const [row] = await db
    .update(schema.chats)
    .set({ shareId: newShareId(), sharedAt: new Date() })
    .where(and(eq(schema.chats.id, id), eq(schema.chats.userId, user.id)))
    .returning({ shareId: schema.chats.shareId, sharedAt: schema.chats.sharedAt });
  return NextResponse.json(row);
});

/** Revoke: the old link stops working immediately; sharing again makes a new one. */
export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const rows = await db
    .update(schema.chats)
    .set({ shareId: null, sharedAt: null })
    .where(and(eq(schema.chats.id, id), eq(schema.chats.userId, user.id)))
    .returning({ id: schema.chats.id });
  if (!rows.length) return notFound();
  return NextResponse.json({ success: true });
});
