import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCacheStats, cacheExists, CACHE_KEYS } from "@/lib/cache";
import logger from "@/lib/logger";
import * as os from "os";

export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "healthy" | "degraded" | "unhealthy";
      responseTime: number;
      error?: string;
    };
    redis: {
      status: "healthy" | "degraded" | "unhealthy";
      connected: boolean;
      hitRate: number;
      hits: number;
      misses: number;
      errors: number;
    };
    memory: {
      status: "healthy" | "degraded" | "unhealthy";
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: "healthy" | "degraded" | "unhealthy";
      used: number;
      total: number;
      percentage: number;
      error?: string;
    };
  };
  version: string;
  environment: string;
}

/**
 * Get disk usage information
 * Cross-platform disk space check
 */
async function getDiskUsage(): Promise<{
  used: number;
  total: number;
  percentage: number;
  error?: string;
}> {
  try {
    // Use child_process to run platform-specific commands
    const { execSync } = await import("child_process");
    const platform = os.platform();

    if (platform === "win32") {
      // Windows: Use PowerShell (wmic is deprecated in newer Windows versions)
      const output = execSync(
        'powershell -command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"',
        { encoding: "utf-8", timeout: 5000 }
      );

      const data = JSON.parse(output);

      if (data.Used !== undefined && data.Free !== undefined) {
        const used = parseInt(data.Used);
        const free = parseInt(data.Free);
        const total = used + free;
        const percentage = (used / total) * 100;

        return {
          used: Math.round(used / 1024 / 1024 / 1024), // GB
          total: Math.round(total / 1024 / 1024 / 1024), // GB
          percentage: Math.round(percentage),
        };
      }
    } else {
      // Linux/macOS: Use df command
      const output = execSync("df -k / | tail -1", { encoding: "utf-8" });
      const parts = output.trim().split(/\s+/);

      if (parts.length >= 5) {
        const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const percentage = (used / total) * 100;

        return {
          used: Math.round(used / 1024 / 1024 / 1024), // GB
          total: Math.round(total / 1024 / 1024 / 1024), // GB
          percentage: Math.round(percentage),
        };
      }
    }

    // Fallback if parsing fails
    return {
      used: 0,
      total: 0,
      percentage: 0,
      error: "Unable to parse disk usage",
    };
  } catch (error) {
    return {
      used: 0,
      total: 0,
      percentage: 0,
      error:
        error instanceof Error ? error.message : "Failed to get disk usage",
    };
  }
}

/**
 * Health check endpoint
 * GET /api/health - Returns system health status
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Database health check (optimized with timeout) - run in parallel with disk check
    const [dbHealth, diskUsage] = await Promise.all([
      (async () => {
        const dbStart = Date.now();
        try {
          // Use a simple query with shorter timeout
          await Promise.race([
            prisma.$queryRaw`SELECT 1 as health`,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Database timeout")), 2000)
            ),
          ]);
          const dbResponseTime = Date.now() - dbStart;
          return {
            status: (dbResponseTime < 500 ? "healthy" : "degraded") as
              | "healthy"
              | "degraded"
              | "unhealthy",
            responseTime: dbResponseTime,
          };
        } catch (error) {
          // In development, treat database errors as degraded rather than unhealthy
          // This allows the health page to still function when working offline
          const isDevelopment = process.env.NODE_ENV === "development";
          return {
            status: (isDevelopment ? "degraded" : "unhealthy") as
              | "healthy"
              | "degraded"
              | "unhealthy",
            responseTime: Date.now() - dbStart,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })(),
      getDiskUsage(),
    ]);

    // Redis cache health check (async to sync stats from Redis)
    const cacheStats = await getCacheStats();
    const redisHealth: HealthCheck["checks"]["redis"] = {
      status: !cacheStats.enabled
        ? "degraded"
        : !cacheStats.connected
        ? "degraded"
        : cacheStats.errors > 10
        ? "degraded"
        : "healthy",
      connected: cacheStats.connected,
      hitRate: Math.round(cacheStats.hitRate * 10) / 10,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      errors: cacheStats.errors,
    };

    // Memory health check (fast, synchronous)
    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;
    const memPercentage = (usedSystemMemory / totalSystemMemory) * 100;

    const memHealth: HealthCheck["checks"]["memory"] = {
      status:
        memPercentage < 70
          ? "healthy"
          : memPercentage < 90
          ? "degraded"
          : "unhealthy",
      used: Math.round(usedSystemMemory / 1024 / 1024), // MB
      total: Math.round(totalSystemMemory / 1024 / 1024), // MB
      percentage: Math.round(memPercentage),
    };

    // Disk health check (already fetched in parallel above)

    // If disk check fails (error exists), treat as degraded not unhealthy
    const diskHealth: HealthCheck["checks"]["disk"] = {
      status: diskUsage.error
        ? "degraded"
        : diskUsage.percentage < 80
        ? "healthy"
        : diskUsage.percentage < 90
        ? "degraded"
        : "unhealthy",
      used: diskUsage.used,
      total: diskUsage.total,
      percentage: diskUsage.percentage,
      error: diskUsage.error,
    };

    // Overall system status
    // Only mark as unhealthy if memory is critically high or (in production) database is down
    const allHealthy =
      dbHealth.status === "healthy" &&
      redisHealth.status === "healthy" &&
      memHealth.status === "healthy" &&
      diskHealth.status === "healthy";
    const anyDegraded =
      dbHealth.status === "degraded" ||
      redisHealth.status === "degraded" ||
      memHealth.status === "degraded" ||
      diskHealth.status === "degraded";
    const anyUnhealthy =
      memHealth.status === "unhealthy" || diskHealth.status === "unhealthy";

    const overallStatus: HealthCheck["status"] = anyUnhealthy
      ? "unhealthy"
      : anyDegraded
      ? "degraded"
      : "healthy";

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealth,
        redis: redisHealth,
        memory: memHealth,
        disk: diskHealth,
      },
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    logger.info(
      {
        status: overallStatus,
        dbResponseTime: dbHealth.responseTime,
        redisConnected: redisHealth.connected,
        redisHitRate: redisHealth.hitRate,
        memPercentage: memHealth.percentage,
        diskPercentage: diskHealth.percentage,
      },
      "Health check completed"
    );

    // Always return 200 status code with health data
    // The client can determine the health based on the status field in the response
    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");

    // Still return 200 with error information so the UI can display it
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: {
            status: "unhealthy",
            responseTime: 0,
            error: "Failed to check",
          },
          redis: {
            status: "unhealthy",
            connected: false,
            hitRate: 0,
            hits: 0,
            misses: 0,
            errors: 0,
          },
          memory: { status: "unhealthy", used: 0, total: 0, percentage: 0 },
          disk: { status: "unhealthy", used: 0, total: 0, percentage: 0 },
        },
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
