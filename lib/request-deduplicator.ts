/**
 * Request Deduplication Utility
 *
 * Prevents duplicate API calls for the same data within a short time window.
 * Uses in-memory cache to track pending requests and returns the same promise
 * for duplicate requests.
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly DEDUP_WINDOW_MS = 1000; // 1 second deduplication window

  /**
   * Deduplicate a request by key
   * If the same request is already in flight, returns the existing promise
   * Otherwise, executes the request function and caches the promise
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: { windowMs?: number }
  ): Promise<T> {
    const windowMs = options?.windowMs ?? this.DEDUP_WINDOW_MS;
    const now = Date.now();

    // Check if we have a pending request for this key
    const pending = this.pendingRequests.get(key);

    if (pending && now - pending.timestamp < windowMs) {
      // Return the existing promise
      return pending.promise;
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Clean up after completion
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Clean up on error too
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });

    return promise;
  }

  /**
   * Clear a specific request from the cache
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get the number of pending requests
   */
  get size(): number {
    return this.pendingRequests.size;
  }
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper function for easy use
 *
 * @example
 * const data = await deduplicateRequest(
 *   'users-list',
 *   () => fetch('/api/users').then(r => r.json())
 * );
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: { windowMs?: number }
): Promise<T> {
  return requestDeduplicator.deduplicate(key, requestFn, options);
}
