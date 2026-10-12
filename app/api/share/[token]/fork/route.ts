import { NextResponse } from "next/server";
import { withUser, notFound } from "@/lib/api";
import { forkChat, sharedChat } from "@/lib/chat-share";

type Ctx = { params: Promise<{ token: string }> };

/** "Continue this conversation": copy a shared chat into the signed-in user's workspace. */
export const POST = withUser<Ctx>(async (_req, user, { params }) => {
  const { token } = await params;
  const source = await sharedChat(token);
  if (!source) return notFound();
  const chat = await forkChat(user.id, source, { fromShare: source.userId !== user.id });
  return NextResponse.json({ id: chat!.id }, { status: 201 });
});
