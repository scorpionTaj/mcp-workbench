import { drizzle } from "drizzle-orm/postgres-js";
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
    max: 10, // Connection pool size
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

// Create the Drizzle database instance
export const db = drizzle(queryClient, { schema, logger: true });

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

// Helper to ensure settings exist
export async function ensureSettings() {
  const settings = await db.query.settings.findFirst({
    where: (settings, { eq }) => eq(settings.id, "default"),
  });

  if (!settings) {
    const [newSettings] = await db
      .insert(schema.settings)
      .values({
        id: "default",
        preferredInstaller: "npm",
      })
      .returning();
    return newSettings;
  }

  return settings;
}

// Export schema for use in queries
export { schema };
