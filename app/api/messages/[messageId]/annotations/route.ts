import { withUser, notFound } from "@/lib/api";
import { ownedMessage } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  createMessageAnnotation,
  updateMessageAnnotation,
  deleteMessageAnnotation,
  getMessageAnnotations,
} from "@/lib/message-reactions-service";

export const GET = withUser<{ params: Promise<{ messageId: string }> }>(async (request, user, { params }) => {
  const { messageId } = await params;
  if (!(await ownedMessage(user.id, messageId))) return notFound();
  try {
    const result = await getMessageAnnotations(messageId);

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("GET /api/messages/[messageId]/annotations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch annotations" },
      { status: 500 },
    );
  }
});

export const POST = withUser<{ params: Promise<{ messageId: string }> }>(async (request, user, { params }) => {
  const { messageId } = await params;
  if (!(await ownedMessage(user.id, messageId))) return notFound();
  try {
    const body = await request.json();
    const { type, content, color, position, length } = body;

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const result = await createMessageAnnotation(
      messageId,
      type,
      content,
      { color, position, length },
    );

    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("POST /api/messages/[messageId]/annotations error:", error);
    return NextResponse.json(
      { error: "Failed to create annotation" },
      { status: 500 },
    );
  }
});
