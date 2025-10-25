"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface MCPServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface MCPConfig {
  mcpServers: Record<string, MCPServer>;
}

const defaultConfig: MCPConfig = {
  mcpServers: {
    memory: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-memory"],
    },
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/files",
      ],
    },
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      },
    },
  },
};

export default function ConfigPage() {
  const [config, setConfig] = useState<MCPConfig>(defaultConfig);
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(defaultConfig, null, 2)
  );
  const [copied, setCopied] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcp-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setConfig(imported);
        setJsonInput(JSON.stringify(imported, null, 2));
        setJsonError(null);
      } catch (error) {
        setJsonError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    try {
      const parsed = JSON.parse(value);
      setConfig(parsed);
      setJsonError(null);
    } catch (error) {
      setJsonError("Invalid JSON syntax");
    }
  };

  const addServer = () => {
    const newServerName = `server-${Object.keys(config.mcpServers).length + 1}`;
    setConfig({
      mcpServers: {
        ...config.mcpServers,
        [newServerName]: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-name"],
        },
      },
    });
    setJsonInput(
      JSON.stringify(
        {
          mcpServers: {
            ...config.mcpServers,
            [newServerName]: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-name"],
            },
          },
        },
        null,
        2
      )
    );
  };

  const removeServer = (serverName: string) => {
    const newServers = { ...config.mcpServers };
    delete newServers[serverName];
    setConfig({ mcpServers: newServers });
    setJsonInput(JSON.stringify({ mcpServers: newServers }, null, 2));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-linear-to-br from-foreground to-foreground/60 bg-clip-text">
            MCP Configuration
          </h1>
          <p className="text-muted-foreground text-base">
            Configure your Model Context Protocol servers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2 relative">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 border-2 border-border/50 p-1">
          <TabsTrigger
            value="visual"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            Visual Editor
          </TabsTrigger>
          <TabsTrigger
            value="json"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            JSON Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-4">
          <Card className="p-6 border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">MCP Servers</h2>
                <Badge variant="secondary">
                  {Object.keys(config.mcpServers).length} servers
                </Badge>
              </div>
              <Button onClick={addServer} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Server
              </Button>
            </div>

            <div className="space-y-4">
              {Object.entries(config.mcpServers).map(([name, server]) => (
                <Card
                  key={name}
                  className="p-4 border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServer(name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <Label htmlFor={`${name}-command`}>Command</Label>
                        <Input
                          id={`${name}-command`}
                          value={server.command}
                          onChange={(e) => {
                            const newConfig = { ...config };
                            newConfig.mcpServers[name].command = e.target.value;
                            setConfig(newConfig);
                            setJsonInput(JSON.stringify(newConfig, null, 2));
                          }}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${name}-args`}>Arguments</Label>
                        <Textarea
                          id={`${name}-args`}
                          value={server.args.join("\n")}
                          onChange={(e) => {
                            const newConfig = { ...config };
                            newConfig.mcpServers[name].args =
                              e.target.value.split("\n");
                            setConfig(newConfig);
                            setJsonInput(JSON.stringify(newConfig, null, 2));
                          }}
                          className="font-mono text-sm"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          One argument per line
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Environment Variables</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newConfig = { ...config };
                              if (!newConfig.mcpServers[name].env) {
                                newConfig.mcpServers[name].env = {};
                              }
                              const envCount = Object.keys(
                                newConfig.mcpServers[name].env!
                              ).length;
                              newConfig.mcpServers[name].env![
                                `ENV_VAR_${envCount + 1}`
                              ] = "";
                              setConfig(newConfig);
                              setJsonInput(JSON.stringify(newConfig, null, 2));
                            }}
                            className="h-7 gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Variable
                          </Button>
                        </div>
                        {server.env && Object.keys(server.env).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(server.env).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <Input
                                  value={key}
                                  placeholder="VARIABLE_NAME"
                                  onChange={(e) => {
                                    const newConfig = { ...config };
                                    const oldKey = key;
                                    const newKey = e.target.value;
                                    if (
                                      newConfig.mcpServers[name].env &&
                                      newKey !== oldKey
                                    ) {
                                      const envValue =
                                        newConfig.mcpServers[name].env![oldKey];
                                      delete newConfig.mcpServers[name].env![
                                        oldKey
                                      ];
                                      newConfig.mcpServers[name].env![newKey] =
                                        envValue;
                                      setConfig(newConfig);
                                      setJsonInput(
                                        JSON.stringify(newConfig, null, 2)
                                      );
                                    }
                                  }}
                                  className="font-mono text-sm flex-1"
                                />
                                <Input
                                  value={value}
                                  placeholder="value"
                                  onChange={(e) => {
                                    const newConfig = { ...config };
                                    if (newConfig.mcpServers[name].env) {
                                      newConfig.mcpServers[name].env![key] =
                                        e.target.value;
                                      setConfig(newConfig);
                                      setJsonInput(
                                        JSON.stringify(newConfig, null, 2)
                                      );
                                    }
                                  }}
                                  className="font-mono text-sm flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newConfig = { ...config };
                                    if (newConfig.mcpServers[name].env) {
                                      delete newConfig.mcpServers[name].env![
                                        key
                                      ];
                                      // Remove env object if empty
                                      if (
                                        Object.keys(
                                          newConfig.mcpServers[name].env!
                                        ).length === 0
                                      ) {
                                        delete newConfig.mcpServers[name].env;
                                      }
                                      setConfig(newConfig);
                                      setJsonInput(
                                        JSON.stringify(newConfig, null, 2)
                                      );
                                    }
                                  }}
                                  className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                            No environment variables configured.
                            <br />
                            Click "Add Variable" to add one.
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Environment variables are passed to the server process
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-primary/20 bg-primary/5 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">
                  How to use this configuration
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>
                    Configure your MCP servers above or import an existing
                    config
                  </li>
                  <li>
                    Copy or export the configuration to{" "}
                    <code className="px-1 py-0.5 rounded bg-muted">
                      claude_desktop_config.json
                    </code>
                  </li>
                  <li>Place it in your Claude Desktop configuration folder</li>
                  <li>Restart Claude Desktop to apply changes</li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card className="p-6 border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-editor">Configuration JSON</Label>
                {jsonError && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {jsonError}
                  </Badge>
                )}
              </div>
              <Textarea
                id="json-editor"
                value={jsonInput}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Paste your MCP configuration JSON here..."
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 border-border/50 bg-linear-to-br from-card to-card/50 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-3">Additional Resources</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Visit the{" "}
            <a
              href="https://github.com/modelcontextprotocol/servers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MCP Servers Repository
            </a>{" "}
            for more servers and resources
          </p>
          <p>
            • Join{" "}
            <a
              href="https://github.com/modelcontextprotocol/servers/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub Discussions
            </a>{" "}
            to engage with the MCP community
          </p>
        </div>
      </Card>
    </div>
  );
}
