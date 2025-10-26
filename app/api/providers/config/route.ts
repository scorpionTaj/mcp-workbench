import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all provider configurations
export async function GET() {
  try {
    const configs = await prisma.providerConfig.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Don't send API keys to the client, just indicate if they exist
    const sanitized = configs.map((config) => ({
      ...config,
      hasApiKey: !!config.apiKey,
      apiKey: undefined,
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error fetching provider configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider configurations" },
      { status: 500 }
    );
  }
}

// POST create or update provider configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, name, type, baseUrl, apiKey, enabled, config } = body;

    if (!provider || !name || !type) {
      return NextResponse.json(
        { error: "Provider, name, and type are required" },
        { status: 400 }
      );
    }

    // For updates, only include apiKey if it's provided (not empty string)
    const updateData: any = {
      name,
      type,
      baseUrl,
      enabled,
      config,
    };

    // Only update API key if provided
    if (apiKey && apiKey.trim() !== "") {
      updateData.apiKey = apiKey; // In production, this should be encrypted
    }

    const providerConfig = await prisma.providerConfig.upsert({
      where: { provider },
      update: updateData,
      create: {
        provider,
        name,
        type,
        baseUrl,
        apiKey: apiKey || null, // In production, this should be encrypted
        enabled: enabled ?? true,
        config,
      },
    });

    return NextResponse.json({
      ...providerConfig,
      hasApiKey: !!providerConfig.apiKey,
      apiKey: undefined,
    });
  } catch (error) {
    console.error("Error saving provider config:", error);
    return NextResponse.json(
      { error: "Failed to save provider configuration" },
      { status: 500 }
    );
  }
}

// DELETE provider configuration
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    await prisma.providerConfig.delete({
      where: { provider },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting provider config:", error);
    return NextResponse.json(
      { error: "Failed to delete provider configuration" },
      { status: 500 }
    );
  }
}
