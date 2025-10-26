"use client";

import { useInstalledServers } from "@/hooks/use-installed-servers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wrench,
  Package,
  Power,
  Settings,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Code,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ToolsPage() {
  const { servers, isLoading, toggleServer, uninstallServer } =
    useInstalledServers();
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set()
  );

  const toggleExpanded = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const installedServers = servers.filter((s) => s.installed);
  const totalTools = installedServers.reduce(
    (sum, s) => sum + s.tools.length,
    0
  );
  const enabledServers = installedServers.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gradient flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          Tools
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your installed MCP servers and available tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 glass">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Installed Servers
                </p>
                <p className="text-3xl font-bold">{installedServers.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-border/50 glass">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Enabled Servers
                </p>
                <p className="text-3xl font-bold">{enabledServers}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Power className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-border/50 glass">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Available Tools
                </p>
                <p className="text-3xl font-bold">{totalTools}</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-500/10">
                <Wrench className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 glass">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : installedServers.length === 0 ? (
        <Card className="p-12 text-center glass">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Servers Installed</h3>
          <p className="text-muted-foreground mb-6">
            Visit the Registry to browse and install MCP servers
          </p>
          <Button asChild>
            <a href="/registry">Browse Registry</a>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {installedServers.map((server) => {
            const isExpanded = expandedServers.has(server.id);

            return (
              <Card
                key={server.id}
                className="overflow-hidden glass hover:border-primary/50 transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-xl">{server.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          v{server.version}
                        </Badge>
                        {server.enabled && (
                          <Badge
                            variant="default"
                            className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/50"
                          >
                            <Power className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {server.description}
                      </p>
                      {server.author && (
                        <p className="text-xs text-muted-foreground">
                          by {server.author}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => toggleServer(server.id)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(server.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2" />
                      )}
                      {server.tools.length} tools
                    </Button>

                    {server.repository && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={server.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Repository
                        </a>
                      </Button>
                    )}

                    <div className="flex-1" />

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configure {server.name}</DialogTitle>
                          <DialogDescription>
                            Server configuration options will be available here
                            in a future update.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => uninstallServer(server.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Uninstall
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border pt-4 space-y-3">
                      {server.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="bg-secondary/50 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-md">
                              <Code className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1 font-mono">
                                {tool.name}
                              </h4>
                              <p className="text-xs text-muted-foreground mb-2">
                                {tool.description}
                              </p>
                              {Object.keys(tool.inputSchema).length > 0 && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    Parameters:{" "}
                                  </span>
                                  <code className="bg-background px-2 py-1 rounded">
                                    {Object.entries(tool.inputSchema)
                                      .map(([key, type]) => `${key}: ${type}`)
                                      .join(", ")}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
