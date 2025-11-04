import { useEffect, useState } from "react";
import type {
  DetectedEnvironment,
  Runtime,
  PackageManager,
} from "@/lib/runtime-detection";

interface UseRuntimeReturn {
  environment: DetectedEnvironment | null;
  loading: boolean;
  error: string | null;
  preferredRuntime: Runtime;
  preferredPackageManager: PackageManager;
  hasNode: boolean;
  hasBun: boolean;
  hasNpm: boolean;
  hasPnpm: boolean;
  hasYarn: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to detect and use runtime environment information
 */
export function useRuntime(): UseRuntimeReturn {
  const [environment, setEnvironment] = useState<DetectedEnvironment | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/runtime");
      const data = await response.json();

      if (data.success) {
        setEnvironment(data.data);
      } else {
        setError(data.error || "Failed to detect runtime");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch runtime information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironment();
  }, []);

  return {
    environment,
    loading,
    error,
    preferredRuntime: environment?.preferredRuntime || "node",
    preferredPackageManager: environment?.preferredPackageManager || "npm",
    hasNode: !!environment?.runtimes.node?.available,
    hasBun: !!environment?.runtimes.bun?.available,
    hasNpm: !!environment?.packageManagers.npm?.available,
    hasPnpm: !!environment?.packageManagers.pnpm?.available,
    hasYarn: !!environment?.packageManagers.yarn?.available,
    refresh: fetchEnvironment,
  };
}
