import { type NextRequest, NextResponse } from "next/server";
import { ensureSettings } from "@/lib/db";
import { z } from "zod";
import logger from "@/lib/logger";
import { cachedSettings, updateSettings } from "@/lib/db-cached";

const updateSettingsSchema = z.object({
  preferredInstaller: z.enum(["npm", "pnpm", "bun"]).optional(),
});

// Never send stored secrets to the client.
function publicSettings<T extends { githubToken?: string | null }>({ githubToken, ...rest }: T) {
  return { ...rest, hasGithubToken: !!githubToken };
}

export async function GET() {
  try {
    // Use cached version for better performance
    const settings = await cachedSettings();
    // Fallback to ensure settings if not cached
    if (!settings) {
      const newSettings = await ensureSettings();
      return NextResponse.json(publicSettings(newSettings));
    }
    return NextResponse.json(publicSettings(settings));
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Error fetching settings");
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    // Use cached wrapper that handles invalidation
    const settings = await updateSettings(data);

    return NextResponse.json(publicSettings(settings));
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Error updating settings");
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
