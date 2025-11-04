"use client";

import { useState } from "react";
import logger from "@/lib/logger";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useProviders } from "@/hooks/use-providers";

export function ProviderControls() {
  const { providers, isLoading, refresh } = useProviders();
  const [autoCheck, setAutoCheck] = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  const ollamaStatus = providers.find((p) => p.provider === "ollama");
  const lmstudioStatus = providers.find((p) => p.provider === "lmstudio");

  const handleStartProvider = async (provider: string) => {
    setIsStarting(provider);
    try {
      const response = await fetch("/api/providers/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "start" }),
      });

      const result = await response.json();

      if (result.success) {
        // Wait a bit for the service to start
        await new Promise((resolve) => setTimeout(resolve, 2000));
        refresh();
      } else {
        alert(result.message || `Failed to start ${provider}`);
      }
    } catch (error) {
      logger.error({ err: error, provider }, `Failed to start provider`);
      alert(`Failed to start ${provider}. Please start it manually.`);
    } finally {
      setIsStarting(null);
    }
  };

  const handleStopProvider = async (provider: string) => {
    setIsStarting(provider);
    try {
      const response = await fetch("/api/providers/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "stop" }),
      });

      const result = await response.json();

      if (result.success) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        refresh();
      } else {
        alert(result.message || `Failed to stop ${provider}`);
      }
    } catch (error) {
      logger.error({ err: error, provider }, `Failed to stop provider`);
      alert(`Failed to stop ${provider}. Please stop it manually.`);
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <Card className="p-6 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Provider Management</h2>
          <p className="text-sm text-muted-foreground">
            Control your local LLM providers
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

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                ollamaStatus?.connected
                  ? "bg-success animate-pulse"
                  : "bg-muted-foreground"
              }`}
            />
            <div>
              <h3 className="font-semibold">Ollama</h3>
              <p className="text-xs text-muted-foreground">localhost:11434</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ollamaStatus?.connected ? (
              <>
                <Badge
                  variant="default"
                  className="bg-success/20 text-success border-success/30"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Running
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStopProvider("ollama")}
                  disabled={isStarting === "ollama"}
                  className="gap-2"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-muted-foreground">
                  <XCircle className="w-3 h-3 mr-1" />
                  Stopped
                </Badge>
                <Button
                  size="sm"
                  onClick={() => handleStartProvider("ollama")}
                  disabled={isStarting === "ollama"}
                  className="gap-2"
                >
                  <Play className="w-3 h-3" />
                  Start
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                lmstudioStatus?.connected
                  ? "bg-success animate-pulse"
                  : "bg-muted-foreground"
              }`}
            />
            <div>
              <h3 className="font-semibold">LM Studio</h3>
              <p className="text-xs text-muted-foreground">localhost:1234</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lmstudioStatus?.connected ? (
              <>
                <Badge
                  variant="default"
                  className="bg-success/20 text-success border-success/30"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Running
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStopProvider("lmstudio")}
                  disabled={isStarting === "lmstudio"}
                  className="gap-2"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-muted-foreground">
                  <XCircle className="w-3 h-3 mr-1" />
                  Stopped
                </Badge>
                <Button
                  size="sm"
                  onClick={() => handleStartProvider("lmstudio")}
                  disabled={isStarting === "lmstudio"}
                  className="gap-2"
                >
                  <Play className="w-3 h-3" />
                  Start
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-primary" />
          <div>
            <Label
              htmlFor="auto-check"
              className="text-sm font-medium cursor-pointer"
            >
              Auto Health Check
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically check provider status
            </p>
          </div>
        </div>
        <Switch
          id="auto-check"
          checked={autoCheck}
          onCheckedChange={setAutoCheck}
        />
      </div>

      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Start/stop controls
          require the provider applications to be installed on your system.
          Ensure Ollama or LM Studio are properly configured before attempting
          to start them.
        </p>
      </div>
    </Card>
  );
}
