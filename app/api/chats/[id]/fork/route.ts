import { NextResponse } from "next/server";
import { z } from "zod";
import { ownedChat } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { forkChat } from "@/lib/chat-share";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ messageId: z.string().max(100).optional() });

/** Branch one of your chats, optionally keeping only the messages up to `messageId`. */
export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;
  const source = await ownedChat(user.id, id);
  if (!source) return notFound();
  const chat = await forkChat(user.id, source, { uptoMessageId: data.messageId, fromShare: false });
  if (!chat) return NextResponse.json({ error: "Message not found in this chat" }, { status: 400 });
  return NextResponse.json({ id: chat.id }, { status: 201 });
});
