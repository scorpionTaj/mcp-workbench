import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema, ensureSettings } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import type { Settings } from "@/lib/schema";

const updateSettingsSchema = z.object({
  preferredInstaller: z.enum(["npm", "pnpm", "bun"]).optional(),
});

// Never send stored secrets to the client.
const toPublic = ({ githubToken, ...rest }: Settings) => ({ ...rest, hasGithubToken: !!githubToken });

export const GET = withUser(async (_req, user) => {
  return NextResponse.json(toPublic(await ensureSettings(user.id)));
});

export const PATCH = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, updateSettingsSchema);
  if (error) return error;
  await ensureSettings(user.id);
  const [settings] = await db
    .update(schema.settings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.settings.id, user.id))
    .returning();
  return NextResponse.json(toPublic(settings));
});
