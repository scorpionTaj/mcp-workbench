import { PrismaClient } from "@prisma/client";
import logger from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Initialize SQLite with optimizations
export async function initializeDatabase() {
  try {
    // Enable WAL mode for better concurrency
    await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
    // Enable foreign keys
    await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
    // Optimize for performance
    await prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$executeRawUnsafe("PRAGMA cache_size = -64000;"); // 64MB cache
    await prisma.$executeRawUnsafe("PRAGMA temp_store = MEMORY;");

    logger.info("MCP Workbench Database initialized with SQLite optimizations");
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Failed to initialize database");
  }
}

// Helper to ensure settings exist
export async function ensureSettings() {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    return await prisma.settings.create({
      data: {
        id: "default",
        preferredInstaller: "npm",
      },
    });
  }
  return settings;
}
