/**
 * Cached Database Wrapper for MCP Workbench (Drizzle ORM)
 *
 * Implements cache-aside pattern for Drizzle queries with Redis.
 * Automatically handles cache invalidation and provides fallback to direct DB queries.
 */

import { db, schema } from "@/lib/drizzle-db";
import { eq, desc, and } from "drizzle-orm";
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
} from "@/lib/schema";

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

export async function cachedProviderConfigs(filter?: {
  enabled?: boolean;
}): Promise<ProviderConfig[]> {
  const cacheKey = filter?.enabled
    ? `${CACHE_KEYS.PROVIDER_CONFIGS_ALL}:enabled`
    : CACHE_KEYS.PROVIDER_CONFIGS_ALL;

  return withCache(
    cacheKey,
    async () => {
      const conditions = [];
      if (filter?.enabled !== undefined) {
        conditions.push(eq(schema.providerConfigs.enabled, filter.enabled));
      }

      return await db.query.providerConfigs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [schema.providerConfigs.name],
      });
    },
    TTL.LONG
  );
}

export async function cachedProviderConfig(
  provider: string
): Promise<ProviderConfig | null> {
  const cacheKey = `${CACHE_KEYS.PROVIDER_CONFIG}${provider}`;

  return withCache(
    cacheKey,
    async () => {
      const result = await db.query.providerConfigs.findFirst({
        where: eq(schema.providerConfigs.provider, provider),
      });
      return result || null;
    },
    TTL.LONG
  );
}

export async function updateProviderConfig(
  provider: string,
  data: Partial<ProviderConfig>
) {
  const [result] = await db
    .update(schema.providerConfigs)
    .set(data)
    .where(eq(schema.providerConfigs.provider, provider))
    .returning();

  await cacheInvalidate.providerConfig(provider);
  return result;
}

export async function upsertProviderConfig(
  provider: string,
  data: Omit<ProviderConfig, "id" | "createdAt" | "updatedAt">
) {
  const [result] = await db
    .insert(schema.providerConfigs)
    .values(data)
    .onConflictDoUpdate({
      target: schema.providerConfigs.provider,
      set: data,
    })
    .returning();

  await cacheInvalidate.providerConfig(provider);
  return result;
}

export async function deleteProviderConfig(provider: string) {
  const [result] = await db
    .delete(schema.providerConfigs)
    .where(eq(schema.providerConfigs.provider, provider))
    .returning();

  await cacheInvalidate.providerConfig(provider);
  return result;
}

// ============================================================================
// Chats
// ============================================================================

export async function cachedChats(options?: {
  take?: number;
  skip?: number;
  orderBy?: "createdAt" | "updatedAt";
}): Promise<any[]> {
  const { take = 50, skip = 0, orderBy = "updatedAt" } = options || {};
  const cacheKey = `${CACHE_KEYS.CHATS_LIST}${take}:${skip}:${orderBy}`;

  return withCache(
    cacheKey,
    async () => {
      const chats = await db.query.chats.findMany({
        limit: take,
        offset: skip,
        orderBy: [desc(schema.chats[orderBy])],
        with: {
          messages: {
            limit: 1,
            orderBy: [desc(schema.messages.createdAt)],
            columns: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
          },
        },
      });
      return chats;
    },
    TTL.SHORT
  );
}

export async function cachedChat(
  chatId: string,
  includeMessages: boolean = true
): Promise<any | null> {
  const cacheKey = `${CACHE_KEYS.CHAT}${chatId}:${includeMessages}`;

  return withCache(
    cacheKey,
    () =>
      db.query.chats.findFirst({
        where: eq(schema.chats.id, chatId),
        with: includeMessages
          ? {
              messages: {
                orderBy: [schema.messages.createdAt],
                with: {
                  attachments: true,
                },
              },
            }
          : undefined,
      }),
    TTL.SHORT
  );
}

