import { withUser, notFound } from "@/lib/api";
import { ownedMessage } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  addMessageReaction,
  removeMessageReaction,
  getMessageReactions,
} from "@/lib/message-reactions-service";

export const GET = withUser<{ params: Promise<{ messageId: string }> }>(async (request, user, { params }) => {
  const { messageId } = await params;
  if (!(await ownedMessage(user.id, messageId))) return notFound();
  try {
    const result = await getMessageReactions(messageId);

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("GET /api/messages/[messageId]/reactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 },
    );
  }
});

export const POST = withUser<{ params: Promise<{ messageId: string }> }>(async (request, user, { params }) => {
  const { messageId } = await params;
  if (!(await ownedMessage(user.id, messageId))) return notFound();
  try {
    const body = await request.json();
    const { type, emoji } = body;

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const result = await addMessageReaction(messageId, type, emoji);

    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("POST /api/messages/[messageId]/reactions error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 },
    );
  }
});

export const DELETE = withUser<{ params: Promise<{ messageId: string }> }>(async (request, user, { params }) => {
  const { messageId } = await params;
  if (!(await ownedMessage(user.id, messageId))) return notFound();
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        { error: "Type parameter is required" },
        { status: 400 },
      );
    }

    const result = await removeMessageReaction(messageId, type);

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/messages/[messageId]/reactions error:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 },
    );
  }
});
