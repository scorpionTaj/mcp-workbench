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

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/health/metrics"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch health data"
      );
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Health</h1>
        </div>
        <Card className="border-rose-500/20 bg-rose-500/5">
          <div className="p-6 flex items-center gap-3 text-rose-500">
            <XCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch health data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              onClick={fetchHealth}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">System Health</h1>
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

      {/* Component Health Checks */}
      {health && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Component Status</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Database */}
            <Card className="hover:border-primary/50 transition-colors">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Database</h3>
                      <p className="text-xs text-muted-foreground">
                        Connection Status
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(health.checks.database.status)}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Response Time
                    </span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        health.checks.database.responseTime < 500
                          ? "text-emerald-500"
                          : health.checks.database.responseTime < 1000
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {health.checks.database.responseTime}ms
                    </span>
                  </div>
                  {health.checks.database.error && (
                    <div className="text-xs text-rose-500 p-2 rounded bg-rose-500/10 border border-rose-500/20">
                      {health.checks.database.error}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Memory */}
            <Card className="hover:border-primary/50 transition-colors">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MemoryStick className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Memory</h3>
                      <p className="text-xs text-muted-foreground">
                        System RAM
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(health.checks.memory.status)}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Used / Total
                    </span>
                    <span className="text-sm font-mono font-semibold">
                      {health.checks.memory.used} / {health.checks.memory.total}{" "}
                      MB
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Usage
                      </span>
                      <span
                        className={`text-sm font-mono font-semibold ${
                          health.checks.memory.percentage < 70
                            ? "text-emerald-500"
                            : health.checks.memory.percentage < 90
                            ? "text-amber-500"
                            : "text-rose-500"
                        }`}
                      >
                        {health.checks.memory.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          health.checks.memory.percentage < 70
                            ? "bg-emerald-500"
                            : health.checks.memory.percentage < 90
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            health.checks.memory.percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Disk */}
            <Card className="hover:border-primary/50 transition-colors">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <HardDrive className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Disk</h3>
                      <p className="text-xs text-muted-foreground">
                        Storage Status
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(health.checks.disk.status)}
                </div>
                <div className="space-y-3">
                  {health.checks.disk.error ? (
                    <div className="text-xs text-rose-500 p-2 rounded bg-rose-500/10 border border-rose-500/20">
                      {health.checks.disk.error}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Used / Total
                        </span>
                        <span className="text-sm font-mono font-semibold">
                          {health.checks.disk.used} / {health.checks.disk.total}{" "}
                          GB
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Usage
                          </span>
                          <span
                            className={`text-sm font-mono font-semibold ${
                              health.checks.disk.percentage < 80
                                ? "text-emerald-500"
                                : health.checks.disk.percentage < 90
                                ? "text-amber-500"
                                : "text-rose-500"
                            }`}
                          >
                            {health.checks.disk.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              health.checks.disk.percentage < 80
                                ? "bg-emerald-500"
                                : health.checks.disk.percentage < 90
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                health.checks.disk.percentage,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
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
