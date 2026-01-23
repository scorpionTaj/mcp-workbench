import { NextResponse } from "next/server";
import {
  addMessageReaction,
  removeMessageReaction,
  getMessageReactions,
} from "@/lib/message-reactions-service";

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const result = await getMessageReactions(params.messageId);

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
}

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const body = await request.json();
    const { type, emoji } = body;

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const result = await addMessageReaction(params.messageId, type, emoji);

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
}

export async function DELETE(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        { error: "Type parameter is required" },
        { status: 400 },
      );
    }

    const result = await removeMessageReaction(params.messageId, type);

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
}
