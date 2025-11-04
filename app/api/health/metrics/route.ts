import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  database: {
    chats: number;
    messages: number;
    providers: number;
    installedServers: number;
    error?: string;
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
    // Get database statistics with error handling
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
      const [chatsCount, messagesCount, providersCount, serversCount] =
        await Promise.all([
          prisma.chat.count(),
          prisma.message.count(),
          prisma.providerConfig.count(),
          prisma.installedServer.count(),
        ]);

      dbResponseTime = Date.now() - dbStart;
      dbConnected = true;

      databaseStats = {
        chats: chatsCount,
        messages: messagesCount,
        providers: providersCount,
        installedServers: serversCount,
        error: undefined,
      };
    } catch (dbError) {
      // Log database error but continue with other metrics
      logger.warn(
        { err: dbError },
        "Failed to fetch database statistics for metrics"
      );
      databaseStats.error =
        dbError instanceof Error ? dbError.message : "Database unavailable";
    }

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

    // Memory metrics
    const memUsage = process.memoryUsage();

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
      database: {
        chats: databaseStats.chats,
        messages: databaseStats.messages,
        providers: databaseStats.providers,
        installedServers: databaseStats.installedServers,
        error: databaseStats.error,
      },
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
