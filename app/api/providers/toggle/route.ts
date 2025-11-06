import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import logger from "@/lib/logger";
import { cacheInvalidate } from "@/lib/cache";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { provider, enabled } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // Update provider configuration
    const [updatedProvider] = await db
      .update(schema.providerConfigs)
      .set({ 
        enabled,
        updatedAt: new Date()
      })
      .where(eq(schema.providerConfigs.provider, provider))
      .returning();

    if (!updatedProvider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Invalidate provider status and related caches
    await cacheInvalidate.providerStatus();
    await cacheInvalidate.providerConfig(provider);
    
    logger.info(`MCP Workbench Provider ${provider} ${enabled ? 'enabled' : 'disabled'}`);
    
    return NextResponse.json(updatedProvider);
  } catch (error) {
    logger.error("MCP Workbench Error updating provider:", error);
    return NextResponse.json(
      { error: "Failed to update provider" },
      { status: 500 }
    );
  }
}