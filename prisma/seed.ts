import { PrismaClient } from "@prisma/client";
import logger from "@/lib/logger";

const prisma = new PrismaClient();

async function main() {
  logger.info("Seeding database...");

  // Create default settings
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      preferredInstaller: "npm",
    },
  });

  logger.info("Database seeded successfully!");
}

main()
  .catch((e) => {
    logger.error({ err: e }, "Error seeding database");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
