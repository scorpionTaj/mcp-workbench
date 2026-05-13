"use client";

import {
  Activity,
  TrendingUp,
  RefreshCw,
  Zap,
  Database,
  Server,
  Globe,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Settings,
  BarChart3,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  Plug,
  Code2,
  BookOpen,
  Gauge,
} from "lucide-react";
import { useProviders } from "@/hooks/use-providers";
import { useInstalledServers } from "@/hooks/use-installed-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLoadingState } from "@/components/loading-states";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function DashboardPage() {
  const { providers, isLoading, refresh } = useProviders();
  const { servers: installedServers } = useInstalledServers();

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
  const connectedProviders = providers.filter((p) => p.connected).length;
  const enabledServers = installedServers.filter((s) => s.enabled).length;
  const localProviders = providers.filter((p) => p.type === "local");
  const remoteProviders = providers.filter((p) => p.type === "remote");
  const healthScore =
    providers.length > 0
      ? Math.round((connectedProviders / providers.length) * 100)
      : 0;

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Section - Enhanced */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-linear-to-br from-primary/10 via-background to-background/50 p-10 md:p-12">
        <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-secondary/5 opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 opacity-50" />

        <div className="relative space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-linear-to-br from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/30 shadow-lg shadow-primary/20">
                  <Sparkles className="w-7 h-7 text-primary animate-pulse-glow" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary/80 uppercase tracking-wider">
                    Dashboard
                  </p>
                  <h1 className="text-5xl font-bold tracking-tight bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                    Welcome Back
                  </h1>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Your AI development environment{" "}
                <span
                  className={`font-semibold ${
                    healthScore >= 80
                      ? "text-emerald-500"
                      : healthScore >= 50
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                >
                  {healthScore >= 80
                    ? "is running smoothly"
                    : healthScore >= 50
                      ? "needs attention"
                      : "requires action"}
                </span>
                .
                {providers.length === 0 &&
                  " Get started by adding your first provider."}
              </p>
            </div>
            <Button
              onClick={() => refresh()}
              variant="default"
              size="lg"
              disabled={isLoading}
              className="gap-2 btn-glow shadow-lg shrink-0"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Mini Status Bar */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Health</p>
                <p className="text-sm font-semibold">{healthScore}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Plug className="w-4 h-4 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Providers</p>
                <p className="text-sm font-semibold">
                  {connectedProviders}/{providers.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary/60" />
              <div>
                <p className="text-xs text-muted-foreground">Models</p>
                <p className="text-sm font-semibold">{totalModels}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* System Health */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-in zoom-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div
                className={`p-3 rounded-xl transition-all ${
                  healthScore >= 80
                    ? "bg-emerald-500/10"
                    : healthScore >= 50
                      ? "bg-amber-500/10"
                      : "bg-red-500/10"
                }`}
              >
                <Gauge
                  className={`w-6 h-6 ${
                    healthScore >= 80
                      ? "text-emerald-500"
                      : healthScore >= 50
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                />
              </div>
              <Badge
                className={`gap-1 ${
                  healthScore >= 80
                    ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/30"
                    : healthScore >= 50
                      ? "bg-amber-500/20 text-amber-700 border-amber-500/30"
                      : "bg-red-500/20 text-red-700 border-red-500/30"
                }`}
              >
                {healthScore >= 80 ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : healthScore >= 50 ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {healthScore}%
              </Badge>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {connectedProviders}/{providers.length}
            </h3>
            <p className="text-sm text-muted-foreground">Providers Connected</p>
            <Progress value={healthScore} className="mt-4 h-2" />
          </CardContent>
        </Card>

        {/* Available Models */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-in zoom-in delay-75">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="p-3 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                <Zap className="w-6 h-6 text-violet-500" />
              </div>
              <TrendingUp className="w-5 h-5 text-violet-500/60" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{totalModels}</h3>
            <p className="text-sm text-muted-foreground">AI Models</p>
            <p className="text-xs text-muted-foreground/70 mt-3">
              {providers.length} provider{providers.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* MCP Servers */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-in zoom-in delay-150">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Database className="w-6 h-6 text-emerald-500" />
              </div>
              {enabledServers > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                  {enabledServers} Active
                </Badge>
              )}
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {installedServers.length}
            </h3>
            <p className="text-sm text-muted-foreground">MCP Servers</p>
            <p className="text-xs text-muted-foreground/70 mt-3">
              {installedServers.length === 0
                ? "No servers yet"
                : `${enabledServers} enabled`}
            </p>
          </CardContent>
        </Card>

        {/* Provider Mix */}
        <Card className="border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 animate-in zoom-in delay-225">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Plug className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex gap-2">
                {localProviders.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1.5">
                    <Server className="w-3 h-3" />
                    {localProviders.length}
                  </Badge>
                )}
                {remoteProviders.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1.5">
                    <Globe className="w-3 h-3" />
                    {remoteProviders.length}
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">
              {localProviders.length + remoteProviders.length}
            </h3>
            <p className="text-sm text-muted-foreground">Providers</p>
            <p className="text-xs text-muted-foreground/70 mt-3">
              {localProviders.length} local • {remoteProviders.length} remote
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Connected Providers</h2>
              <p className="text-sm text-muted-foreground">
                Manage your AI provider connections
              </p>
            </div>
            <Link href="/providers">
              <Button variant="outline" size="sm" className="gap-2">
                Settings
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {providers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                  <Server className="w-12 h-12 text-primary/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    No Providers Connected
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect your first AI provider to start building. Local
                    providers like Ollama work offline, while cloud providers
                    require API keys.
                  </p>
                </div>
                <Link href="/providers">
                  <Button className="gap-2 btn-glow mt-3">
                    <Plug className="w-4 h-4" />
                    Add Your First Provider
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.slice(0, 4).map((provider, index) => (
                <Link key={provider.provider} href="/providers">
                  <Card
                    className="p-5 border-border/50 hover:border-primary/50 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group animate-in slide-in-from-bottom"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-3 rounded-xl transition-all group-hover:scale-110 ${
                            provider.type === "local"
                              ? "bg-blue-500/15 border border-blue-500/30"
                              : "bg-purple-500/15 border border-purple-500/30"
                          }`}
                        >
                          {provider.type === "local" ? (
                            <Cpu className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Globe className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold capitalize text-base">
                            {provider.provider}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1.5">
                            {provider.type === "local" ? "Local" : "Cloud"}
                          </Badge>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {provider.connected ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500/60" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span
                          className={`font-semibold ${
                            provider.connected
                              ? "text-emerald-500"
                              : "text-red-500/70"
                          }`}
                        >
                          {provider.connected ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Models</span>
                        <Badge variant="secondary" className="font-semibold">
                          {provider.models.length}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Enhanced */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Quick Start</h2>
            <p className="text-sm text-muted-foreground">Common actions</p>
          </div>
          <div className="space-y-3">
            <Link href="/chat" className="block">
              <Card className="p-4 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer group h-full">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0 mt-1">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm mb-0.5">Start Chat</h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Begin a new conversation
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/providers" className="block">
              <Card className="p-4 border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer group h-full">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors shrink-0 mt-1">
                    <Settings className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm mb-0.5">Providers</h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Configure connections
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/registry" className="block">
              <Card className="p-4 border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-300 cursor-pointer group h-full">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors shrink-0 mt-1">
                    <Database className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm mb-0.5">
                      MCP Registry
                    </h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Browse & install
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/models" className="block">
              <Card className="p-4 border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-300 cursor-pointer group h-full">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors shrink-0 mt-1">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm mb-0.5">Models</h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Explore available
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* System Overview & Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Stats Overview */}
        <Card className="p-6 border-border/50 glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">System Overview</h3>
              <p className="text-xs text-muted-foreground">
                Current statistics
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {providers.length === 0 ? (
              <div className="text-center py-6 px-4 text-muted-foreground bg-background/50 rounded-lg border border-dashed border-border/50">
                <p className="text-sm">
                  No data yet. Connect your first provider to see stats.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Provider Mix
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {localProviders.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {localProviders.length} Local
                        </Badge>
                      )}
                      {remoteProviders.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {remoteProviders.length} Cloud
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2">{providers.length}</p>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border/30 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground font-medium">
                      Connection Status
                    </p>
                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs">
                      {healthScore}% Healthy
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl font-bold">{connectedProviders}</p>
                    <p className="text-sm text-muted-foreground">
                      of {providers.length} online
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border/30 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground font-medium">
                      MCP Servers
                    </p>
                    {enabledServers > 0 && (
                      <Badge className="bg-violet-500/20 text-violet-700 border-violet-500/30 text-xs">
                        {enabledServers} Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {installedServers.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Getting Started Guide */}
        <Card className="p-6 border-border/50 glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Getting Started</h3>
              <p className="text-xs text-muted-foreground">3 simple steps</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3 p-4 rounded-xl bg-linear-to-r from-primary/5 to-transparent border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mt-0.5">
                1
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm mb-0.5">
                  Connect Providers
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {providers.length === 0
                    ? "Add your first AI provider - local like Ollama or cloud like OpenAI."
                    : "You're all set! Add more providers for more capabilities."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/20 transition-colors">
              <div className="shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold mt-0.5">
                2
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm mb-0.5">
                  Add MCP Servers
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {installedServers.length === 0
                    ? "Browse the registry to add tools like file access, web browsing, and more."
                    : "Great! You have servers installed. Enable them in chats for enhanced capabilities."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/20 transition-colors">
              <div className="shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold mt-0.5">
                3
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm mb-0.5">Start Building</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Head to Chat and start conversations with AI. Everything works
                  together seamlessly.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
