import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody } from "@/lib/api";
import { folderNameSchema } from "@/lib/chat-organization";

const MAX_FOLDERS = 100;

export const GET = withUser(async (_req, user) => {
  const folders = await db.query.chatFolders.findMany({
    where: eq(schema.chatFolders.userId, user.id),
    orderBy: [asc(schema.chatFolders.name)],
    columns: { id: true, name: true },
  });
  return NextResponse.json(folders);
});

export const POST = withUser(async (req, user) => {
  const { data, error } = await parseBody(req, z.object({ name: folderNameSchema }));
  if (error) return error;
  const count = await db.$count(schema.chatFolders, eq(schema.chatFolders.userId, user.id));
  if (count >= MAX_FOLDERS) {
    return NextResponse.json({ error: `You can have up to ${MAX_FOLDERS} folders` }, { status: 400 });
  }
  const [folder] = await db
    .insert(schema.chatFolders)
    .values({ userId: user.id, name: data.name })
    .returning({ id: schema.chatFolders.id, name: schema.chatFolders.name });
  return NextResponse.json(folder, { status: 201 });
});
