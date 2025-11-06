/**
 * Redis Cache Layer for MCP Workbench
 *
 * Provides high-performance caching using Redis running in Ubuntu WSL.
 * Implements cache-aside pattern with automatic invalidation.
 *
 * Features:
 * - Connection pooling and automatic reconnection
 * - TTL-based expiration
 * - JSON serialization/deserialization
 * - Cache invalidation helpers
 * - Error handling and fallbacks
 * - Performance metrics
 *
 * Setup Redis in Ubuntu WSL:
 * ```bash
 * sudo apt update
 * sudo apt install redis-server
 * sudo service redis-server start
 * redis-cli ping  # Should return PONG
 * ```
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 * - REDIS_PASSWORD: Optional password for Redis
 * - CACHE_ENABLED: Enable/disable caching (default: true)
 */

import Redis from "ioredis";
import logger from "@/lib/logger";

// We need to import these functions but need to be careful about circular dependencies
// So we'll import them dynamically when needed in the warming function

// Cache configuration
const CACHE_CONFIG = {
  enabled: process.env.CACHE_ENABLED !== "false",
  url: process.env.REDIS_URL || "redis://localhost:6379",
  password: process.env.REDIS_PASSWORD,
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 10000,
};

// Default TTL values (in seconds)
export const TTL = {
  SHORT: 60, // 1 minute - frequently changing data
  MEDIUM: 300, // 5 minutes - moderate changes
  LONG: 1800, // 30 minutes - rarely changing data
  VERY_LONG: 3600, // 1 hour - static data
} as const;

// Cache key prefixes for organization
export const CACHE_KEYS = {
  PROVIDER_CONFIG: "provider:config:",
  PROVIDER_CONFIGS_ALL: "provider:configs:all",
  PROVIDER_STATUS_ALL: "provider:status:all", // Cache for getAllProvidersStatus
  EMBEDDING_PROVIDERS: "embedding:providers:all", // Cache for embedding providers
  EMBEDDING_MODELS: "embedding:models:", // Cache for embedding models by provider
  MODEL_OVERRIDES: "model:overrides",
  CHAT: "chat:",
  CHATS_LIST: "chats:list:",
  MESSAGES: "messages:",
  SETTINGS: "settings:default",
  INSTALLED_SERVERS: "servers:installed",
  DATASET: "dataset:",
  HEALTH_METRICS: "health:metrics",
  REGISTRY_SERVERS: "registry:servers:all",
  REGISTRY_SERVER: "registry:server:",
  STATS: "cache:stats", // Store cache stats in Redis
} as const;

// Redis client instance
let redisClient: Redis | null = null;
let connectionAttempts = 0;
let isConnected = false;

// In-memory cache statistics (fallback)
const inMemoryStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Get cache statistics from Redis
 */
async function getStatsFromRedis() {
  const client = getClient();
  if (!client || !isConnected) {
    return inMemoryStats;
  }

  try {
    const stats = await client.hgetall(CACHE_KEYS.STATS);
    return {
      hits: parseInt(stats.hits || "0", 10),
      misses: parseInt(stats.misses || "0", 10),
      errors: parseInt(stats.errors || "0", 10),
    };
  } catch (error) {
    return inMemoryStats;
  }
}

/**
 * Increment cache stat in Redis
 */
async function incrementStat(stat: "hits" | "misses" | "errors") {
  const client = getClient();
  inMemoryStats[stat]++; // Also update in-memory for immediate access

  if (!client || !isConnected) {
    return;
  }

  try {
    await client.hincrby(CACHE_KEYS.STATS, stat, 1);
  } catch (error) {
    // Silently fail - stats are not critical
  }
}

