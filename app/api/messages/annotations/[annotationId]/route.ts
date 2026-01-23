import { NextResponse } from "next/server";
import {
  updateMessageAnnotation,
  deleteMessageAnnotation,
} from "@/lib/message-reactions-service";

export async function PATCH(
  request: Request,
  { params }: { params: { annotationId: string } },
) {
  try {
    const body = await request.json();
    const result = await updateMessageAnnotation(params.annotationId, body);

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error(
      "PATCH /api/messages/annotations/[annotationId] error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to update annotation" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { annotationId: string } },
) {
  try {
    const result = await deleteMessageAnnotation(params.annotationId);

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error(
      "DELETE /api/messages/annotations/[annotationId] error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to delete annotation" },
      { status: 500 },
    );
  }
}
