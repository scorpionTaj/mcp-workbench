"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Database,
  MemoryStick,
  HardDrive,
  Server,
  Activity,
  Cpu,
} from "lucide-react";

interface HealthStatus {
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
  error?: string;
}

interface Metrics {
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
  cache?: {
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

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(30);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/health/metrics"),
      ]);

      // Always parse the response, even if status is not ok
      if (healthRes.status === 200) {
        const healthData = await healthRes.json();
        setHealth(healthData);
        // Only clear error if we got valid data
        if (healthData && healthData.checks) {
          setError(null);
          setLastUpdated(new Date());
          setNextRefreshIn(30); // Reset countdown
        }
      } else {
        throw new Error(`Health API returned status ${healthRes.status}`);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error("Health check error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch health data"
      );
      // Keep existing health data if available, just show error banner
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for next refresh
  useEffect(() => {
    if (!lastUpdated) return;

    const timer = setInterval(() => {
      setNextRefreshIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-rose-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "degraded":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "unhealthy":
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-muted-foreground bg-muted/10 border-muted/20";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading health status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {health && (
            <Badge
              variant="outline"
              className={`px-3 py-1 ${getStatusColor(health.status)}`}
            >
              {health.status.toUpperCase()}
            </Badge>
          )}
          <Button
            onClick={fetchHealth}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner - Show but don't block UI */}
      {error && (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <div className="p-4 flex items-center gap-3 text-rose-500">
            <XCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Connection Issue</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              onClick={fetchHealth}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Overall Status Card */}
      {health && (
        <Card className={`border-2 ${getStatusColor(health.status)}`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                <div>
                  <h2 className="text-xl font-semibold">System Status</h2>
                  <p className="text-sm text-muted-foreground">
                    All systems{" "}
                    {health.status === "healthy"
                      ? "operational"
                      : health.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Uptime
                </p>
                <p className="text-lg font-semibold font-mono">
                  {formatUptime(health.uptime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Version
                </p>
                <p className="text-lg font-semibold font-mono">
                  {health.version}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Environment
                </p>
                <p className="text-lg font-semibold font-mono capitalize">
                  {health.environment}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Last Check
                </p>
                <p className="text-lg font-semibold font-mono">
                  {new Date(health.timestamp).toLocaleTimeString("en-GB", {
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* System Metrics */}
      {metrics && (
        <div>
          <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* System Info */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">System Information</h3>
                    <p className="text-xs text-muted-foreground">
                      Runtime details
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Node Version
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.system.nodeVersion}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Platform
                    </span>
                    <span className="text-sm font-mono font-semibold capitalize">
                      {metrics.system.platform}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Architecture
                    </span>
                    <span className="text-sm font-mono font-semibold uppercase">
                      {metrics.system.arch}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Database Stats */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Database Statistics</h3>
                    <p className="text-xs text-muted-foreground">
                      Data overview
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {metrics.database.error ? (
                    <div className="text-xs text-amber-500 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="font-semibold mb-1">Database Unavailable</p>
                      <p className="text-muted-foreground">
                        {metrics.database.error}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">
                          Total Chats
                        </span>
                        <span className="text-sm font-mono font-semibold text-primary">
                          {metrics.database.chats.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">
                          Total Messages
                        </span>
                        <span className="text-sm font-mono font-semibold text-primary">
                          {metrics.database.messages.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">
                          Providers
                        </span>
                        <span className="text-sm font-mono font-semibold text-primary">
                          {metrics.database.providers}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">
                          MCP Servers
                        </span>
                        <span className="text-sm font-mono font-semibold text-primary">
                          {metrics.database.installedServers}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Memory Details */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MemoryStick className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Memory Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Process memory usage
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Heap Used
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.memory.heapUsed} MB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Heap Total
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.memory.heapTotal} MB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      External
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.memory.external} MB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">RSS</span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.memory.rss} MB
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* System RAM (PC Memory) */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MemoryStick className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">System RAM</h3>
                    <p className="text-xs text-muted-foreground">
                      PC memory usage
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Total RAM
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {(metrics.systemMemory.total / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Used RAM
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {(metrics.systemMemory.used / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Free RAM
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {(metrics.systemMemory.free / 1024).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Usage</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        metrics.systemMemory.percentage < 70
                          ? "text-emerald-500"
                          : metrics.systemMemory.percentage < 85
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {metrics.systemMemory.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        metrics.systemMemory.percentage < 70
                          ? "bg-emerald-500"
                          : metrics.systemMemory.percentage < 85
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${metrics.systemMemory.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* CPU Usage */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Cpu className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">CPU Usage</h3>
                    <p className="text-xs text-muted-foreground">
                      Processor metrics
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-xs font-mono font-semibold text-right max-w-[60%] wrap-break-word">
                      {metrics.cpu.model}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Cores</span>
                    <span className="text-sm font-mono font-semibold">
                      {metrics.cpu.cores}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Usage</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        metrics.cpu.usage < 70
                          ? "text-emerald-500"
                          : metrics.cpu.usage < 85
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {metrics.cpu.usage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        metrics.cpu.usage < 70
                          ? "bg-emerald-500"
                          : metrics.cpu.usage < 85
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{
                        width: `${Math.min(metrics.cpu.usage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Cache Statistics */}
            {metrics.cache && (
              <Card>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Cache Statistics</h3>
                      <p className="text-xs text-muted-foreground">
                        Redis performance
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <div className="flex items-center gap-2">
                        {metrics.cache.connected ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            metrics.cache.connected
                              ? "text-emerald-500"
                              : "text-rose-500"
                          }`}
                        >
                          {metrics.cache.connected
                            ? "Connected"
                            : "Disconnected"}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Hit Rate
                      </span>
                      <span
                        className={`text-sm font-mono font-semibold ${
                          parseFloat(metrics.cache.hitRate) > 80
                            ? "text-emerald-500"
                            : parseFloat(metrics.cache.hitRate) > 50
                            ? "text-amber-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {metrics.cache.hitRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">
                        Total Requests
                      </span>
                      <span className="text-sm font-mono font-semibold">
                        {metrics.cache.totalRequests.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">
                        Hits / Misses
                      </span>
                      <span className="text-sm font-mono font-semibold">
                        <span className="text-emerald-500">
                          {metrics.cache.hits}
                        </span>
                        {" / "}
                        <span className="text-amber-500">
                          {metrics.cache.misses}
                        </span>
                      </span>
                    </div>
                    {metrics.cache.errors > 0 && (
                      <div className="text-xs text-amber-500 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        {metrics.cache.errors} errors detected
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Performance */}
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Performance</h3>
                    <p className="text-xs text-muted-foreground">
                      Response metrics
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      API Response
                    </span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        metrics.performance.responseTime < 100
                          ? "text-emerald-500"
                          : metrics.performance.responseTime < 500
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {metrics.performance.responseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      DB Connection
                    </span>
                    <div className="flex items-center gap-2">
                      {metrics.performance.databaseConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          metrics.performance.databaseConnected
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}
                      >
                        {metrics.performance.databaseConnected
                          ? "Connected"
                          : "Disconnected"}
                      </span>
                    </div>
                  </div>
                  {metrics.performance.databaseConnected && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">
                        DB Response
                      </span>
                      <span
                        className={`text-sm font-mono font-semibold ${
                          metrics.performance.databaseResponseTime < 100
                            ? "text-emerald-500"
                            : metrics.performance.databaseResponseTime < 500
                            ? "text-amber-500"
                            : "text-rose-500"
                        }`}
                      >
                        {metrics.performance.databaseResponseTime}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4" />
        <p>Auto-refreshing every 30 seconds</p>
      </div>
    </div>
  );
}