export async function createChat(
  data: Omit<Chat, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date();
  const [result] = await db
    .insert(schema.chats)
    .values({
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await cacheInvalidate.allChats();
  return result;
}

export async function updateChat(chatId: string, data: Partial<Chat>) {
  const [result] = await db
    .update(schema.chats)
    .set(data)
    .where(eq(schema.chats.id, chatId))
    .returning();

  await cacheInvalidate.chat(chatId);
  return result;
}

export async function deleteChat(chatId: string) {
  const [result] = await db
    .delete(schema.chats)
    .where(eq(schema.chats.id, chatId))
    .returning();

  await cacheInvalidate.chat(chatId);
  return result;
}

// ============================================================================
// Messages
// ============================================================================

export async function createMessage(data: Omit<Message, "id" | "createdAt">) {
  const [result] = await db
    .insert(schema.messages)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning();

  await cacheInvalidate.messages(data.chatId);
  return result;
}

// ============================================================================
// Settings
// ============================================================================

export async function cachedSettings(): Promise<Settings | null> {
  return withCache(
    CACHE_KEYS.SETTINGS,
    async () => {
      const result = await db.query.settings.findFirst({
        where: eq(schema.settings.id, "default"),
      });
      return result || null;
    },
    TTL.VERY_LONG
  );
}

export async function updateSettings(data: Partial<Settings>) {
  const [result] = await db
    .update(schema.settings)
    .set(data)
    .where(eq(schema.settings.id, "default"))
    .returning();

  await cacheInvalidate.settings();
  return result;
}

// ============================================================================
// Installed Servers
// ============================================================================

export async function cachedInstalledServers(filter?: {
  enabled?: boolean;
}): Promise<InstalledServer[]> {
  const cacheKey = filter?.enabled
    ? `${CACHE_KEYS.INSTALLED_SERVERS}:enabled`
    : CACHE_KEYS.INSTALLED_SERVERS;

  return withCache(
    cacheKey,
    async () => {
      const conditions = [];
      if (filter?.enabled !== undefined) {
        conditions.push(eq(schema.installedServers.enabled, filter.enabled));
      }

      return await db.query.installedServers.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [schema.installedServers.name],
      });
    },
    TTL.LONG
  );
}

export async function updateInstalledServer(
  serverId: string,
  data: Partial<InstalledServer>
) {
  const [result] = await db
    .update(schema.installedServers)
    .set(data)
    .where(eq(schema.installedServers.serverId, serverId))
    .returning();

  await cacheInvalidate.installedServers();
  return result;
}

// ============================================================================
// Model Overrides
// ============================================================================

export async function cachedModelOverrides(): Promise<ModelOverride[]> {
  return withCache(
    CACHE_KEYS.MODEL_OVERRIDES,
    () =>
      db.query.modelOverrides.findMany({
        orderBy: [
          schema.modelOverrides.provider,
          schema.modelOverrides.modelId,
        ],
      }),
    TTL.VERY_LONG
  );
}

export async function upsertModelOverride(
  provider: string,
  modelId: string,
  isReasoning: boolean
) {
  const [result] = await db
    .insert(schema.modelOverrides)
    .values({
      provider,
      modelId,
      isReasoning,
    })
    .onConflictDoUpdate({
      target: [schema.modelOverrides.provider, schema.modelOverrides.modelId],
      set: { isReasoning },
    })
    .returning();

  await cacheInvalidate.modelOverrides();
  return result;
}

export async function deleteModelOverride(provider: string, modelId: string) {
  const [result] = await db
    .delete(schema.modelOverrides)
    .where(
      and(
        eq(schema.modelOverrides.provider, provider),
        eq(schema.modelOverrides.modelId, modelId)
      )
    )
    .returning();

  await cacheInvalidate.modelOverrides();
  return result;
}

// ============================================================================
// Datasets
// ============================================================================

export async function cachedDatasets(): Promise<Dataset[]> {
  return withCache(
    `${CACHE_KEYS.DATASET}all`,
    () =>
      db.query.datasets.findMany({
        orderBy: [desc(schema.datasets.createdAt)],
      }),
    TTL.MEDIUM
  );
}

export async function cachedDataset(id: string): Promise<Dataset | null> {
  const cacheKey = `${CACHE_KEYS.DATASET}${id}`;

  return withCache(
    cacheKey,
    async () => {
      const result = await db.query.datasets.findFirst({
        where: eq(schema.datasets.id, id),
      });
      return result || null;
    },
    TTL.MEDIUM
  );
}

export async function createDataset(
  data: Omit<Dataset, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date();
  const [result] = await db
    .insert(schema.datasets)
    .values({
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await cacheInvalidate.dataset("all");
  return result;
}
export async function updateDataset(id: string, data: Partial<Dataset>) {
  const [result] = await db
    .update(schema.datasets)
    .set(data)
    .where(eq(schema.datasets.id, id))
    .returning();

  await cacheInvalidate.dataset(id);
  return result;
}

export async function deleteDataset(id: string) {
  const [result] = await db
    .delete(schema.datasets)
    .where(eq(schema.datasets.id, id))
    .returning();

  await cacheInvalidate.dataset(id);
  return result;
}

// ====================
// Registry Cache Functions
// ====================

/**
 * Cache GitHub registry servers (1 hour TTL)
 */
export async function cachedRegistryServers<T>(
  fetchFn: () => Promise<T>
): Promise<T> {
  return withCache(CACHE_KEYS.REGISTRY_SERVERS, fetchFn, TTL.LONG);
}

/**
 * Invalidate registry cache (force refresh)
 */
export async function invalidateRegistryCache() {
  await cacheDelete(CACHE_KEYS.REGISTRY_SERVERS);
  logger.info("Registry cache invalidated");
}
