"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProviders } from "@/hooks/use-providers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Cpu,
  HardDrive,
  Calendar,
  Check,
  X,
  Server,
  Globe,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Eye,
  Database,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isReasoningModel } from "@/lib/reasoning-detection";
import type { LLMProvider, LLMModel } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ModelsPage() {
  const router = useRouter();
  const { providers, isLoading, refresh } = useProviders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | "all">(
    "all"
  );
  const [selectedType, setSelectedType] = useState<"all" | "local" | "remote">(
    "all"
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

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

  // Use useMemo to optimize provider filtering based on selected filters
  const { filteredProviders, allModels, filteredModels } = useMemo(() => {
    // Filter providers based on selected provider and type
    const filtered = providers.filter((p) => {
      if (selectedProvider !== "all" && p.provider !== selectedProvider)
        return false;
      if (selectedType !== "all" && p.type !== selectedType) return false;
      return true;
    });

    // Get all models from filtered providers
    const all = filtered.flatMap((p) => p.models);

    // Filter models by search query with debounced search
    const searchLower = searchQuery.toLowerCase();
    const filteredBySearch = all.filter(
      (model) =>
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower)
    );

    return {
      filteredProviders: filtered,
      allModels: all,
      filteredModels: filteredBySearch
    };
  }, [providers, selectedProvider, selectedType, searchQuery]);

  // Group models by provider - memoized to prevent unnecessary recomputation
  const modelsByProvider = useMemo(() => {
    return filteredModels.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, LLMModel[]>);
  }, [filteredModels]);

  // Memoize stats calculations to prevent unnecessary re-computations
  const { connectedProviders, totalModels, reasoningModels, visionModels, embeddingModels } = useMemo(() => {
    const connected = providers.filter((p) => p.connected);
    const total = allModels.length;
    const reasoning = allModels.filter((model) => {
      const overrideKey = `${model.provider}-${model.id}`;
      const hasOverride = overrideKey in overrides;
      return hasOverride
        ? overrides[overrideKey]
        : isReasoningModel(model.id, model.name);
    }).length;
    const vision = allModels.filter((model) => model.isVision).length;
    const embedding = allModels.filter((model) => model.isEmbedding).length;
    
    return {
      connectedProviders: connected,
      totalModels: total,
      reasoningModels: reasoning,
      visionModels: vision,
      embeddingModels: embedding
    };
  }, [providers, allModels, overrides]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gradient flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Models
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse and manage models from all your connected providers
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Models
                </p>
                <p className="text-3xl font-bold">{totalModels}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Providers</p>
                <p className="text-3xl font-bold">
                  {connectedProviders.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Server className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reasoning</p>
                <p className="text-3xl font-bold">{reasoningModels}</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-500/10">
                <Brain className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vision</p>
                <p className="text-3xl font-bold">{visionModels}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Embedding</p>
                <p className="text-3xl font-bold">{embeddingModels}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Database className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Filtered</p>
                <p className="text-3xl font-bold">{filteredModels.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Filter className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 glass">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedProvider}
              onValueChange={(value) =>
                setSelectedProvider(value as LLMProvider | "all")
              }
            >
              <SelectTrigger className="w-full md:w-[200px] cursor-pointer">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.provider} value={p.provider}>
                    {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)} (
                    {p.models.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedType}
              onValueChange={(value) =>
                setSelectedType(value as "all" | "local" | "remote")
              }
            >
              <SelectTrigger className="w-full md:w-[180px] cursor-pointer">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="local">Local Only</SelectItem>
                <SelectItem value="remote">Remote Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Models Grid - Grouped by Provider */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 border-border/40 glass">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="p-12 text-center border-border/40 glass">
          <Cpu className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Models Found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? `No models match your search: "${searchQuery}"`
              : selectedProvider === "all"
              ? "No models are available from any provider. Make sure your providers are running."
              : `No models found for ${selectedProvider}. Check your provider connection.`}
          </p>
          {searchQuery && (
            <Button
              onClick={() => setSearchQuery("")}
              variant="outline"
              size="sm"
            >
              Clear Search
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            const providerData = providers.find((p) => p.provider === provider);
            const providerType = providerData?.type || "unknown";

            return (
              <div
                key={provider}
                className="space-y-4 animate-in slide-in-from-bottom duration-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        providerType === "local"
                          ? "bg-emerald-500/10"
                          : "bg-blue-500/10"
                      }`}
                    >
                      {providerType === "local" ? (
                        <Server className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Globe className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold capitalize">
                        {provider}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {models.length} model{models.length !== 1 ? "s" : ""}{" "}
                        available
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={providerType === "local" ? "default" : "secondary"}
                    className={
                      providerType === "local"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/50"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/50"
                    }
                  >
                    {providerType === "local" ? "Local" : "Remote"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {models.map((model) => {
                    const overrideKey = `${model.provider}-${model.id}`;
                    const hasOverride = overrideKey in overrides;
                    const isReasoning = hasOverride
                      ? overrides[overrideKey]
                      : isReasoningModel(model.id, model.name);

                    return (
                      <Card
                        key={`${model.provider}-${model.id}`}
                        className="p-6 border-border/40 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 glass group"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                {isReasoning ? (
                                  <Brain className="w-5 h-5 text-primary" />
                                ) : (
                                  <Cpu className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg leading-tight truncate">
                                  {model.name}
                                </h3>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {model.provider}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <HardDrive className="w-4 h-4 shrink-0" />
                              <span className="font-mono text-xs truncate">
                                {model.id}
                              </span>
                            </div>
                            {model.modified && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4 shrink-0" />
                                <span className="text-xs">
                                  {new Date(
                                    model.modified
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {isReasoning && (
                              <Badge
                                variant="default"
                                className="bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-violet-500/50"
                              >
                                <Brain className="w-3 h-3 mr-1" />
                                Reasoning
                              </Badge>
                            )}
                            {model.isVision && (
                              <Badge
                                variant="default"
                                className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Vision
                              </Badge>
                            )}
                            {model.isEmbedding && (
                              <Badge
                                variant="default"
                                className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/50"
                              >
                                <Database className="w-3 h-3 mr-1" />
                                Embedding
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`capitalize border-border/50 ${
                                providerType === "local"
                                  ? "text-emerald-500"
                                  : "text-blue-500"
                              }`}
                            >
                              {providerType === "local" ? (
                                <Server className="w-3 h-3 mr-1" />
                              ) : (
                                <Globe className="w-3 h-3 mr-1" />
                              )}
                              {providerType}
                            </Badge>
                          </div>

                          <div className="pt-2 border-t border-border/50 space-y-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Create a new chat with this model
                                router.push(
                                  `/chat?provider=${
                                    model.provider
                                  }&model=${encodeURIComponent(model.id)}`
                                );
                              }}
                              className="w-full text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Use in Chat
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleReasoningOverride(
                                  model.provider,
                                  model.id,
                                  hasOverride
                                    ? overrides[overrideKey]
                                    : isReasoning
                                )
                              }
                              className="w-full text-xs hover:bg-primary/10"
                            >
                              {hasOverride ? (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  Remove Override
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  {isReasoning
                                    ? "Mark as Standard"
                                    : "Mark as Reasoning"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
