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
import { PythonEnvSelector } from "@/components/python-env-selector";

export default function ConfigPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mcp");
  const [securityInfo, setSecurityInfo] = useState<any>(null);
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

  // Fetch security info when security tab is active
  useEffect(() => {
    if (activeTab === "security" && !securityInfo) {
      fetch("/api/security/info")
        .then((res) => res.json())
        .then((data) => setSecurityInfo(data))
        .catch((err) => console.error("Failed to fetch security info:", err));
    }
  }, [activeTab, securityInfo]);

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
        <TabsList className="grid w-full max-w-2xl grid-cols-4 glass border-border/50 p-1">
          <TabsTrigger
            value="mcp"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <FileJson className="w-4 h-4 mr-2" />
            MCP Configuration
          </TabsTrigger>
          <TabsTrigger
            value="python"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Database className="w-4 h-4 mr-2" />
            Python
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
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
                className="font-mono text-sm min-h-[500px] bg-muted/50"
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
                        <strong>Environment Variables:</strong> Use the "env"
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

        {/* Python Environment Tab */}
        <TabsContent
          value="python"
          className="space-y-6 mt-6 animate-in slide-in-from-bottom duration-500"
        >
          <Card className="border-border/50 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                Python Environment
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage Python environments for running notebooks and code
                execution
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Python Environment Selector Integration */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 glass">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Settings className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">
                        Environment Selection
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Select a Python environment to use for code execution in
                        notebooks and terminal commands.
                      </p>
                    </div>
                    <div>
                      <PythonEnvSelector />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 glass">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-emerald-500">
                      Auto-Detection
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      MCP Workbench automatically detects Python environments
                      from:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>System PATH (python, python3)</li>
                      <li>Conda/Miniforge3 environments</li>
                      <li>Virtual environments (venv, virtualenv)</li>
                      <li>uv-managed Python installations</li>
                      <li>Windows Store Python</li>
                      <li>Standard installation directories</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-violet-500/20 bg-violet-500/5 glass">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <AlertCircle className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-violet-500">
                      Custom Paths
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      If your Python installation isn't auto-detected, you can
                      manually add it using the custom path option in the
                      selector. Make sure to provide the full path to the Python
                      executable.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 glass">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Server className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-amber-500">
                      Environment Types
                    </h4>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          System
                        </Badge>
                        <span className="text-muted-foreground">
                          Python installed in system locations
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Conda
                        </Badge>
                        <span className="text-muted-foreground">
                          Conda or Miniforge3 environments
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Venv
                        </Badge>
                        <span className="text-muted-foreground">
                          Virtual environments (venv, virtualenv)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                          Custom
                        </Badge>
                        <span className="text-muted-foreground">
                          Manually specified Python paths
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent
          value="security"
          className="space-y-6 mt-6 animate-in slide-in-from-bottom duration-500"
        >
          {/* Command & Code Execution Security */}
          <Card className="border-border/50 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Command & Code Execution Security
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                MCP Workbench actively blocks dangerous commands and code
                patterns
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Terminal className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="font-semibold">Terminal Protection</h4>
                    </div>
                    {securityInfo && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          {securityInfo.terminalCommandsBlocked} patterns
                          blocked
                        </Badge>
                      </div>
                    )}
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Destructive operations (rm -rf, format)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>System shutdown/reboot</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Privilege escalation (sudo, su)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Network attacks (nmap, netcat)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Code className="w-4 h-4 text-blue-500" />
                      </div>
                      <h4 className="font-semibold">Python Protection</h4>
                    </div>
                    {securityInfo && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {securityInfo.pythonPatternsBlocked} patterns blocked
                        </Badge>
                      </div>
                    )}
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>System access (os, subprocess)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>Dynamic execution (eval, exec)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>Network operations (socket, requests)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>Code introspection patterns</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {securityInfo && securityInfo.allowedPythonImports && (
                <div className="p-4 rounded-lg border border-border/50 glass">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Allowed Python Libraries (Data Science & ML)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {securityInfo.allowedPythonImports.map((lib: string) => (
                      <Badge
                        key={lib}
                        variant="outline"
                        className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      >
                        {lib}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    These libraries are safe for data analysis, visualization,
                    and machine learning tasks
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Storage Security */}
          <Card className="border-border/50 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Data Storage & Privacy
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your data security and privacy controls
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 glass">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Local-First Storage</h4>
                    <p className="text-sm text-muted-foreground">
                      All configuration, API keys, and sensitive data are stored
                      in your local SQLite database. No data is sent to external
                      servers except when making API calls to your configured
                      providers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 glass">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Database className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Database Encryption</h4>
                    <p className="text-sm text-muted-foreground">
                      Your local database is protected by filesystem
                      permissions. For enhanced security, consider encrypting
                      your entire disk using your operating system's built-in
                      encryption features.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 glass">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Shield className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">
                      Environment Variables
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      API keys and secrets in MCP configuration are passed as
                      environment variables to server processes. They are never
                      exposed in logs or UI after being saved.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border border-border/50 glass">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Lock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Output Sanitization</h4>
                    <p className="text-sm text-muted-foreground">
                      Terminal and code execution outputs are automatically
                      sanitized to prevent leakage of sensitive information like
                      API keys, passwords, and absolute file paths.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-semibold text-amber-500">
                        Security Best Practices
                      </p>
                      <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>Use API keys with minimum required permissions</li>
                        <li>Regularly rotate your API keys and tokens</li>
                        <li>Never commit secrets to version control</li>
                        <li>Review server access logs regularly</li>
                        <li>Keep MCP server packages up to date</li>
                        <li>Enable disk encryption on your system</li>
                        <li>Review blocked command attempts in logs</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                <code className="text-sm bg-muted px-3 py-1.5 rounded block mt-2">
                  ./prisma/dev.db
                </code>
                <p className="text-sm text-muted-foreground mt-2">
                  Your local SQLite database containing MCP server
                  configurations, chat history, and settings.
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
