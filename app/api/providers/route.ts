import { NextResponse } from "next/server";
import { getAllProvidersStatus } from "@/lib/llm-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const statuses = await getAllProvidersStatus();
    return NextResponse.json(statuses);
  } catch (error) {
    console.error("MCP Workbench Error fetching provider statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider statuses" },
      { status: 500 }
    );
  }
}
