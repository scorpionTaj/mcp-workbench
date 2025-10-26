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
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-background p-8">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                <Sparkles className="w-6 h-6 text-primary animate-pulse-glow" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome Back
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Your AI development environment is{" "}
              {healthScore >= 80
                ? "running smoothly"
                : healthScore >= 50
                ? "partially operational"
                : "needs attention"}
              .
              {providers.length === 0 &&
                " Get started by adding your first provider."}
            </p>
          </div>
          <Button
            onClick={() => refresh()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in zoom-in duration-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <Badge
                variant={
                  healthScore >= 80
                    ? "default"
                    : healthScore >= 50
                    ? "secondary"
                    : "destructive"
                }
                className="gap-1"
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
            <h3 className="text-2xl font-bold mb-1">
              {connectedProviders}/{providers.length}
            </h3>
            <p className="text-sm text-muted-foreground">System Health</p>
            <Progress value={healthScore} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        {/* Available Models */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in zoom-in duration-500 delay-75">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                <Zap className="w-5 h-5 text-violet-500" />
              </div>
              <TrendingUp className="w-4 h-4 text-violet-500" />
            </div>
            <h3 className="text-2xl font-bold mb-1">{totalModels}</h3>
            <p className="text-sm text-muted-foreground">AI Models Ready</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Across {providers.length} provider
              {providers.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* MCP Servers */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in zoom-in duration-500 delay-150">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Database className="w-5 h-5 text-emerald-500" />
              </div>
              <Badge
                variant="outline"
                className="text-emerald-500 border-emerald-500/30"
              >
                {enabledServers} Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {installedServers.length}
            </h3>
            <p className="text-sm text-muted-foreground">MCP Servers</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {installedServers.length === 0
                ? "No servers installed"
                : `${enabledServers} enabled`}
            </p>
          </CardContent>
        </Card>

        {/* Provider Mix */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 animate-in zoom-in duration-500 delay-225">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex gap-1">
                {localProviders.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Server className="w-3 h-3" />
                    {localProviders.length}
                  </Badge>
                )}
                {remoteProviders.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Globe className="w-3 h-3" />
                    {remoteProviders.length}
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {localProviders.length + remoteProviders.length}
            </h3>
            <p className="text-sm text-muted-foreground">Providers</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {localProviders.length} local • {remoteProviders.length} remote
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Providers Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Providers</h2>
            <Link href="/providers">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-primary hover:text-primary"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {providers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-full bg-primary/10">
                  <Server className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">No Providers Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your first AI provider to start building. Choose
                    from local options like Ollama or cloud providers like
                    OpenAI.
                  </p>
                </div>
                <Link href="/providers">
                  <Button className="gap-2 btn-glow mt-2">
                    <Server className="w-4 h-4" />
                    Add First Provider
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.slice(0, 4).map((provider, index) => (
                <Card
                  key={provider.provider}
                  className="p-5 border-border/50 hover:border-primary/30 transition-all duration-300 group animate-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          provider.type === "local"
                            ? "bg-blue-500/10"
                            : "bg-purple-500/10"
                        } group-hover:scale-110 transition-transform`}
                      >
                        {provider.type === "local" ? (
                          <Server
                            className={`w-5 h-5 ${
                              provider.type === "local"
                                ? "text-blue-500"
                                : "text-purple-500"
                            }`}
                          />
                        ) : (
                          <Globe className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold capitalize">
                          {provider.provider}
                        </h3>
                        <Badge variant="outline" className="text-xs mt-1">
                          {provider.type}
                        </Badge>
                      </div>
                    </div>
                    {provider.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span
                        className={
                          provider.connected
                            ? "text-emerald-500 font-medium"
                            : "text-destructive"
                        }
                      >
                        {provider.connected ? "Connected" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Models</span>
                      <span className="font-medium">
                        {provider.models.length}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/chat">
              <Card className="p-5 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-0.5">Start Chat</h3>
                    <p className="text-xs text-muted-foreground">
                      Begin a conversation with AI
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link href="/providers">
              <Card className="p-5 border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <Settings className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-0.5">Manage Providers</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure AI connections
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link href="/registry">
              <Card className="p-5 border-border/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                    <Database className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-0.5">MCP Registry</h3>
                    <p className="text-xs text-muted-foreground">
                      Browse & install servers
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <Link href="/models">
              <Card className="p-5 border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-0.5">View Models</h3>
                    <p className="text-xs text-muted-foreground">
                      Explore available models
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 border-border/50 glass">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">System Insights</h2>
          </div>
          <div className="space-y-4">
            {providers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No data available yet</p>
                <p className="text-xs mt-1">Add providers to see insights</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Provider Distribution</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {localProviders.length} Local
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {remoteProviders.length} Remote
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{providers.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Connection Status</p>
                    <div className="flex gap-2">
                      <Badge
                        variant="default"
                        className="text-xs bg-emerald-500"
                      >
                        {connectedProviders} Online
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {providers.length - connectedProviders} Offline
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-500">
                      {healthScore}%
                    </p>
                    <p className="text-xs text-muted-foreground">Health</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">MCP Integration</p>
                    <p className="text-xs text-muted-foreground">
                      {installedServers.length === 0
                        ? "No servers yet"
                        : `${enabledServers}/${installedServers.length} active`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {installedServers.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Servers</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Getting Started */}
        <Card className="p-6 border-border/50 glass">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Getting Started</h2>
          </div>
          <div className="space-y-3">
            <div className="flex gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20 group hover:border-primary/40 transition-all">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Connect Providers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {providers.length === 0
                    ? "Start by adding your first AI provider. Local providers like Ollama work offline, while remote ones like OpenAI require API keys."
                    : `You have ${providers.length} provider${
                        providers.length !== 1 ? "s" : ""
                      } configured. Add more to access different models and capabilities.`}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border/30 group hover:border-primary/20 transition-all">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Install MCP Servers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {installedServers.length === 0
                    ? "Browse the MCP Registry to add tools like filesystem access, web browsing, and database connections."
                    : `${installedServers.length} server${
                        installedServers.length !== 1 ? "s" : ""
                      } installed. Enable them in your chats for enhanced capabilities.`}
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border/30 group hover:border-primary/20 transition-all">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start Building</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Head to the Chat page to start conversations with AI. Your
                  providers and MCP servers work together seamlessly.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
