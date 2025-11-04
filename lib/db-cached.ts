/**
 * Cached Database Wrapper for MCP Workbench
 *
 * Implements cache-aside pattern for Prisma queries with Redis.
 * Automatically handles cache invalidation and provides fallback to direct DB queries.
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * const config = await prisma.providerConfig.findUnique({ where: { provider } });
 *
 * // Use:
 * const config = await cachedProviderConfig(provider);
 * ```
 */

import { prisma } from "@/lib/db";
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidate,
  CACHE_KEYS,
  TTL,
} from "@/lib/cache";
import logger from "@/lib/logger";
import type {
  Chat,
  Message,
  ProviderConfig,
  InstalledServer,
  Dataset,
  Settings,
  ModelOverride,
} from "@prisma/client";

/**
 * Helper to wrap cache-aside pattern
 */
async function withCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = TTL.MEDIUM
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from database
  const data = await queryFn();

  // Store in cache for next time
  if (data !== null && data !== undefined) {
    await cacheSet(key, data, ttl);
  }

  return data;
}

// ============================================================================
// Provider Configurations
// ============================================================================

/**
 * Get all provider configurations with caching
 */
export async function cachedProviderConfigs(filter?: {
  enabled?: boolean;
}): Promise<ProviderConfig[]> {
  const cacheKey = filter?.enabled
    ? `${CACHE_KEYS.PROVIDER_CONFIGS_ALL}:enabled`
    : CACHE_KEYS.PROVIDER_CONFIGS_ALL;

  return withCache(
    cacheKey,
    () =>
      prisma.providerConfig.findMany({
        where: filter,
        orderBy: { name: "asc" },
      }),
    TTL.LONG
  );
}

/**
 * Get single provider configuration with caching
 */
export async function cachedProviderConfig(
  provider: string
): Promise<ProviderConfig | null> {
  const cacheKey = `${CACHE_KEYS.PROVIDER_CONFIG}${provider}`;

  return withCache(
    cacheKey,
    () =>
      prisma.providerConfig.findUnique({
        where: { provider },
      }),
    TTL.LONG
  );
}

/**
 * Update provider configuration and invalidate cache
 */
export async function updateProviderConfig(
  provider: string,
  data: Partial<ProviderConfig>
) {
  const result = await prisma.providerConfig.update({
    where: { provider },
    data,
  });

  // Invalidate cache
  await cacheInvalidate.providerConfig(provider);

  return result;
}

/**
 * Create or update provider configuration
 */
export async function upsertProviderConfig(
  provider: string,
  data: Omit<ProviderConfig, "id" | "createdAt" | "updatedAt">
) {
  const result = await prisma.providerConfig.upsert({
    where: { provider },
    create: data,
    update: data,
  });

  // Invalidate cache
  await cacheInvalidate.providerConfig(provider);

  return result;
}

/**
 * Delete provider configuration
 */
export async function deleteProviderConfig(provider: string) {
  const result = await prisma.providerConfig.delete({
    where: { provider },
  });

  // Invalidate cache
  await cacheInvalidate.providerConfig(provider);

  return result;
}

// ============================================================================
// Chats
// ============================================================================

/**
 * Get all chats with caching (optimized with selective fields)
 */
