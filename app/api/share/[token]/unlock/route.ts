import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api";
import { sharedChat } from "@/lib/chat-share";
import { checkRateLimit } from "@/lib/rate-limit";
import { shareCookieName, shareCookieValue, verifySharePassword } from "@/lib/share-password";

type Ctx = { params: Promise<{ token: string }> };

const unlockSchema = z.object({ password: z.string().min(1).max(200) });

/**
 * Checks a shared link's password (no sign-in needed). On success it sets a signed, httpOnly
 * cookie for this link only. Attempts are rate-limited per link.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const chat = await sharedChat(token);
  if (!chat?.shareId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.shareExpiresAt && chat.shareExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }
  if (!chat.sharePasswordHash) return NextResponse.json({ success: true });

  const limited = await checkRateLimit("shareUnlock", token);
  if (limited) return limited;
  const { data, error } = await parseBody(req, unlockSchema);
  if (error) return error;
  if (!(await verifySharePassword(data.password, chat.sharePasswordHash))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 403 });
  }
  const { value, expires } = shareCookieValue(chat);
  const res = NextResponse.json({ success: true });
  res.cookies.set(shareCookieName(token), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
