import { type NextRequest, NextResponse } from "next/server";
import { prisma, ensureSettings } from "@/lib/db";
import { z } from "zod";

const updateSettingsSchema = z.object({
  preferredInstaller: z.enum(["npm", "pnpm", "bun"]).optional(),
  githubToken: z.string().optional(),
});

export async function GET() {
  try {
    const settings = await ensureSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("MCP Workbench Error fetching settings:", error);
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

    const settings = await prisma.settings.update({
      where: { id: "default" },
      data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("MCP Workbench Error updating settings:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
