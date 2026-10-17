import { NextResponse } from "next/server";
import { withUser, notFound } from "@/lib/api";
import { forkChat, sharedChat } from "@/lib/chat-share";
import { shareAccess, shareCookieName } from "@/lib/share-password";

type Ctx = { params: Promise<{ token: string }> };

/** "Continue this conversation": copy a shared chat into the signed-in user's workspace. */
export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { token } = await params;
  const source = await sharedChat(token);
  if (!source) return notFound();
  // The owner can always copy their own chat; anyone else needs the link to be open to them.
  if (source.userId !== user.id) {
    const access = shareAccess(source, req.cookies.get(shareCookieName(token))?.value);
    if (access === "expired") return NextResponse.json({ error: "This link has expired" }, { status: 410 });
    if (access === "password") return NextResponse.json({ error: "Enter the link's password first" }, { status: 403 });
  }
  const chat = await forkChat(user.id, source, { fromShare: source.userId !== user.id });
  return NextResponse.json({ id: chat!.id }, { status: 201 });
});
