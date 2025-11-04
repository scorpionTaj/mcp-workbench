/**
 * Pino Logger Configuration for MCP Workbench
 *
 * Features:
 * - Fast, async logging (50k+ logs/sec)
 * - Structured JSON logging for production
 * - Pretty printing for development
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Request ID tracking
 * - Performance monitoring
 *
 * @see {@link LOGGING_EVALUATION.md} for library comparison
 */

import pino from "pino";

/**
 * Log level configuration
 * - development: 'debug' (show everything)
 * - production: 'info' (hide debug logs)
 * - test: 'silent' (no logging during tests)
 */
const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

/**
 * Base logger configuration
 * Using browser-compatible settings to avoid worker thread issues in Next.js
 */
const pinoConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,

  // Use browser-compatible logging (no worker threads)
  browser: {
    asObject: true,
  },

  // Add timestamp to all logs
  timestamp: pino.stdTimeFunctions.isoTime,

  // Format errors properly
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
      };
    },
  },

  // Base context for all logs
  base: {
    env: process.env.NODE_ENV || "development",
    app: "mcp-workbench",
  },

  // Serialize errors with stack traces
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

/**
 * Main application logger
 */
export const logger = pino(pinoConfig);

/**
 * Create a child logger with additional context
 * Useful for tracking specific operations or requests
 *
 * @example
 * const reqLogger = createLogger({ requestId: '123' });
 * reqLogger.info('Processing request');
 */
export function createLogger(bindings: Record<string, any>) {
  return logger.child(bindings);
}

/**
 * Log levels explained:
 *
 * - trace: Very detailed debugging info (rarely used)
 * - debug: Detailed debugging info (development only)
 * - info: General informational messages (production)
 * - warn: Warning messages (potential issues)
 * - error: Error messages (failures that need attention)
 * - fatal: Critical errors (application crash)
 */

/**
 * Usage examples:
 *
 * @example Basic logging
 * logger.info('Server started on port 3000');
 * logger.error({ err: error }, 'Failed to connect to database');
 *
 * @example With context
 * const reqLogger = createLogger({ requestId: req.id, userId: user.id });
 * reqLogger.info('User logged in');
 *
 * @example Performance tracking
 * const start = Date.now();
 * // ... do work ...
 * logger.info({ duration: Date.now() - start }, 'Operation completed');
 */

// Export default logger
export default logger;
