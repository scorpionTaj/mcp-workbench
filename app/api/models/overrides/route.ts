import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overrides = await prisma.modelOverride.findMany();
    return NextResponse.json(overrides);
  } catch (error) {
    logger.error("MCP Workbench Error fetching model overrides:", error);
    return NextResponse.json(
      { error: "Failed to fetch overrides" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { provider, modelId, isReasoning } = await request.json();

    const override = await prisma.modelOverride.upsert({
      where: {
        provider_modelId: {
          provider,
          modelId,
        },
      },
      update: {
        isReasoning,
      },
      create: {
        provider,
        modelId,
        isReasoning,
      },
    });

    return NextResponse.json(override);
  } catch (error) {
    logger.error("MCP Workbench Error setting model override:", error);
    return NextResponse.json(
      { error: "Failed to set override" },
      { status: 500 }
    );
  }
}
