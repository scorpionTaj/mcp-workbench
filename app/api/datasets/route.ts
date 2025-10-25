import { NextResponse } from "next/server";
import type { Dataset } from "@/lib/types";

// Mock datasets - in production, this would read from a database
const DATASETS: Dataset[] = [];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(DATASETS);
  } catch (error) {
    console.error("MCP Workbench Error fetching datasets:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}
