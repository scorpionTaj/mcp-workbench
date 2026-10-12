import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { fetchProviderModels, getProviderCredentials, PROVIDER_CONFIGS } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";
import { withUser, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser<{ params: Promise<{ provider: string }> }>(async (_req, user, { params }) => {
  const { provider } = await params;
  if (!(provider in PROVIDER_CONFIGS)) return notFound();
  try {
    const { apiKey, baseUrl } = await getProviderCredentials(user.id, provider);
    return NextResponse.json(await fetchProviderModels(provider as LLMProvider, apiKey, baseUrl));
  } catch (error) {
    logger.error({ err: error }, "Error fetching models");
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
});
