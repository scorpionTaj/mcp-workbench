import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";
import logger from "@/lib/logger";

// Disable prefetch as it's not supported for "Transaction" pool mode
const connectionString = process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

// Create the postgres client
export const queryClient =
  globalForDb.queryClient ??
  postgres(connectionString, {
    prepare: false,
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// Create the Drizzle database instance
export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === "development" });

// Initialize database (no special initialization needed for PostgreSQL with Drizzle)
export async function initializeDatabase() {
  try {
    // Test the connection
    await queryClient`SELECT 1`;
    logger.info("MCP Workbench Database connected with Drizzle ORM");
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Failed to connect to database");
    throw error;
  }
}

// Ownership checks: messages and everything under them belong to a chat, which belongs to a user.
export async function ownedChat(userId: string, chatId: string) {
  return db.query.chats.findFirst({
    where: and(eq(schema.chats.id, chatId), eq(schema.chats.userId, userId)),
  });
}

export async function ownedMessage(userId: string, messageId: string) {
  const [row] = await db
    .select({ message: schema.messages })
    .from(schema.messages)
    .innerJoin(schema.chats, eq(schema.messages.chatId, schema.chats.id))
    .where(and(eq(schema.messages.id, messageId), eq(schema.chats.userId, userId)))
    .limit(1);
  return row?.message;
}

// Export schema for use in queries
export { schema };

export async function ownedAnnotation(userId: string, annotationId: string) {
  const [row] = await db
    .select({ id: schema.messageAnnotations.id })
    .from(schema.messageAnnotations)
    .innerJoin(schema.messages, eq(schema.messageAnnotations.messageId, schema.messages.id))
    .innerJoin(schema.chats, eq(schema.messages.chatId, schema.chats.id))
    .where(and(eq(schema.messageAnnotations.id, annotationId), eq(schema.chats.userId, userId)))
    .limit(1);
  return row;
}
