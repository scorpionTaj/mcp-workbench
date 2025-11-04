"use client";

import { useState, useEffect } from "react";
import logger from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Copy,
  Check,
  Package,
  Terminal,
  ExternalLink,
  Info,
  Download,
  Code,
} from "lucide-react";
import type { RegistryServer } from "@/lib/github-registry";

interface InstallModalProps {
  server: RegistryServer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallModal({
  server,
  open,
  onOpenChange,
}: InstallModalProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [preferredInstaller, setPreferredInstaller] = useState<
    "npm" | "pnpm" | "bun" | "python"
  >("npm");
  const [savedInstaller, setSavedInstaller] = useState<
    "npm" | "pnpm" | "bun" | "python"
  >("npm");

  // Load preferred installer from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferredInstaller) {
          setPreferredInstaller(data.preferredInstaller);
          setSavedInstaller(data.preferredInstaller);
        }
      })
      .catch(() => {});
  }, []);

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const savePreferredInstaller = async (
    installer: "npm" | "pnpm" | "bun" | "python"
  ) => {
    setPreferredInstaller(installer);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredInstaller: installer }),
      });
      setSavedInstaller(installer);
    } catch (error) {
      logger.error(
        { err: error },
        "MCP Workbench Error saving preferred installer"
      );
    }
  };

  if (!server) return null;

  const installSnippets = server.installSnippets;
  const hasNodePackage = !!(
    installSnippets.npm ||
    installSnippets.pnpm ||
    installSnippets.bun
  );
  const hasPythonPackage = !!installSnippets.python;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[85vh] overflow-y-auto glass border-border/50 p-0">
        <div className="p-6 space-y-4">
          <DialogHeader className="space-y-4 pb-0">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-3xl font-bold bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent mb-2">
                  Install {server.name}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {server.description}
                </DialogDescription>
              </div>
            </div>

            {/* Server Info Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Card className="p-3 glass border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Package
                  </span>
                </div>
                <p
                  className="text-sm font-mono font-bold truncate"
                  title={server.packageName || undefined}
                >
                  {server.packageName || "N/A"}
                </p>
              </Card>

              <Card className="p-3 glass border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    Source
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    server.source === "mcp-org"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  }`}
                >
                  {server.source === "mcp-org" ? "✓ Official" : "Community"}
                </Badge>
              </Card>
            </div>

            {/* Languages */}
            {server.languages.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    Languages:
                  </span>
                </div>
                {server.languages.map((lang) => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="bg-violet-500/10 text-violet-500 border-violet-500/20"
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {hasNodePackage && (
              <Card className="p-5 glass border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-bold">Package Manager</h3>
                  {savedInstaller === preferredInstaller && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    >
                      ✓ Default
                    </Badge>
                  )}
                </div>

                <Tabs
                  value={preferredInstaller}
                  onValueChange={(v) => savePreferredInstaller(v as any)}
                >
                  <TabsList className="grid w-full grid-cols-3 glass border-border/50 p-1 h-11">
                    <TabsTrigger
                      value="npm"
                      className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg cursor-pointer font-semibold transition-all"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>npm</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="pnpm"
                      className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg cursor-pointer font-semibold transition-all"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>pnpm</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="bun"
                      className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg cursor-pointer font-semibold transition-all"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>bun</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="npm" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">
                          Install globally
                        </h4>
                      </div>
                      <CommandBlock
                        command={
                          installSnippets.npm ||
                          `npm install -g ${server.packageName}`
                        }
                        copied={copiedCommand === installSnippets.npm}
                        onCopy={copyCommand}
                      />
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Run with npx</h4>
                      </div>
                      <CommandBlock
                        command={`npx -y ${server.packageName}`}
                        copied={
                          copiedCommand === `npx -y ${server.packageName}`
                        }
                        onCopy={copyCommand}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="pnpm" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">
                          Install globally
                        </h4>
                      </div>
                      <CommandBlock
                        command={
                          installSnippets.pnpm ||
                          `pnpm add -g ${server.packageName}`
                        }
                        copied={copiedCommand === installSnippets.pnpm}
                        onCopy={copyCommand}
                      />
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">
                          Run with pnpm dlx
                        </h4>
                      </div>
                      <CommandBlock
                        command={`pnpm dlx ${server.packageName}`}
                        copied={
                          copiedCommand === `pnpm dlx ${server.packageName}`
                        }
                        onCopy={copyCommand}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="bun" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">
                          Install globally
                        </h4>
                      </div>
                      <CommandBlock
                        command={
                          installSnippets.bun ||
                          `bun add -g ${server.packageName}`
                        }
                        copied={copiedCommand === installSnippets.bun}
                        onCopy={copyCommand}
                      />
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Run with bunx</h4>
                      </div>
                      <CommandBlock
                        command={`bunx ${server.packageName}`}
                        copied={copiedCommand === `bunx ${server.packageName}`}
                        onCopy={copyCommand}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            )}

            {/* Python installation */}
            {hasPythonPackage && (
              <Card className="p-5 glass border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Code className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-base font-bold">Python Installation</h3>
                </div>
                <CommandBlock
                  command={installSnippets.python!}
                  copied={copiedCommand === installSnippets.python}
                  onCopy={copyCommand}
                />
              </Card>
            )}

            {/* Docker installation */}
            {installSnippets.docker && (
              <Card className="p-5 glass border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Package className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="text-base font-bold">Docker Installation</h3>
                </div>
                <CommandBlock
                  command={installSnippets.docker}
                  copied={copiedCommand === installSnippets.docker}
                  onCopy={copyCommand}
                />
              </Card>
            )}

            {/* Manual installation fallback */}
            {!hasNodePackage &&
              !hasPythonPackage &&
              !installSnippets.docker && (
                <Card className="p-6 glass border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-0.5">
                      <Info className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-500 mb-2">
                        Manual Installation Required
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        This server requires manual installation. Please refer
                        to the repository for detailed instructions.
                      </p>
                      <a
                        href={server.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 hover:border-primary/50 hover:bg-primary/5"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Repository
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              )}

            {/* Repository Link */}
            {server.repoUrl && (
              <Card className="p-4 glass border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <ExternalLink className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-0.5">
                        Repository
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                        {server.repoUrl.replace("https://", "")}
                      </p>
                    </div>
                  </div>
                  <a
                    href={server.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hover:bg-blue-500/10 hover:text-blue-500"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit
                    </Button>
                  </a>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandBlock({
  command,
  copied,
  onCopy,
}: {
  command: string;
  copied: boolean;
  onCopy: (cmd: string) => void;
}) {
  return (
    <div className="relative group">
      <pre className="glass border-border/50 p-4 rounded-lg text-sm overflow-x-auto font-mono hover:border-primary/30 transition-colors">
        <code className="text-emerald-400">{command}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 h-8 w-8 p-0"
        onClick={() => onCopy(command)}
        title={copied ? "Copied!" : "Copy command"}
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
