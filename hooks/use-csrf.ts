/**
 * Hook to manage CSRF tokens for secure API requests
 */

import { useEffect, useState } from "react";

export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/security/csrf");
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const data = await response.json();
      setToken(data.token);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper function to make secure POST/PUT/DELETE/PATCH requests with CSRF token
   */
  const secureFetch = async (url: string, options: RequestInit = {}) => {
    if (!token && !loading) {
      await fetchCsrfToken();
    }

    const headers = new Headers(options.headers);
    if (token) {
      headers.set("x-csrf-token", token);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return {
    token,
    loading,
    error,
    refetch: fetchCsrfToken,
    secureFetch,
  };
}
