import { NextResponse } from "next/server";
import {
  createTemplate,
  getTemplates,
  deleteTemplate,
  incrementTemplateUsage,
  getPopularTemplates,
} from "@/lib/templates-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const isPublic = searchParams.get("public");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const popular = searchParams.get("popular");

    if (popular === "true") {
      const result = await getPopularTemplates(limit ? parseInt(limit) : 10);
      if (result.success) {
        return NextResponse.json(result.data);
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const result = await getTemplates({
      category: category || undefined,
      search: search || undefined,
      isPublic:
        isPublic === "true" ? true : isPublic === "false" ? false : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    if (result.success) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("GET /api/chat/templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTemplate(body);

    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    }

    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    console.error("POST /api/chat/templates error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
