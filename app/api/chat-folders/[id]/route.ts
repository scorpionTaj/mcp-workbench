import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { withUser, parseBody, notFound } from "@/lib/api";
import { folderNameSchema } from "@/lib/chat-organization";

type Ctx = { params: Promise<{ id: string }> };

const owns = (userId: string, id: string) =>
  and(eq(schema.chatFolders.id, id), eq(schema.chatFolders.userId, userId));

export const PATCH = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const { data, error } = await parseBody(req, z.object({ name: folderNameSchema }));
  if (error) return error;
  const [folder] = await db
    .update(schema.chatFolders)
    .set({ name: data.name })
    .where(owns(user.id, id))
    .returning({ id: schema.chatFolders.id, name: schema.chatFolders.name });
  return folder ? NextResponse.json(folder) : notFound();
});

// The folder's chats stay, unfiled (Chat.folderId is ON DELETE SET NULL).
export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const deleted = await db
    .delete(schema.chatFolders)
    .where(owns(user.id, id))
    .returning({ id: schema.chatFolders.id });
  return deleted.length ? NextResponse.json({ success: true }) : notFound();
});
