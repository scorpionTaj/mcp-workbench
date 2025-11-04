"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useProviders } from "@/hooks/use-providers";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Settings,
  Wrench,
  Sliders,
  ChevronDown,
  ChevronUp,
  Server,
  Globe,
  Eye,
  Search,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatSidebarProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  modelParams?: {
    temperature: number;
    topP: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  onModelParamsChange?: (params: any) => void;
}

export function ChatSidebar({
  selectedModel,
  onModelChange,
  systemPrompt,
  onSystemPromptChange,
  selectedTools,
  onToolsChange,
  modelParams = {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  onModelParamsChange,
}: ChatSidebarProps) {
  const { providers } = useProviders();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchModel, setSearchModel] = useState("");
  const [debouncedModelParams, setDebouncedModelParams] = useState(modelParams);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Group models by provider, filtering out embedding models (not suitable for chat)
  const modelsByProvider = useMemo(() => {
    return (providers || []).reduce((acc, provider) => {
      if (provider.models && provider.models.length > 0) {
        // Filter out embedding models and apply search filter
        const chatModels = provider.models.filter((model) => {
          const matchesSearch = !searchModel || 
            model.name.toLowerCase().includes(searchModel.toLowerCase()) ||
            model.id.toLowerCase().includes(searchModel.toLowerCase());
          return !model.isEmbedding && matchesSearch;
        });
        if (chatModels.length > 0) {
          acc.push({
            provider: provider.provider,
            type: provider.type,
            connected: provider.connected,
            models: chatModels,
          });
        }
      }
      return acc;
    }, [] as Array<{ provider: string; type: string; connected: boolean; models: any[] }>);
  }, [providers, searchModel]);

  // Get all models as flat array (excluding embedding models)
  const allModels = useMemo(() => {
    return (providers || [])
      .flatMap((p) => p.models || [])
      .filter((model) => !model.isEmbedding);
  }, [providers]);

  const handleToolToggle = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      onToolsChange(selectedTools.filter((t) => t !== toolName));
    } else {
      onToolsChange([...selectedTools, toolName]);
    }
  };

  // Handle debounced parameter updates to improve slider performance
  const updateParam = (key: string, value: number) => {
    setDebouncedModelParams(prev => ({ ...prev, [key]: value }));
  };

  // Debounce updates to parent component
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (onModelParamsChange && JSON.stringify(debouncedModelParams) !== JSON.stringify(modelParams)) {
        onModelParamsChange(debouncedModelParams);
      }
    }, 500); // 500ms debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedModelParams, onModelParamsChange, modelParams]);

  // Sync parent changes back to debounced state
  useEffect(() => {
    setDebouncedModelParams(modelParams);
  }, [modelParams]);

  return (
    <div className="w-80 glass border-border/50 rounded-lg p-6 overflow-y-auto shadow-lg">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Configuration
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="model-select"
                className="text-sm mb-2 font-semibold flex items-center gap-2"
              >
                <Brain className="w-3.5 h-3.5" />
                Model
              </Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger
                  id="model-select"
                  className="glass border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <SelectValue placeholder="Select a model">
                    {selectedModel && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedModel.split(":")[1]}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-xs bg-primary/10 border-primary/30"
                          >
                            {selectedModel.split(":")[0]}
                          </Badge>
                          {allModels.find(
                            (m) =>
                              `${m.provider}:${m.id}` === selectedModel &&
                              m.isVision
                          ) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-500/10 border-blue-500/20 text-blue-500"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Vision
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Vision Model</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {allModels.find(
                            (m) =>
                              `${m.provider}:${m.id}` === selectedModel &&
                              m.isReasoning
                          ) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-violet-500/10 border-violet-500/20 text-violet-500"
                                >
                                  <Brain className="w-3 h-3 mr-1" />
                                  Reasoning
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reasoning Model</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px] w-[300px]">
                  <TooltipProvider>
                    {/* Search Input */}
                    <div className="p-2 border-b border-border/50">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search models..."
                          value={searchModel}
                          onChange={(e) => setSearchModel(e.target.value)}
                          className="pl-8 glass border-border/50 focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    
                    {modelsByProvider.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No models available.</p>
                        <p className="text-xs mt-1">
                          Add a provider in the config page.
                        </p>
                      </div>
                    ) : (
                      modelsByProvider.map((providerGroup, idx) => (
                        <div key={providerGroup.provider}>
                          {idx > 0 && <SelectSeparator />}
                          <SelectGroup>
                            <SelectLabel className="flex items-center gap-2 px-2 py-2">
                              <div
                                className={`p-1.5 rounded-lg border ${
                                  providerGroup.type === "local"
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-blue-500/10 border-blue-500/20"
                                }`}
                              >
                                {providerGroup.type === "local" ? (
                                  <Server className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                                )}
                              </div>
                              <span className="capitalize font-bold">
                                {providerGroup.provider}
                              </span>
                              <Badge
                                variant={
                                  providerGroup.connected
                                    ? "default"
                                    : "secondary"
                                }
                                className={`text-xs border ${
                                  providerGroup.connected
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                                }`}
                              >
                                {providerGroup.connected
                                  ? "Connected"
                                  : "Offline"}
                              </Badge>
                            </SelectLabel>
                            {providerGroup.models.map((model) => (
                              <SelectItem
                                key={`${model.provider}-${model.id}`}
                                value={`${model.provider}:${model.id}`}
                                disabled={!providerGroup.connected}
                                className="pl-8 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <div className="flex flex-col">
                                    <span className="font-medium truncate max-w-[180px]">
                                      {model.name}
                                    </span>
                                    <div className="flex items-center gap-1 mt-1">
                                      {model.size && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-muted/50 border-muted-foreground/20"
                                        >
                                          {model.size}
                                        </Badge>
                                      )}
                                      {model.modified && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-muted/50 border-muted-foreground/20"
                                        >
                                          {new Date(model.modified).toLocaleDateString()}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {model.isVision && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20">
                                            <Eye className="w-3 h-3 text-blue-500" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Vision Model</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {model.isReasoning && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="p-1 rounded bg-violet-500/10 border border-violet-500/20">
                                            <Brain className="w-3 h-3 text-violet-500" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Reasoning Model</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </div>
                      ))
                    )}
                  </TooltipProvider>
                </SelectContent>
              </Select>
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between glass border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  size="sm"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span className="font-medium">Model Parameters</span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="space-y-2 p-3 rounded-lg glass border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Temperature</Label>
                    <span className="text-xs font-mono text-primary">
                      {debouncedModelParams.temperature}
                    </span>
                  </div>
                  <Slider
                    value={[debouncedModelParams.temperature]}
                    onValueChange={([value]) =>
                      updateParam("temperature", value)
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls randomness. Lower is more focused.
                  </p>
                </div>

                <div className="space-y-2 p-3 rounded-lg glass border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Top P</Label>
                    <span className="text-xs font-mono text-primary">
                      {debouncedModelParams.topP}
                    </span>
                  </div>
                  <Slider
                    value={[debouncedModelParams.topP]}
                    onValueChange={([value]) => updateParam("topP", value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nucleus sampling threshold.
                  </p>
                </div>

                <div className="space-y-2 p-3 rounded-lg glass border-border/50">
                  <Label htmlFor="max-tokens" className="text-xs font-semibold">
                    Max Tokens
                  </Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={debouncedModelParams.maxTokens}
                    onChange={(e) =>
                      updateParam("maxTokens", parseInt(e.target.value) || 2048)
                    }
                    min={1}
                    max={32000}
                    className="glass border-border/50 hover:border-primary/50 transition-colors font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum response length.
                  </p>
                </div>

                <div className="space-y-2 p-3 rounded-lg glass border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Frequency Penalty
                    </Label>
                    <span className="text-xs font-mono text-primary">
                      {debouncedModelParams.frequencyPenalty}
                    </span>
                  </div>
                  <Slider
                    value={[debouncedModelParams.frequencyPenalty]}
                    onValueChange={([value]) =>
                      updateParam("frequencyPenalty", value)
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Reduces repetition.
                  </p>
                </div>

                <div className="space-y-2 p-3 rounded-lg glass border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Presence Penalty
                    </Label>
                    <span className="text-xs font-mono text-primary">
                      {debouncedModelParams.presencePenalty}
                    </span>
                  </div>
                  <Slider
                    value={[debouncedModelParams.presencePenalty]}
                    onValueChange={([value]) =>
                      updateParam("presencePenalty", value)
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encourages new topics.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div>
              <Label
                htmlFor="system-prompt"
                className="text-sm mb-2 font-semibold flex items-center gap-2"
              >
                <Brain className="w-3.5 h-3.5" />
                System Prompt
              </Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="min-h-[100px] resize-none glass border-border/50 hover:border-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-semibold">MCP Tools</h3>
          </div>

          <div className="text-center py-6 glass rounded-lg border-dashed border-2 border-border/50">
            <Wrench className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No MCP servers installed
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Visit the Registry to add tools
            </p>
          </div>
        </div>

        {selectedModel && (
          <div className="pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              Selected Model
            </h4>
            <div className="space-y-2">
              {allModels
                .filter((m) => `${m.provider}:${m.id}` === selectedModel)
                .map((model) => (
                  <div
                    key={model.id}
                    className="p-3 rounded-lg glass border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="font-semibold mb-2 text-sm">
                      {model.name}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-primary/10 border-primary/30"
                      >
                        {model.provider}
                      </Badge>
                      {model.isReasoning && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="default"
                              className="text-xs bg-violet-500/10 text-violet-500 border border-violet-500/20"
                            >
                              <Brain className="w-3 h-3 mr-1" />
                              Reasoning
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reasoning Model</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {model.isVision && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="default"
                              className="text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Vision
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Vision Model</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {model.size && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/50 border-muted-foreground/20"
                        >
                          {model.size}
                        </Badge>
                      )}
                      {model.modified && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted/50 border-muted-foreground/20"
                        >
                          {new Date(model.modified).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
