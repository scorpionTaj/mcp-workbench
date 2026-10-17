import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema, ownedChat } from "@/lib/db";
import { withUser, notFound } from "@/lib/api";
import { newShareId } from "@/lib/chat-share";
import { hashSharePassword } from "@/lib/share-password";

type Ctx = { params: Promise<{ id: string }> };

// Omitted fields keep their current value; null removes the expiry or the password.
const shareSchema = z.object({
  expiresAt: z.coerce.date().nullable().optional(),
  password: z.string().min(4).max(200).nullable().optional(),
});

const shareColumns = {
  shareId: schema.chats.shareId,
  sharedAt: schema.chats.sharedAt,
  shareExpiresAt: schema.chats.shareExpiresAt,
  sharePasswordHash: schema.chats.sharePasswordHash,
};

const publicShare = ({ sharePasswordHash, ...row }: { sharePasswordHash: string | null } & Record<string, unknown>) => ({
  ...row,
  sharePassword: sharePasswordHash !== null,
});

/** Turn on the read-only link (or keep the existing one) and set its expiry and password. */
export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  // The body is optional: an empty POST shares with no expiry and no password.
  const parsed = shareSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
  }
  const { expiresAt, password } = parsed.data;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "The expiry must be in the future" }, { status: 400 });
  }
  const chat = await ownedChat(user.id, id);
  if (!chat) return notFound();
  const [row] = await db
    .update(schema.chats)
    .set({
      ...(!chat.shareId && { shareId: newShareId(), sharedAt: new Date() }),
      ...(expiresAt !== undefined && { shareExpiresAt: expiresAt }),
      ...(password !== undefined && { sharePasswordHash: password === null ? null : await hashSharePassword(password) }),
    })
    .where(and(eq(schema.chats.id, id), eq(schema.chats.userId, user.id)))
    .returning(shareColumns);
  return NextResponse.json(publicShare(row));
});

/** Revoke: the old link stops working immediately; sharing again makes a new one. */
export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const rows = await db
    .update(schema.chats)
    .set({ shareId: null, sharedAt: null, shareExpiresAt: null, sharePasswordHash: null })
    .where(and(eq(schema.chats.id, id), eq(schema.chats.userId, user.id)))
    .returning({ id: schema.chats.id });
  if (!rows.length) return notFound();
  return NextResponse.json({ success: true });
});
