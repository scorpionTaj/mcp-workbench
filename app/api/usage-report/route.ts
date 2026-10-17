import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { emailTransport } from "@/lib/email";
import { nextReportAt } from "@/lib/usage-reports";

const bodySchema = z.object({ frequency: z.enum(["off", "weekly", "monthly"]) });

async function current(userId: string) {
  const row = await db.query.usageReports.findFirst({ where: eq(schema.usageReports.userId, userId) });
  return {
    frequency: row?.frequency ?? "off",
    nextRunAt: row?.nextRunAt ?? null,
    lastSentAt: row?.lastSentAt ?? null,
    lastError: row?.lastError ?? null,
    emailConfigured: emailTransport() !== null,
  };
}

export const GET = withUser(async (_req, user) => NextResponse.json(await current(user.id)));

/** Turns usage report emails off, or on as weekly or monthly. */
export const PUT = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;
  if (data.frequency === "off") {
    await db.delete(schema.usageReports).where(eq(schema.usageReports.userId, user.id));
  } else {
    const nextRunAt = nextReportAt(data.frequency, new Date());
    await db
      .insert(schema.usageReports)
      .values({ userId: user.id, frequency: data.frequency, nextRunAt })
      .onConflictDoUpdate({
        target: schema.usageReports.userId,
        set: { frequency: data.frequency, nextRunAt, lastError: null },
      });
  }
  return NextResponse.json(await current(user.id));
});
