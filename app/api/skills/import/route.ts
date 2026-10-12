import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser, parseBody } from "@/lib/api";
import { importSkills } from "@/lib/plugins";

export const maxDuration = 60;

/** Imports SKILL.md folder(s) from a public GitHub URL. */
export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, z.object({ url: z.string().min(3).max(500) }));
  if (error) return error;
  try {
    return NextResponse.json(await importSkills(user.id, data.url));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 400 });
  }
});
