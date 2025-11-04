"use client";

import { useRuntime } from "@/hooks/use-runtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Terminal } from "lucide-react";
import { useState } from "react";

export function RuntimeDetector() {
  const {
    environment,
    loading,
    error,
    preferredRuntime,
    preferredPackageManager,
    hasNode,
    hasBun,
    hasNpm,
    hasPnpm,
    hasYarn,
    refresh,
  } = useRuntime();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Detecting runtime environment...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass border-red-500/30 bg-red-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                Failed to detect runtime: {error}
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Terminal className="w-5 h-5 text-violet-500" />
            </div>
            <span className="text-gradient">Runtime Environment</span>
          </div>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Runtimes */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span>Runtimes</span>
            <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20">
              Preferred: {preferredRuntime}
            </Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Node.js */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                hasNode
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {hasNode ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">Node.js</p>
                  {environment?.runtimes.node && (
                    <p className="text-xs text-muted-foreground">
                      {environment.runtimes.node.version}
                    </p>
                  )}
                </div>
              </div>
              {hasNode && preferredRuntime === "node" && (
                <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs">
                  Preferred
                </Badge>
              )}
            </div>

            {/* Bun */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                hasBun
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {hasBun ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">Bun</p>
                  {environment?.runtimes.bun && (
                    <p className="text-xs text-muted-foreground">
                      {environment.runtimes.bun.version}
                    </p>
                  )}
                </div>
              </div>
              {hasBun && preferredRuntime === "bun" && (
                <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-xs">
                  Preferred
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Package Managers */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span>Package Managers</span>
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              Preferred: {preferredPackageManager}
            </Badge>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* npm */}
            <div
              className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                hasNpm
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              {hasNpm ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground mb-2" />
              )}
              <p className="font-medium text-sm">npm</p>
              {environment?.packageManagers.npm && (
                <p className="text-xs text-muted-foreground text-center">
                  {environment.packageManagers.npm.version}
                </p>
              )}
              {hasNpm && preferredPackageManager === "npm" && (
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs mt-2">
                  Preferred
                </Badge>
              )}
            </div>

            {/* pnpm */}
            <div
              className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                hasPnpm
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              {hasPnpm ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground mb-2" />
              )}
              <p className="font-medium text-sm">pnpm</p>
              {environment?.packageManagers.pnpm && (
                <p className="text-xs text-muted-foreground text-center">
                  {environment.packageManagers.pnpm.version}
                </p>
              )}
              {hasPnpm && preferredPackageManager === "pnpm" && (
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs mt-2">
                  Preferred
                </Badge>
              )}
            </div>

            {/* Yarn */}
            <div
              className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                hasYarn
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              {hasYarn ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground mb-2" />
              )}
              <p className="font-medium text-sm">Yarn</p>
              {environment?.packageManagers.yarn && (
                <p className="text-xs text-muted-foreground text-center">
                  {environment.packageManagers.yarn.version}
                </p>
              )}
              {hasYarn && preferredPackageManager === "yarn" && (
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs mt-2">
                  Preferred
                </Badge>
              )}
            </div>

            {/* Bun (as package manager) */}
            <div
              className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                hasBun
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              {hasBun ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground mb-2" />
              )}
              <p className="font-medium text-sm">Bun</p>
              {environment?.packageManagers.bun && (
                <p className="text-xs text-muted-foreground text-center">
                  {environment.packageManagers.bun.version}
                </p>
              )}
              {hasBun && preferredPackageManager === "bun" && (
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs mt-2">
                  Preferred
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Auto-detected:</strong> MCP
            servers will be installed using {preferredPackageManager} and run
            with {preferredRuntime} by default. You can override these settings
            in the MCP server configuration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
