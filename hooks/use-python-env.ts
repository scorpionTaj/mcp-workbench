"use client";

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";

interface PythonEnv {
  path: string;
  version: string;
  type: "system" | "venv" | "conda" | "pyenv" | "custom";
  name?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePythonEnv() {
  const [selectedEnv, setSelectedEnv] = useState<PythonEnv | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Fetch detected environments
  const { data, error, isLoading, mutate } = useSWR<{
    environments: PythonEnv[];
    count: number;
  }>("/api/python/detect", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes - Python envs don't change frequently
  });

  // Load selected environment from localStorage and validate it exists
  useEffect(() => {
    const saved = localStorage.getItem("python-env");
    if (saved) {
      try {
        const env = JSON.parse(saved);
        // Validate the saved environment still exists by checking against detected environments
        // We'll do this validation after environments are loaded
        setSelectedEnv(env);
      } catch {
        localStorage.removeItem("python-env");
      }
    }
  }, []);

  // Validate saved environment against detected environments
  useEffect(() => {
    if (selectedEnv && data?.environments) {
      // Check if the selected environment still exists in detected environments
      const envExists = data.environments.some(
        (env) => env.path === selectedEnv.path
      );

      // If environment no longer exists, clear it
      if (!envExists && selectedEnv.type !== "custom") {
        console.warn(
          "[Python Env] Selected environment no longer exists, clearing selection"
        );
        setSelectedEnv(null);
        localStorage.removeItem("python-env");
      }
    }
  }, [selectedEnv, data?.environments]);

  // Save selected environment to localStorage
  const selectEnvironment = useCallback((env: PythonEnv | null) => {
    setSelectedEnv(env);
    if (env) {
      localStorage.setItem("python-env", JSON.stringify(env));
    } else {
      localStorage.removeItem("python-env");
    }
  }, []);

  // Validate custom Python path
  const validateCustomPath = useCallback(
    async (path: string): Promise<PythonEnv | null> => {
      setIsValidating(true);
      try {
        const response = await fetch("/api/python/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Invalid Python path");
        }

        const env = await response.json();
        return env as PythonEnv;
      } catch (error) {
        console.error("Failed to validate Python path:", error);
        throw error;
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  // Refresh detected environments
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    environments: data?.environments || [],
    count: data?.count || 0,
    selectedEnv,
    selectEnvironment,
    validateCustomPath,
    isValidating,
    isLoading,
    error,
    refresh,
  };
}
