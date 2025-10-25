import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (provider !== "ollama" && provider !== "lmstudio") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const status = await getProviderStatus(provider as LLMProvider);
    return NextResponse.json(status);
  } catch (error) {
    console.error("MCP Workbench Error fetching provider status:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider status" },
      { status: 500 }
    );
  }
}
