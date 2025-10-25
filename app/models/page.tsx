"use client";

import { useState, useEffect } from "react";
import { useProviders } from "@/hooks/use-providers";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Brain, Cpu, HardDrive, Calendar, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isReasoningModel } from "@/lib/reasoning-detection";
import type { LLMProvider } from "@/lib/types";

export default function ModelsPage() {
  const { providers, isLoading } = useProviders();

  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | "all">(
    "all"
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // Load preferred provider from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("preferred-provider");
    if (saved && (saved === "ollama" || saved === "lmstudio")) {
      setSelectedProvider(saved);
    } else {
      // Default to first connected provider
      const connected = providers.find((p) => p.connected);
      if (connected) {
        setSelectedProvider(connected.provider);
      }
    }
  }, [providers]);

  // Load overrides from API
  useEffect(() => {
    fetch("/api/models/overrides")
      .then((res) => res.json())
      .then((data) => {
        const overridesMap: Record<string, boolean> = {};
        data.forEach((o: any) => {
          overridesMap[`${o.provider}-${o.modelId}`] = o.isReasoning;
        });
        setOverrides(overridesMap);
      })
      .catch((err) =>
        console.error("MCP Workbench Error loading overrides:", err)
      );
  }, []);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as LLMProvider | "all";
    setSelectedProvider(newProvider);
    if (newProvider !== "all") {
      localStorage.setItem("preferred-provider", newProvider);
    }
  };

  const toggleReasoningOverride = async (
    provider: LLMProvider,
    modelId: string,
    currentValue: boolean
  ) => {
    const key = `${provider}-${modelId}`;
    const newValue = !currentValue;

    try {
      await fetch("/api/models/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, modelId, isReasoning: newValue }),
      });

      setOverrides((prev) => ({ ...prev, [key]: newValue }));
    } catch (error) {
      console.error("MCP Workbench Error toggling override:", error);
    }
  };

  const filteredProviders =
    selectedProvider === "all"
      ? providers
      : providers.filter((p) => p.provider === selectedProvider);

  const allModels = filteredProviders.flatMap((p) => p.models);

  const ollamaConnected = providers.find(
    (p) => p.provider === "ollama"
  )?.connected;
  const lmstudioConnected = providers.find(
    (p) => p.provider === "lmstudio"
  )?.connected;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Models</h1>
        <p className="text-muted-foreground text-lg">
          Browse all available local models from your LLM providers
        </p>
      </div>

      <Tabs
        value={selectedProvider}
        onValueChange={handleProviderChange}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3 border-2 border-border/50 p-1">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            All Providers
          </TabsTrigger>
          <TabsTrigger
            value="ollama"
            disabled={!ollamaConnected}
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            Ollama {!ollamaConnected && "(offline)"}
          </TabsTrigger>
          <TabsTrigger
            value="lmstudio"
            disabled={!lmstudioConnected}
            className="data-[state=active]:bg-primary/10 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/50"
          >
            LM Studio {!lmstudioConnected && "(offline)"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : allModels.length === 0 ? (
        <Card className="p-12 text-center">
          <Cpu className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Models Found</h3>
          <p className="text-muted-foreground text-sm">
            {selectedProvider === "all"
              ? "Make sure Ollama or LM Studio is running and has models installed."
              : `Make sure ${
                  selectedProvider === "ollama" ? "Ollama" : "LM Studio"
                } is running and has models installed.`}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allModels.map((model) => {
            const overrideKey = `${model.provider}-${model.id}`;
            const hasOverride = overrideKey in overrides;
            const isReasoning = hasOverride
              ? overrides[overrideKey]
              : isReasoningModel(model.id, model.name);

            return (
              <Card
                key={`${model.provider}-${model.id}`}
                className="p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isReasoning ? "bg-primary/20" : "bg-secondary"
                      }`}
                    >
                      {isReasoning ? (
                        <Brain className="w-5 h-5 text-primary" />
                      ) : (
                        <Cpu className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-2 break-all">
                        {model.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {model.provider}
                        </Badge>
                        {isReasoning && (
                          <Badge
                            variant="default"
                            className="text-xs bg-primary/20 text-primary hover:bg-primary/30 cursor-help"
                            title="Reasoning-capable model"
                          >
                            Reasoning
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {model.size && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HardDrive className="w-4 h-4" />
                      <span>{model.size}</span>
                    </div>
                  )}
                  {model.modified && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(model.modified).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={() =>
                        toggleReasoningOverride(
                          model.provider,
                          model.id,
                          isReasoning
                        )
                      }
                    >
                      {isReasoning ? (
                        <Check className="w-3 h-3 mr-2 text-primary" />
                      ) : (
                        <X className="w-3 h-3 mr-2 text-muted-foreground" />
                      )}
                      Mark as {isReasoning ? "non-" : ""}reasoning
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