export async function cachedChats(options?: {
  take?: number;
  skip?: number;
  orderBy?: "createdAt" | "updatedAt";
}): Promise<any[]> {
  const { take = 50, skip = 0, orderBy = "updatedAt" } = options || {};
  const cacheKey = `${CACHE_KEYS.CHATS_LIST}${take}:${skip}:${orderBy}`;

  return withCache(
    cacheKey,
    () =>
      prisma.chat.findMany({
        take,
        skip,
        orderBy: { [orderBy]: "desc" },
        // Optimize: Only select fields needed for list view
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          defaultProvider: true,
          defaultModelId: true,
          systemPrompt: true,
          toolServerIds: true,
          meta: true,
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    TTL.SHORT // Shorter TTL for frequently updated data
  );
}

/**
 * Get single chat with messages
 */
export async function cachedChat(
  chatId: string,
  includeMessages: boolean = true
): Promise<(Chat & { messages?: Message[] }) | null> {
  const cacheKey = `${CACHE_KEYS.CHAT}${chatId}:${includeMessages}`;

  return withCache(
    cacheKey,
    () =>
      prisma.chat.findUnique({
        where: { id: chatId },
        include: includeMessages
          ? {
              messages: {
                orderBy: { createdAt: "asc" },
                include: {
                  attachments: true,
                },
              },
            }
          : undefined,
      }),
    TTL.SHORT
  );
}

/**
 * Create chat and invalidate cache
 */
export async function createChat(
  data: Omit<Chat, "id" | "createdAt" | "updatedAt">
) {
  const result = await prisma.chat.create({
    data,
  });

  // Invalidate chats list cache
  await cacheInvalidate.allChats();

  return result;
}

/**
 * Update chat and invalidate cache
 */
export async function updateChat(chatId: string, data: Partial<Chat>) {
  const result = await prisma.chat.update({
    where: { id: chatId },
    data,
  });

  // Invalidate specific chat and lists
  await cacheInvalidate.chat(chatId);

  return result;
}

/**
 * Delete chat and invalidate cache
 */
export async function deleteChat(chatId: string) {
  const result = await prisma.chat.delete({
    where: { id: chatId },
  });

  // Invalidate chat cache
  await cacheInvalidate.chat(chatId);

  return result;
}

// ============================================================================
// Messages
// ============================================================================

/**
 * Create message and invalidate cache
 */
export async function createMessage(data: Omit<Message, "id" | "createdAt">) {
  const result = await prisma.message.create({
    data,
    include: {
      attachments: true,
    },
  });

  // Invalidate chat and messages cache
  await cacheInvalidate.messages(data.chatId);

  return result;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Get settings with caching
 */
export async function cachedSettings(): Promise<Settings | null> {
  return withCache(
    CACHE_KEYS.SETTINGS,
    () =>
      prisma.settings.findUnique({
        where: { id: "default" },
      }),
    TTL.VERY_LONG // Settings rarely change
  );
}

/**
 * Update settings and invalidate cache
 */
export async function updateSettings(data: Partial<Settings>) {
  const result = await prisma.settings.update({
    where: { id: "default" },
    data,
  });

  // Invalidate settings cache
  await cacheInvalidate.settings();

  return result;
}

// ============================================================================
// Installed Servers
// ============================================================================

/**
 * Get all installed servers with caching
 */
export async function cachedInstalledServers(filter?: {
  enabled?: boolean;
}): Promise<InstalledServer[]> {
  const cacheKey = filter?.enabled
    ? `${CACHE_KEYS.INSTALLED_SERVERS}:enabled`
    : CACHE_KEYS.INSTALLED_SERVERS;

  return withCache(
    cacheKey,
    () =>
      prisma.installedServer.findMany({
        where: filter,
        orderBy: { name: "asc" },
      }),
    TTL.LONG
  );
}

/**
 * Update installed server and invalidate cache
 */
export async function updateInstalledServer(
  serverId: string,
  data: Partial<InstalledServer>
) {
  const result = await prisma.installedServer.update({
    where: { serverId },
    data,
  });

  // Invalidate cache
  await cacheInvalidate.installedServers();

  return result;
}

// ============================================================================
// Model Overrides
// ============================================================================

/**
 * Get all model overrides with caching
 */
export async function cachedModelOverrides(): Promise<ModelOverride[]> {
  return withCache(
    CACHE_KEYS.MODEL_OVERRIDES,
    () =>
      prisma.modelOverride.findMany({
        orderBy: [{ provider: "asc" }, { modelId: "asc" }],
      }),
    TTL.VERY_LONG
  );
}

/**
 * Upsert model override and invalidate cache
 */
export async function upsertModelOverride(
  provider: string,
  modelId: string,
  isReasoning: boolean
) {
  const result = await prisma.modelOverride.upsert({
    where: {
      provider_modelId: { provider, modelId },
    },
    create: { provider, modelId, isReasoning },
    update: { isReasoning },
  });

  // Invalidate cache
  await cacheInvalidate.modelOverrides();

  return result;
}

// ============================================================================
// Datasets
// ============================================================================

/**
 * Get dataset with caching
 */
export async function cachedDataset(
  datasetId: string
): Promise<Dataset | null> {
  const cacheKey = `${CACHE_KEYS.DATASET}${datasetId}`;

  return withCache(
    cacheKey,
    () =>
      prisma.dataset.findUnique({
        where: { id: datasetId },
      }),
    TTL.LONG
  );
}

/**
 * Update dataset and invalidate cache
 */
export async function updateDataset(datasetId: string, data: Partial<Dataset>) {
  const result = await prisma.dataset.update({
    where: { id: datasetId },
    data,
  });

  // Invalidate cache
  await cacheInvalidate.dataset(datasetId);

  return result;
}

// ============================================================================
// Registry (GitHub API Caching)
// ============================================================================

/**
 * Cache registry servers with long TTL since they don't change often
 */
export async function cachedRegistryServers<T>(
  fetchFn: () => Promise<T>
): Promise<T> {
  return withCache(
    CACHE_KEYS.REGISTRY_SERVERS,
    fetchFn,
    TTL.VERY_LONG // 1 hour - registry data is relatively static
  );
}

/**
 * Invalidate registry cache (call after refresh)
 */
export async function invalidateRegistryCache() {
  await cacheInvalidate.registry();
  logger.info("Registry cache invalidated");
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Preload commonly accessed data into cache
 */
export async function warmupCache() {
  logger.info("Warming up cache...");

  try {
    await Promise.all([
      cachedProviderConfigs(),
      cachedProviderConfigs({ enabled: true }),
      cachedSettings(),
      cachedInstalledServers(),
      cachedModelOverrides(),
      cachedChats({ take: 20 }),
    ]);

    logger.info("✅ Cache warmup complete");
  } catch (error) {
    logger.error({ err: error }, "Cache warmup failed");
  }
}
