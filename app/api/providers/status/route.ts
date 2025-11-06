import { NextResponse } from "next/server";
import { getAllProvidersStatus } from "@/lib/llm-providers";

export async function GET() {
  try {
    const providers = await getAllProvidersStatus();
    return NextResponse.json(providers);
  } catch (error) {
    console.error("MCP Workbench Error fetching provider statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider statuses" },
      { status: 500 }
    );
  }
}