// Cache statistics getter
export const cacheStats = {
  get hits() {
    return inMemoryStats.hits;
  },
  get misses() {
    return inMemoryStats.misses;
  },
  get errors() {
    return inMemoryStats.errors;
  },
  get hitRate() {
    const total = inMemoryStats.hits + inMemoryStats.misses;
    return total === 0 ? 0 : (inMemoryStats.hits / total) * 100;
  },
  async sync() {
    const stats = await getStatsFromRedis();
    inMemoryStats.hits = stats.hits;
    inMemoryStats.misses = stats.misses;
    inMemoryStats.errors = stats.errors;
  },
  async reset() {
    inMemoryStats.hits = 0;
    inMemoryStats.misses = 0;
    inMemoryStats.errors = 0;

    const client = getClient();
    if (client && isConnected) {
      try {
        await client.del(CACHE_KEYS.STATS);
      } catch (error) {
        // Silently fail
      }
    }
  },
};

/**
 * Initialize Redis client with connection handling
 */
function initRedisClient(): Redis | null {
  if (!CACHE_CONFIG.enabled) {
    logger.info("Cache is disabled via CACHE_ENABLED=false");
    return null;
  }

  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    const client = new Redis(CACHE_CONFIG.url, {
      password: CACHE_CONFIG.password,
      maxRetriesPerRequest: CACHE_CONFIG.maxRetries,
      retryStrategy(times) {
        const delay = Math.min(times * CACHE_CONFIG.retryDelay, 5000);
        logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        logger.error({ err }, "Redis connection error");
        return true;
      },
      connectTimeout: CACHE_CONFIG.connectionTimeout,
      lazyConnect: false,
    });

    // Connection event handlers
    client.on("connect", () => {
      logger.info("Redis client connecting...");
    });

    client.on("ready", () => {
      isConnected = true;
      connectionAttempts = 0;
      logger.info("✅ Redis cache connected and ready");
    });

    client.on("error", (err) => {
      isConnected = false;
      inMemoryStats.errors++;
      logger.error({ err }, "Redis client error");
    });

    client.on("close", () => {
      isConnected = false;
      logger.warn("Redis connection closed");
    });

    client.on("reconnecting", () => {
      connectionAttempts++;
      logger.info(`Redis reconnecting (attempt ${connectionAttempts})...`);
    });

    redisClient = client;
    return client;
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Redis client");
    return null;
  }
}

/**
 * Get Redis client, initializing if needed
 */
function getClient(): Redis | null {
  if (!CACHE_CONFIG.enabled) {
    return null;
  }

  if (!redisClient || !isConnected) {
    return initRedisClient();
  }

  return redisClient;
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client || !isConnected) {
    await incrementStat("misses");
    return null;
  }

  try {
    const value = await client.get(key);
    if (value === null) {
      await incrementStat("misses");
      return null;
    }

    await incrementStat("hits");
    return JSON.parse(value) as T;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error, key }, "Cache get error");
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = TTL.MEDIUM
): Promise<boolean> {
  const client = getClient();
  if (!client || !isConnected) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error, key }, "Cache set error");
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const client = getClient();
  if (!client || !isConnected) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error, key }, "Cache delete error");
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  const client = getClient();
  if (!client || !isConnected) {
    return 0;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await client.del(...keys);
    logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
    return keys.length;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error, pattern }, "Cache delete pattern error");
    return 0;
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  const client = getClient();
  if (!client || !isConnected) {
    return false;
  }

  try {
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error, key }, "Cache exists error");
    return false;
  }
}

/**
 * Clear entire cache (use with caution!)
 */
export async function cacheClear(): Promise<boolean> {
  const client = getClient();
  if (!client || !isConnected) {
    return false;
  }

  try {
    await client.flushdb();
    logger.warn("⚠️ Cache cleared (FLUSHDB)");
    return true;
  } catch (error) {
    await incrementStat("errors");
    logger.error({ err: error }, "Cache clear error");
    return false;
  }
}

/**
 * Cache invalidation helpers for common operations
 */
