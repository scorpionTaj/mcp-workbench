"use client";

import { useState, useEffect } from "react";
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
import { Copy, Check } from "lucide-react";
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
      console.error("MCP Workbench Error saving preferred installer:", error);
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Install {server.name}</DialogTitle>
          <DialogDescription>{server.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Languages */}
          {server.languages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Languages:</span>
              {server.languages.map((lang) => (
                <Badge key={lang} variant="secondary">
                  {lang}
                </Badge>
              ))}
            </div>
          )}

          {hasNodePackage && (
            <Tabs
              value={preferredInstaller}
              onValueChange={(v) => savePreferredInstaller(v as any)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Package Manager</h3>
                {savedInstaller === preferredInstaller && (
                  <Badge variant="outline" className="text-xs">
                    ✓ Saved as default
                  </Badge>
                )}
              </div>
              <TabsList className="grid w-full grid-cols-3 border-2 border-border/50 p-1">
                <TabsTrigger
                  value="npm"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
                >
                  <span>npm</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pnpm"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
                >
                  <span>pnpm</span>
                </TabsTrigger>
                <TabsTrigger
                  value="bun"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
                >
                  <span>bun</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="npm" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Install globally</h4>
                  <CommandBlock
                    command={
                      installSnippets.npm ||
                      `npm install -g ${server.packageName}`
                    }
                    copied={copiedCommand === installSnippets.npm}
                    onCopy={copyCommand}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Run with npx</h4>
                  <CommandBlock
                    command={`npx -y ${server.packageName}`}
                    copied={copiedCommand === `npx -y ${server.packageName}`}
                    onCopy={copyCommand}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pnpm" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Install globally</h4>
                  <CommandBlock
                    command={
                      installSnippets.pnpm ||
                      `pnpm add -g ${server.packageName}`
                    }
                    copied={copiedCommand === installSnippets.pnpm}
                    onCopy={copyCommand}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Run with pnpm dlx
                  </h4>
                  <CommandBlock
                    command={`pnpm dlx ${server.packageName}`}
                    copied={copiedCommand === `pnpm dlx ${server.packageName}`}
                    onCopy={copyCommand}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bun" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Install globally</h4>
                  <CommandBlock
                    command={
                      installSnippets.bun || `bun add -g ${server.packageName}`
                    }
                    copied={copiedCommand === installSnippets.bun}
                    onCopy={copyCommand}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Run with bunx</h4>
                  <CommandBlock
                    command={`bunx ${server.packageName}`}
                    copied={copiedCommand === `bunx ${server.packageName}`}
                    onCopy={copyCommand}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Python installation */}
          {hasPythonPackage && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Python Installation</h3>
              <CommandBlock
                command={installSnippets.python!}
                copied={copiedCommand === installSnippets.python}
                onCopy={copyCommand}
              />
            </div>
          )}

          {/* Docker installation */}
          {installSnippets.docker && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Docker Installation</h3>
              <CommandBlock
                command={installSnippets.docker}
                copied={copiedCommand === installSnippets.docker}
                onCopy={copyCommand}
              />
            </div>
          )}

          {/* Manual installation fallback */}
          {!hasNodePackage && !hasPythonPackage && !installSnippets.docker && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                This server requires manual installation. Please refer to the
                repository for detailed instructions.
              </p>
              <a
                href={server.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="mt-2 gap-2">
                  View Repository →
                </Button>
              </a>
            </div>
          )}

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Server Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Package:</span>
                <Badge variant="secondary">{server.packageName || "N/A"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant="outline">
                  {server.source === "mcp-org" ? "Community" : "Official"}
                </Badge>
              </div>
              {server.repoUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Repository:</span>
                  <a
                    href={server.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    {server.repoUrl.replace("https://", "")}
                  </a>
                </div>
              )}
            </div>
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
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
        <code>{command}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onCopy(command)}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
