import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isOwnUpload, uploadName } from "@/lib/uploads";

/**
 * Whether a user may read an uploaded file. New uploads carry their owner in the name; older
 * ones (no owner prefix) are allowed only if one of the user's datasets, attachments or
 * messages references them.
 */
export async function canReadUpload(userId: string, url: string): Promise<boolean> {
  if (isOwnUpload(url, userId)) return true;
  let name: string;
  try {
    name = uploadName(url);
  } catch {
    return false;
  }
  if (/^[A-Za-z0-9]+_\d/.test(name)) return false; // someone else's owner-prefixed file
  const href = `/uploads/${name}`;

  const dataset = await db.query.datasets.findFirst({
    where: and(eq(schema.datasets.userId, userId), eq(schema.datasets.path, href)),
    columns: { id: true },
  });
  if (dataset) return true;

  const [attachment] = await db
    .select({ id: schema.attachments.id })
    .from(schema.attachments)
    .innerJoin(schema.messages, eq(schema.messages.id, schema.attachments.messageId))
    .innerJoin(schema.chats, eq(schema.chats.id, schema.messages.chatId))
    .where(and(eq(schema.attachments.url, href), eq(schema.chats.userId, userId)))
    .limit(1);
  if (attachment) return true;

  const [message] = await db
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .innerJoin(schema.chats, eq(schema.chats.id, schema.messages.chatId))
    .where(and(eq(schema.chats.userId, userId), sql`${schema.messages.parts}::text like ${`%"${href}"%`}`))
    .limit(1);
  return Boolean(message);
}
