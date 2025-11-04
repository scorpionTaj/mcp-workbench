/**
 * Performance Monitoring Middleware
 * Tracks API response times, errors, and system metrics
 * Enhanced with cache performance monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";
import { getCacheStats } from "@/lib/cache";

interface PerformanceMetrics {
  path: string;
  method: string;
  status: number;
  duration: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Performance monitoring wrapper for API routes
 * Logs request/response details and timing
 */
export async function withPerformanceMonitoring(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  logger: Logger
): Promise<NextResponse> {
  const startTime = Date.now();
  const path = new URL(request.url).pathname;
  const method = request.method;

  // Generate unique request ID
  const requestId = crypto.randomUUID();

  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    path,
    method,
  });

  reqLogger.info("Request started");

  try {
    // Execute the handler
    const response = await handler(request);

    const duration = Date.now() - startTime;
    const status = response.status;

    // Log successful request
    reqLogger.info(
      {
        status,
        duration,
        success: status < 400,
      },
      "Request completed"
    );

    // Add performance headers to response
    response.headers.set("X-Response-Time", `${duration}ms`);
    response.headers.set("X-Request-Id", requestId);

    // Warn if response is slow
    if (duration > 1000) {
      reqLogger.warn(
        {
          duration,
          threshold: 1000,
        },
        "Slow response detected"
      );
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error with full context
    reqLogger.error(
      {
        err: error,
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Request failed"
    );

    // Re-throw to let error boundary handle it
    throw error;
  }
}

/**
 * Simple performance tracker for non-HTTP operations
 */
export class PerformanceTracker {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();

    this.logger.debug({ operation }, "Operation started");
  }

  /**
   * Mark operation as complete and log duration
   */
  complete(metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    this.logger.info(
      {
        operation: this.operation,
        duration,
        ...metadata,
      },
      "Operation completed"
    );

    return duration;
  }

  /**
   * Mark operation as failed and log error
   */
  fail(error: Error, metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    this.logger.error(
      {
        operation: this.operation,
        duration,
        err: error,
        ...metadata,
      },
      "Operation failed"
    );

    return duration;
  }
}

/**
 * Track database query performance
 */
export function trackQuery<T>(
  logger: Logger,
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const tracker = new PerformanceTracker(logger, `db:${queryName}`);

  return queryFn()
    .then((result) => {
      tracker.complete({
        resultCount: Array.isArray(result) ? result.length : 1,
      });
      return result;
    })
    .catch((error) => {
      tracker.fail(error);
      throw error;
    });
}

/**
 * System metrics collector
 */
export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Record a metric value
   */
  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    this.metrics.get(metric)!.push(value);

    // Keep only last 1000 values
    const values = this.metrics.get(metric)!;
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getStats(metric: string) {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Log all metrics
   */
  logMetrics() {
    const allMetrics: Record<string, any> = {};

    for (const [name, _] of this.metrics) {
      allMetrics[name] = this.getStats(name);
    }

    this.logger.info({ metrics: allMetrics }, "System metrics");
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
  }
}

/**
 * Global metrics collector instance
 * Use this to track system-wide metrics
 */
let globalMetrics: MetricsCollector | null = null;

export function getMetricsCollector(logger: Logger): MetricsCollector {
  if (!globalMetrics) {
    globalMetrics = new MetricsCollector(logger);

    // Log metrics every 5 minutes
    setInterval(() => {
      globalMetrics?.logMetrics();
    }, 5 * 60 * 1000);
  }

  return globalMetrics;
}

/**
 * Get comprehensive performance report with cache stats
 */
export async function getPerformanceReport(logger: Logger) {
  const cache = await getCacheStats();
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const report = {
    timestamp: new Date().toISOString(),
    cache: {
      enabled: cache.enabled,
      connected: cache.connected,
      hits: cache.hits,
      misses: cache.misses,
      errors: cache.errors,
      hitRate: cache.hitRate.toFixed(2) + "%",
      totalRequests: cache.hits + cache.misses,
    },
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
    },
    system: {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  logger.info({ performance: report }, "Performance Report");
  return report;
}

/**
 * Get cache performance recommendations
 */
export async function getCacheRecommendations(): Promise<string[]> {
  const stats = await getCacheStats();
  const recommendations: string[] = [];

  if (!stats.enabled) {
    recommendations.push(
      "🔴 CRITICAL: Redis cache is disabled. Enable it with CACHE_ENABLED=true for better performance."
    );
  } else if (!stats.connected) {
    recommendations.push(
      "🔴 CRITICAL: Redis cache is not connected. Ensure Redis server is running."
    );
  } else {
    const totalRequests = stats.hits + stats.misses;

    if (totalRequests > 100 && stats.hitRate < 50) {
      recommendations.push(
        `⚠️ WARNING: Cache hit rate is low (${stats.hitRate.toFixed(
          2
        )}%). Consider increasing TTL values.`
      );
    } else if (stats.hitRate >= 80) {
      recommendations.push(
        `✅ EXCELLENT: Cache hit rate is ${stats.hitRate.toFixed(
          2
        )}% - Cache is working effectively!`
      );
    } else if (stats.hitRate >= 60) {
      recommendations.push(
        `✅ GOOD: Cache hit rate is ${stats.hitRate.toFixed(
          2
        )}% - Performance is good.`
      );
    }

    if (stats.errors > 10) {
      recommendations.push(
        `⚠️ WARNING: ${stats.errors} cache errors detected. Check Redis logs.`
      );
    }
  }

  return recommendations;
}
