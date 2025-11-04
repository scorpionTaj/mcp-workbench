import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Get API key from database for remote providers
    const providerConfig = await prisma.providerConfig.findUnique({
      where: { provider },
    });

    const status = await getProviderStatus(
      provider as LLMProvider,
      providerConfig?.apiKey || undefined,
      providerConfig?.baseUrl || undefined
    );
    return NextResponse.json(status);
  } catch (error) {
    logger.error("MCP Workbench Error fetching provider status:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider status" },
      { status: 500 }
    );
  }
}
