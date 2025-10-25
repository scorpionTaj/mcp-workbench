"use client";
import { useState } from "react";
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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const allModels = (providers || []).flatMap((p) => p.models || []);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToolToggle = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      onToolsChange(selectedTools.filter((t) => t !== toolName));
    } else {
      onToolsChange([...selectedTools, toolName]);
    }
  };

  const updateParam = (key: string, value: number) => {
    if (onModelParamsChange) {
      onModelParamsChange({ ...modelParams, [key]: value });
    }
  };

  return (
    <div className="w-80 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 overflow-y-auto shadow-lg">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold">Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="model-select"
                className="text-sm mb-2 block font-medium"
              >
                Model
              </Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger
                  id="model-select"
                  className="bg-background/50 border-border/50"
                >
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {allModels.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No models available
                    </div>
                  ) : (
                    allModels.map((model) => (
                      <SelectItem
                        key={`${model.provider}-${model.id}`}
                        value={`${model.provider}:${model.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          {model.isReasoning && (
                            <Brain className="w-3 h-3 text-primary" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  size="sm"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    <span>Model Parameters</span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Temperature</Label>
                    <span className="text-xs text-muted-foreground">
                      {modelParams.temperature}
                    </span>
                  </div>
                  <Slider
                    value={[modelParams.temperature]}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Top P</Label>
                    <span className="text-xs text-muted-foreground">
                      {modelParams.topP}
                    </span>
                  </div>
                  <Slider
                    value={[modelParams.topP]}
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

                <div className="space-y-2">
                  <Label htmlFor="max-tokens" className="text-xs">
                    Max Tokens
                  </Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={modelParams.maxTokens}
                    onChange={(e) =>
                      updateParam("maxTokens", parseInt(e.target.value) || 2048)
                    }
                    min={1}
                    max={32000}
                    className="bg-background/50 border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum response length.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Frequency Penalty</Label>
                    <span className="text-xs text-muted-foreground">
                      {modelParams.frequencyPenalty}
                    </span>
                  </div>
                  <Slider
                    value={[modelParams.frequencyPenalty]}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Presence Penalty</Label>
                    <span className="text-xs text-muted-foreground">
                      {modelParams.presencePenalty}
                    </span>
                  </div>
                  <Slider
                    value={[modelParams.presencePenalty]}
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
                className="text-sm mb-2 block font-medium"
              >
                System Prompt
              </Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="min-h-[100px] resize-none bg-background/50 border-border/50"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold">MCP Tools</h3>
          </div>

          <div className="text-sm text-muted-foreground">
            No MCP servers installed. Visit the Registry to add tools.
          </div>
        </div>

        {selectedModel && (
          <div className="pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold mb-3">Selected Model</h4>
            <div className="space-y-2">
              {allModels
                .filter((m) => `${m.provider}:${m.id}` === selectedModel)
                .map((model) => (
                  <div
                    key={model.id}
                    className="p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="font-medium mb-2 text-sm">{model.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {model.provider}
                      </Badge>
                      {model.isReasoning && (
                        <Badge
                          variant="default"
                          className="text-xs bg-primary/20 text-primary border-primary/30"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Reasoning
                        </Badge>
                      )}
                      {model.size && (
                        <Badge variant="outline" className="text-xs">
                          {model.size}
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
