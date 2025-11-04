/**
 * Performance Monitoring Middleware
 * Tracks API response times, errors, and system metrics
 */

import { NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";

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
