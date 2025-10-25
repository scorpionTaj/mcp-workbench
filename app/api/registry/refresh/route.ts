import { NextResponse } from "next/server";
import { clearCache } from "@/lib/github-registry";

export async function POST() {
  try {
    clearCache();
    return NextResponse.json({ success: true, message: "Cache cleared" });
  } catch (error) {
    console.error("MCP Workbench Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
