import { NextResponse } from "next/server";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
} from "@/lib/templates-service";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await getTemplateById(params.id);

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
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const result = await updateTemplate({ ...body, id: params.id });

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
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await deleteTemplate(params.id);

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
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const action = searchParams.get("action");

    if (action === "use") {
      const result = await incrementTemplateUsage(params.id);

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
}
