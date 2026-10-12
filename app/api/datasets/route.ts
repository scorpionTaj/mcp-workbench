import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser } from "@/lib/api";
import { toClientDataset } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, user) => {
  const rows = await db.query.datasets.findMany({
    where: eq(schema.datasets.userId, user.id),
    orderBy: [desc(schema.datasets.createdAt)],
  });
  return NextResponse.json(rows.map(toClientDataset));
});
