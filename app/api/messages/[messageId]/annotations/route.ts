import { NextResponse } from "next/server";
import {
  createMessageAnnotation,
  updateMessageAnnotation,
  deleteMessageAnnotation,
  getMessageAnnotations,
} from "@/lib/message-reactions-service";

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const result = await getMessageAnnotations(params.messageId);

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
}

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  try {
    const body = await request.json();
    const { type, content, color, position, length } = body;

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const result = await createMessageAnnotation(
      params.messageId,
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
}
