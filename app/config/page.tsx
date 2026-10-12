"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Server,
  Shield,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Copy,
  Save,
  Download,
  Upload,
  RefreshCw,
  Database,
  Wrench,
  Lock,
  Terminal,
  Code,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import logger from "@/lib/logger";

export default function ConfigPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mcp");
  const [mcpConfig, setMcpConfig] = useState(`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/files"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://localhost/mydb"
      }
    }
  }
}`);

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfig);
    toast({
      title: "Copied!",
      description: "MCP configuration copied to clipboard",
    });
  };

  const handleSaveConfig = async () => {
    try {
      // Parse to validate JSON
      JSON.parse(mcpConfig);

      // Save to backend
      const response = await fetch("/api/settings/mcp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: mcpConfig }),
      });

      if (response.ok) {
        toast({
          title: "Saved!",
          description: "MCP configuration saved successfully",
        });
      } else {
        throw new Error("Failed to save configuration");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = event.target?.result as string;
        JSON.parse(config); // Validate
        setMcpConfig(config);
        toast({
          title: "Imported!",
          description: "Configuration file loaded successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Invalid configuration file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleExportConfig = () => {
    const blob = new Blob([mcpConfig], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcp-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Settings className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">
              Configuration
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Manage MCP servers, security, and application settings
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 glass hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  MCP Servers
                </p>
                <p className="text-3xl font-bold">5</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Server className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Active Connections
                </p>
                <p className="text-3xl font-bold">3</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <CheckCircle2 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass hover:border-primary/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Database Size
                </p>
                <p className="text-3xl font-bold">2.4 MB</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Database className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-2 glass border-border/50 p-1">
          <TabsTrigger
            value="mcp"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <FileJson className="w-4 h-4 mr-2" />
            MCP Configuration
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Wrench className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* MCP Configuration Tab */}
        <TabsContent
          value="mcp"
          className="space-y-6 mt-6 animate-in slide-in-from-bottom duration-500"
        >
          <Card className="border-border/50 glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-primary" />
                    MCP Server Configuration
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edit your Model Context Protocol server configuration in
                    JSON format
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyConfig}
                    className="gap-2 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 hover:border-primary/50 hover:bg-primary/5"
                      onClick={(e) => {
                        e.preventDefault();
                        (
                          e.currentTarget
                            .previousElementSibling as HTMLInputElement
                        )?.click();
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      Import
                    </Button>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportConfig}
                    className="gap-2 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveConfig}
                    className="gap-2 hover:bg-primary/90"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={mcpConfig}
                onChange={(e) => setMcpConfig(e.target.value)}
                className="font-mono text-sm min-h-[500px] bg-default/50"
                placeholder="Enter MCP configuration JSON..."
              />
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 glass">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-lg">Configuration Guide</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Server className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      <span>
                        <strong>Server Definition:</strong> Each server requires
                        a unique name, command, and arguments array
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileJson className="w-4 h-4 shrink-0 mt-0.5 text-violet-500" />
                      <span>
                        <strong>Environment Variables:</strong> Use the &quot;env&quot;
                        object to pass secrets and configuration
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                      <span>
                        <strong>JSON Validation:</strong> Configuration is
                        validated before saving to prevent errors
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Advanced Tab */}
        <TabsContent
          value="advanced"
          className="space-y-6 mt-6 animate-in slide-in-from-bottom duration-500"
        >
          <Card className="border-border/50 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Advanced Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure advanced options and system preferences
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-border/50 glass">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Database Location
                </h4>
                <code className="text-sm bg-default px-3 py-1.5 rounded block mt-2">
                  Supabase + Drizzle ORM
                </code>
                <p className="text-sm text-muted-foreground mt-2">
                  Your Supabase database containing MCP server configurations,
                  chat history, and settings.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/50 glass">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                  Auto-Refresh Settings
                </h4>
                <p className="text-sm text-muted-foreground">
                  MCP server status is checked every 30 seconds. Click the
                  refresh button on any page to force an immediate check.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-border/50 glass">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-violet-500" />
                  Server Process Management
                </h4>
                <p className="text-sm text-muted-foreground">
                  MCP servers are spawned as child processes. They automatically
                  restart if they crash. Logs are available in the terminal tab.
                </p>
              </div>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileJson className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-blue-500">
                        Configuration Tips
                      </p>
                      <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>
                          Back up your configuration before making changes
                        </li>
                        <li>
                          Test servers individually before adding to production
                        </li>
                        <li>Use descriptive names for easy identification</li>
                        <li>Monitor resource usage for long-running servers</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
