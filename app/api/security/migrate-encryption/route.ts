import { NextRequest, NextResponse } from "next/server";
import { migrateApiKeysToEncrypted } from "@/lib/migrate-encryption";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST endpoint to migrate existing API keys to encrypted format
 * This is safe to run multiple times - it skips already encrypted keys
 *
 * Usage: POST /api/security/migrate-encryption
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      try {
        const stats = await migrateApiKeysToEncrypted();

        return NextResponse.json({
          success: true,
          message: "API keys migration completed",
          stats,
        });
      } catch (error) {
        logger.error({ err: error }, "Migration error");
        return NextResponse.json(
          {
            success: false,
            error: "Migration failed",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    },
    "strict" // Strict rate limiting for security operations
  );
}

/**
 * GET endpoint to check migration status
 */
export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      try {
        const { db, schema } = await import("@/lib/db");
        const { isEncrypted } = await import("@/lib/encryption");
        const { isNull } = await import("drizzle-orm");

        const configs = await db.query.providerConfigs.findMany({
          where: (fields, { not }) => not(isNull(fields.apiKey)),
          columns: {
            provider: true,
            apiKey: true,
          },
        });

        const status = configs.map((config) => ({
          provider: config.provider,
          isEncrypted: config.apiKey ? isEncrypted(config.apiKey) : false,
        }));

        const total = status.length;
        const encrypted = status.filter((s) => s.isEncrypted).length;
        const needsMigration = total - encrypted;

        return NextResponse.json({
          total,
          encrypted,
          needsMigration,
          providers: status,
        });
      } catch (error) {
        logger.error({ err: error }, "Status check error");
        return NextResponse.json(
          { error: "Failed to check migration status" },
          { status: 500 }
        );
      }
    },
    "relaxed"
  );
}
