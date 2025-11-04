import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, count } from "drizzle-orm";
import { getCacheStats } from "@/lib/cache";
import { getPerformanceReport } from "@/lib/performance";
import logger from "@/lib/logger";
import * as os from "os";

export const dynamic = "force-dynamic";

interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  systemMemory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  database: {
    chats: number;
    messages: number;
    providers: number;
    installedServers: number;
    error?: string;
  };
  cache: {
    enabled: boolean;
    connected: boolean;
    hits: number;
    misses: number;
    errors: number;
    hitRate: string;
    totalRequests: number;
  };
  performance: {
    eventLoopLag: number;
    responseTime: number;
    databaseConnected: boolean;
    databaseResponseTime: number;
  };
  cpu: {
    cores: number;
    model: string;
    usage: number;
  };
}

/**
 * System metrics endpoint
 * GET /api/health/metrics - Returns detailed system metrics
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Get database statistics with error handling and timeout
    let databaseStats = {
      chats: 0,
      messages: 0,
      providers: 0,
      installedServers: 0,
      error: undefined as string | undefined,
    };

    let dbConnected = false;
    let dbResponseTime = 0;

    try {
      const dbStart = Date.now();

      // Optimize: Run counts in parallel with timeout
      const [chatsResult, messagesResult, providersResult, serversResult] =
        await Promise.race([
          Promise.all([
            db.select({ count: count() }).from(schema.chats),
            db.select({ count: count() }).from(schema.messages),
            db.select({ count: count() }).from(schema.providerConfigs),
            db.select({ count: count() }).from(schema.installedServers),
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Database timeout")), 3000)
          ),
        ]);

      dbResponseTime = Date.now() - dbStart;
      dbConnected = true;

      databaseStats = {
        chats: chatsResult[0].count,
        messages: messagesResult[0].count,
        providers: providersResult[0].count,
        installedServers: serversResult[0].count,
        error: undefined,
      };
    } catch (dbError) {
      dbResponseTime = Date.now() - startTime;
      // Log database error but continue with other metrics
      logger.warn(
        { err: dbError },
        "Failed to fetch database statistics for metrics"
      );
      databaseStats.error =
        dbError instanceof Error ? dbError.message : "Database unavailable";
    }

    // Get cache statistics (async to sync from Redis)
    const cacheStats = await getCacheStats();
    const cacheMetrics = {
      enabled: cacheStats.enabled,
      connected: cacheStats.connected,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      errors: cacheStats.errors,
      hitRate: `${cacheStats.hitRate.toFixed(2)}%`,
      totalRequests: cacheStats.hits + cacheStats.misses,
    };

    // CPU metrics
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "Unknown";
    const cpuCores = cpus.length;

    // Calculate CPU usage (average across all cores)
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - Math.round((100 * idle) / total);

    // Memory metrics (process memory)
    const memUsage = process.memoryUsage();

    // System RAM metrics
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;
    const memPercentage = (usedSystemMemory / totalSystemMemory) * 100;

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      systemMemory: {
        total: Math.round(totalSystemMemory / 1024 / 1024), // MB
        used: Math.round(usedSystemMemory / 1024 / 1024), // MB
        free: Math.round(freeSystemMemory / 1024 / 1024), // MB
        percentage: Math.round(memPercentage * 10) / 10, // One decimal place
      },
      database: {
        chats: databaseStats.chats,
        messages: databaseStats.messages,
        providers: databaseStats.providers,
        installedServers: databaseStats.installedServers,
        error: databaseStats.error,
      },
      cache: cacheMetrics,
      performance: {
        eventLoopLag: 0, // Would need actual measurement
        responseTime: Date.now() - startTime,
        databaseConnected: dbConnected,
        databaseResponseTime: dbResponseTime,
      },
      cpu: {
        cores: cpuCores,
        model: cpuModel,
        usage: cpuUsage,
      },
    };

    logger.info(
      {
        responseTime: metrics.performance.responseTime,
        memoryUsed: metrics.memory.heapUsed,
      },
      "Metrics collected"
    );

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error({ err: error }, "Failed to collect metrics");

    return NextResponse.json(
      {
        error: "Failed to collect metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