export const cacheInvalidate = {
  // Invalidate provider config cache
  async providerConfig(provider?: string) {
    if (provider) {
      await cacheDelete(`${CACHE_KEYS.PROVIDER_CONFIG}${provider}`);
    }
    await cacheDelete(CACHE_KEYS.PROVIDER_CONFIGS_ALL);
  },

  // Invalidate chat cache
  async chat(chatId: string) {
    await cacheDelete(`${CACHE_KEYS.CHAT}${chatId}`);
    await cacheDeletePattern(`${CACHE_KEYS.CHATS_LIST}*`);
    await cacheDeletePattern(`${CACHE_KEYS.MESSAGES}${chatId}:*`);
  },

  // Invalidate all chats cache
  async allChats() {
    await cacheDeletePattern(`${CACHE_KEYS.CHAT}*`);
    await cacheDeletePattern(`${CACHE_KEYS.CHATS_LIST}*`);
  },

  // Invalidate messages cache
  async messages(chatId: string) {
    await cacheDeletePattern(`${CACHE_KEYS.MESSAGES}${chatId}:*`);
    await cacheDelete(`${CACHE_KEYS.CHAT}${chatId}`);
  },

  // Invalidate settings cache
  async settings() {
    await cacheDelete(CACHE_KEYS.SETTINGS);
  },

  // Invalidate installed servers cache
  async installedServers() {
    await cacheDelete(CACHE_KEYS.INSTALLED_SERVERS);
  },

  // Invalidate model overrides cache
  async modelOverrides() {
    await cacheDelete(CACHE_KEYS.MODEL_OVERRIDES);
  },

  // Invalidate dataset cache
  async dataset(datasetId: string) {
    await cacheDelete(`${CACHE_KEYS.DATASET}${datasetId}`);
  },

  // Invalidate registry cache
  async registry() {
    await cacheDelete(CACHE_KEYS.REGISTRY_SERVERS);
    await cacheDeletePattern(`${CACHE_KEYS.REGISTRY_SERVER}*`);
  },

  // Invalidate specific registry server
  async registryServer(serverId: string) {
    await cacheDelete(`${CACHE_KEYS.REGISTRY_SERVER}${serverId}`);
  },

  // Invalidate provider status cache
  async providerStatus(provider?: string) {
    if (provider) {
      // Note: We could add individual provider status cache if needed
    }
    await cacheDelete(CACHE_KEYS.PROVIDER_STATUS_ALL);
  },

  // Invalidate embedding providers cache
  async embeddingProviders() {
    await cacheDelete(CACHE_KEYS.EMBEDDING_PROVIDERS);
  },

  // Invalidate embedding models cache
  async embeddingModels(provider?: string) {
    if (provider) {
      await cacheDelete(`${CACHE_KEYS.EMBEDDING_MODELS}${provider}`);
    } else {
      await cacheDeletePattern(`${CACHE_KEYS.EMBEDDING_MODELS}*`);
    }
  },
};

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  // Sync stats from Redis first
  await cacheStats.sync();

  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    errors: cacheStats.errors,
    hitRate: cacheStats.hitRate,
    enabled: CACHE_CONFIG.enabled,
    connected: isConnected,
    connectionAttempts,
  };
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeCacheConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info("Redis connection closed gracefully");
    } catch (error) {
      logger.error({ err: error }, "Error closing Redis connection");
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
}

// Cache warming strategy for commonly accessed data
export async function warmCache() {
  try {
    // Dynamically import cached functions to avoid circular dependencies
    const { cachedProviderConfigs, cachedModelOverrides, cachedSettings, cachedInstalledServers } = await import("@/lib/db-cached");
    
    // Warm provider configs cache
    await cachedProviderConfigs();
    
    // Warm model overrides cache
    await cachedModelOverrides();
    
    // Warm settings cache
    await cachedSettings();
    
    // Warm installed servers cache
    await cachedInstalledServers();
    
    logger.info("Cache warming completed successfully");
  } catch (error) {
    logger.error({ err: error }, "Cache warming failed");
  }
}

// Initialize on module load
initRedisClient();

// Export client for advanced usage
export { redisClient, warmCache };
