"use client";

import { StatusCard } from "@/components/status-card";
import { ProviderControls } from "@/components/provider-controls";
import { Activity, Clock, RefreshCw, Zap, Database, Cpu } from "lucide-react";
import { useProviders } from "@/hooks/use-providers";
import { useInstalledServers } from "@/hooks/use-installed-servers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardLoadingState } from "@/components/loading-states";

export default function DashboardPage() {
  const { providers, isLoading, refresh } = useProviders();
  const { servers: installedServers } = useInstalledServers();

  const ollamaStatus = providers.find((p) => p.provider === "ollama");
  const lmstudioStatus = providers.find((p) => p.provider === "lmstudio");

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
  const connectedProviders = providers.filter((p) => p.connected).length;
  const enabledServers = installedServers.filter((s) => s.enabled).length;

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-base">
            Monitor your LLM providers, MCP servers, and recent activity
          </p>
        </div>
        <Button
          onClick={() => refresh()}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          className="animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: "0ms" }}
        >
          <StatusCard
            title="Ollama"
            status={ollamaStatus?.connected ? "connected" : "disconnected"}
            description="Local LLM provider"
            details={
              ollamaStatus?.connected
                ? `${ollamaStatus.models.length} models available`
                : ollamaStatus?.error || "Not running on localhost:11434"
            }
            isLoading={isLoading}
          />
        </div>

        <div
          className="animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: "100ms" }}
        >
          <StatusCard
            title="LM Studio"
            status={lmstudioStatus?.connected ? "connected" : "disconnected"}
            description="Local LLM provider"
            details={
              lmstudioStatus?.connected
                ? `${lmstudioStatus.models.length} models available`
                : lmstudioStatus?.error || "Not running on localhost:1234"
            }
            isLoading={isLoading}
          />
        </div>

        <div
          className="animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: "200ms" }}
        >
          <StatusCard
            title="MCP Servers"
            status={
              enabledServers > 0
                ? "connected"
                : installedServers.length > 0
                ? "idle"
                : "disconnected"
            }
            description="Connected servers"
            details={
              installedServers.length > 0
                ? `${installedServers.length} installed, ${enabledServers} enabled`
                : "No servers installed"
            }
            isLoading={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="p-6 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">System Status</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Connected Providers</span>
              </div>
              <span className="font-semibold text-lg">
                {connectedProviders} / 2
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Available Models</span>
              </div>
              <span className="font-semibold text-lg">{totalModels}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">MCP Servers</span>
              </div>
              <span className="font-semibold text-lg">{enabledServers}</span>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm card-hover animate-in slide-in-from-bottom duration-500"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Quick Start</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors group">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-semibold text-primary">
                1
              </div>
              <span className="text-sm pt-1 text-muted-foreground group-hover:text-foreground transition-colors">
                Install Ollama or LM Studio and start the server
              </span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors group">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-semibold text-primary">
                2
              </div>
              <span className="text-sm pt-1 text-muted-foreground group-hover:text-foreground transition-colors">
                Browse the MCP Registry and install servers
              </span>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors group">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-semibold text-primary">
                3
              </div>
              <span className="text-sm pt-1 text-muted-foreground group-hover:text-foreground transition-colors">
                Start a chat and use MCP tools with your local models
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <div
        className="animate-in slide-in-from-bottom duration-500"
        style={{ animationDelay: "500ms" }}
      >
        <ProviderControls />
      </div>
    </div>
  );
}
