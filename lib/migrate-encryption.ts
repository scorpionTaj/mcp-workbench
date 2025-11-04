/**
 * Migration utility to encrypt existing plaintext API keys
 * Run this once to migrate from plaintext to encrypted API keys
 */

import { prisma } from "./db";
import { encrypt, isEncrypted } from "./encryption";
import logger from "./logger";

/**
 * Migrates all plaintext API keys to encrypted format
 * Safe to run multiple times - skips already encrypted keys
 */
export async function migrateApiKeysToEncrypted(): Promise<{
  total: number;
  encrypted: number;
  alreadyEncrypted: number;
  errors: number;
}> {
  logger.info("🔐 Starting API key encryption migration...");

  const stats = {
    total: 0,
    encrypted: 0,
    alreadyEncrypted: 0,
    errors: 0,
  };

  try {
    // Get all provider configs with API keys
    const configs = await prisma.providerConfig.findMany({
      where: {
        apiKey: {
          not: null,
        },
      },
    });

    stats.total = configs.length;
    logger.info(`📊 Found ${stats.total} provider configs with API keys`);

    // Process each config
    for (const config of configs) {
      if (!config.apiKey) continue;

      try {
        // Check if already encrypted
        if (isEncrypted(config.apiKey)) {
          logger.info(`✅ ${config.provider}: Already encrypted, skipping`);
          stats.alreadyEncrypted++;
          continue;
        }

        // Encrypt the plaintext API key
        const encryptedKey = encrypt(config.apiKey);

        // Update in database
        await prisma.providerConfig.update({
          where: { id: config.id },
          data: { apiKey: encryptedKey },
        });

        logger.info(`🔐 ${config.provider}: Encrypted successfully`);
        stats.encrypted++;
      } catch (error) {
        logger.error(
          { err: error, provider: config.provider },
          `❌ ${config.provider}: Failed to encrypt`
        );
        stats.errors++;
      }
    }

    logger.info("\n✨ Migration complete!");
    logger.info(`📊 Stats:
      Total: ${stats.total}
      Newly encrypted: ${stats.encrypted}
      Already encrypted: ${stats.alreadyEncrypted}
      Errors: ${stats.errors}
    `);

    return stats;
  } catch (error) {
    logger.error({ err: error }, "❌ Migration failed");
    throw error;
  }
}

/**
 * CLI runner for migration
 * Run with: bun run migrate-encryption
 */
if (require.main === module) {
  migrateApiKeysToEncrypted()
    .then(() => {
      logger.info("✅ Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "❌ Migration failed");
      process.exit(1);
    });
}
