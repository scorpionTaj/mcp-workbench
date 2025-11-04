import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { withRateLimit } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/csrf";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET all provider configurations
export async function GET(request: NextRequest) {
  // Apply rate limiting - relaxed for read operations
  return withRateLimit(
    request,
    async () => {
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
        logger.error({ err: error }, "Error fetching provider configs:");
        return NextResponse.json(
          { error: "Failed to fetch provider configurations" },
          { status: 500 }
        );
      }
    },
    "relaxed"
  );
}

// POST create or update provider configuration
export async function POST(request: NextRequest) {
  // Apply CSRF protection and rate limiting for write operations
  return withCsrfProtection(request, async (req) => {
    return withRateLimit(
      req,
      async () => {
        try {
          const body = await req.json();
          const { provider, name, type, baseUrl, apiKey, enabled, config } =
            body;

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

          // Encrypt API key if provided
          if (apiKey && apiKey.trim() !== "") {
            updateData.apiKey = encrypt(apiKey);
          }

          const providerConfig = await prisma.providerConfig.upsert({
            where: { provider },
            update: updateData,
            create: {
              provider,
              name,
              type,
              baseUrl,
              apiKey: apiKey ? encrypt(apiKey) : null,
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
          logger.error({ err: error }, "Error saving provider config:");
          return NextResponse.json(
            { error: "Failed to save provider configuration" },
            { status: 500 }
          );
        }
      },
      "standard"
    );
  });
}

// DELETE provider configuration
export async function DELETE(request: NextRequest) {
  // Apply CSRF protection and rate limiting
  return withCsrfProtection(request, async (req) => {
    return withRateLimit(
      req,
      async () => {
        try {
          const { searchParams } = new URL(req.url);
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
          logger.error({ err: error }, "Error deleting provider config:");
          return NextResponse.json(
            { error: "Failed to delete provider configuration" },
            { status: 500 }
          );
        }
      },
      "standard"
    );
  });
}
