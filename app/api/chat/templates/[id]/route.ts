import { withUser } from "@/lib/api";
import { NextResponse } from "next/server";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
} from "@/lib/templates-service";

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (request, user, { params }) => {
  try {
    const { id } = await params;
    const result = await getTemplateById(user.id, id);

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 404 });
  } catch (error) {
    console.error("GET /api/chat/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 },
    );
  }
});

export const PATCH = withUser<{ params: Promise<{ id: string }> }>(async (request, user, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateTemplate(user.id, { ...body, id });

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/chat/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
});

export const DELETE = withUser<{ params: Promise<{ id: string }> }>(async (request, user, { params }) => {
  try {
    const { id } = await params;
    const result = await deleteTemplate(user.id, id);

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/chat/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
});

export const PUT = withUser<{ params: Promise<{ id: string }> }>(async (request, user, { params }) => {
  try {
    const { id } = await params;
    const searchParams = new URL(request.url).searchParams;
    const action = searchParams.get("action");

    if (action === "use") {
      const result = await incrementTemplateUsage(user.id, id);

      if (result.success) {
        return NextResponse.json(result.data);
      }

      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/chat/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
});
