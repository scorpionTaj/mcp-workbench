import { withUser, notFound } from "@/lib/api";
import { ownedAnnotation } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  updateMessageAnnotation,
  deleteMessageAnnotation,
} from "@/lib/message-reactions-service";

export const PATCH = withUser<{ params: Promise<{ annotationId: string }> }>(async (request, user, { params }) => {
  const { annotationId } = await params;
  if (!(await ownedAnnotation(user.id, annotationId))) return notFound();
  try {
    const body = await request.json();
    const result = await updateMessageAnnotation(annotationId, body);

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
});

export const DELETE = withUser<{ params: Promise<{ annotationId: string }> }>(async (request, user, { params }) => {
  const { annotationId } = await params;
  if (!(await ownedAnnotation(user.id, annotationId))) return notFound();
  try {
    const result = await deleteMessageAnnotation(annotationId);

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
});
