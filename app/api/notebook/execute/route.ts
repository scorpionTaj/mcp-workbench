import { NextResponse } from "next/server";
import { executeNotebookCode } from "@/lib/notebook-bridge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { code, files, pythonPath } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result = await executeNotebookCode(code, files, pythonPath);

    return NextResponse.json(result);
  } catch (error) {
    console.error("MCP Workbench Error executing notebook code:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute code",
      },
      { status: 500 }
    );
  }
}
