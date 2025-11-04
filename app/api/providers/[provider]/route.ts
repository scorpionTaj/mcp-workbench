import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Get API key from database for remote providers
    const providerConfig = await db.query.providerConfigs.findFirst({
      where: eq(schema.providerConfigs.provider, provider),
    });

    const status = await getProviderStatus(
      provider as LLMProvider,
      providerConfig?.apiKey || undefined,
      providerConfig?.baseUrl || undefined
    );
    return NextResponse.json(status);
  } catch (error) {
    logger.error(
      { err: error },
      "MCP Workbench Error fetching provider status"
    );
    return NextResponse.json(
      { error: "Failed to fetch provider status" },
      { status: 500 }
    );
  }
}
