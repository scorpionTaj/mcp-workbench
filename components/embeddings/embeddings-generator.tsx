"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useProviders } from "@/hooks/use-providers";
import { Loader2, Sparkles, Copy } from "lucide-react";
import { type LLMProvider } from "@/lib/types";

export function EmbeddingsGenerator() {
  const { providers, isLoading: providersLoading } = useProviders();
  const [inputText, setInputText] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [embeddingResult, setEmbeddingResult] = useState<number[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dimensionCount, setDimensionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filter for embedding models only from existing providers
  const embeddingProviders = providers.filter(provider => 
    provider.connected && 
    provider.models.some(model => model.isEmbedding)
  );

  // Get embedding models for selected provider
  const embeddingModels = selectedProvider 
    ? providers
        .find(p => p.provider === selectedProvider)
        ?.models.filter(model => model.isEmbedding) || []
    : [];

  useEffect(() => {
    if (embeddingResult) {
      setDimensionCount(embeddingResult.length);
    }
  }, [embeddingResult]);

  const generateEmbedding = async () => {
    if (!selectedProvider || !selectedModel || !inputText.trim()) {
      setError("Please select a provider, model, and enter text to embed");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setEmbeddingResult(null);

    try {
      const response = await fetch("/api/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider as LLMProvider,
          model: selectedModel,
          input: inputText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate embedding");
      }

      const data = await response.json();
      
      // Extract the embedding from the response
      if (data.data && data.data[0] && data.data[0].embedding) {
        setEmbeddingResult(data.data[0].embedding);
      } else {
        throw new Error("Invalid embedding response format");
      }
    } catch (err) {
      console.error("Embedding generation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while generating embedding");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setSelectedModel(""); // Reset model when provider changes
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const copyToClipboard = () => {
    if (embeddingResult) {
      navigator.clipboard.writeText(JSON.stringify(embeddingResult));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Embedding Generator</CardTitle>
            <CardDescription>
              Generate vector embeddings for text using various AI models
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="input-text">Input Text</Label>
            <Textarea
              id="input-text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to generate embedding for..."
              rows={4}
              className="mt-2"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select 
                value={selectedProvider} 
                onValueChange={handleProviderChange}
                disabled={isGenerating || providersLoading}
              >
                <SelectTrigger className="mt-2 cursor-pointer h-12 flex items-center justify-between px-3">
                  <SelectValue className="text-left flex-1" placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {embeddingProviders.map((provider) => (
                    <SelectItem 
                      key={provider.provider} 
                      value={provider.provider}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${
                          provider.type === "local" 
                            ? "bg-emerald-500/10" 
                            : "bg-blue-500/10"
                        }`}>
                          {provider.type === "local" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-emerald-500">
                              <rect width="20" height="16" x="2" y="4" rx="2"/>
                              <path d="M6 8h.01"/>
                              <path d="M10 8h.01"/>
                              <path d="M14 8h.01"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-blue-500">
                              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 10 10 0 0 0-10 10Z"/>
                            </svg>
                          )}
                        </div>
                        <span className="capitalize font-medium">{provider.provider}</span>
                        <div className="ml-auto flex items-center gap-1">
                          {provider.connected ? (
                            <Badge 
                              variant="default"
                              className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            >
                              Connected
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline"
                              className="text-xs border-red-500/30 text-red-500"
                            >
                              Disconnected
                            </Badge>
                          )}
                          {provider.models.filter(m => m.isEmbedding).length > 0 && (
                            <Badge 
                              variant="secondary"
                              className="text-xs"
                            >
                              {provider.models.filter(m => m.isEmbedding).length} models
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Model</Label>
              <Select 
                value={selectedModel} 
                onValueChange={handleModelChange}
                disabled={isGenerating || !selectedProvider}
              >
                <SelectTrigger className="mt-2 cursor-pointer h-12 flex items-center justify-between px-3">
                  <SelectValue className="text-left flex-1" placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {embeddingModels.map((model) => (
                    <SelectItem 
                      key={model.id} 
                      value={model.id}
                      className="cursor-pointer py-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="mr-3">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {model.id}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-0">
                          {model.size && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs whitespace-nowrap"
                            >
                              {model.size}
                            </Badge>
                          )}
                          {model.modified && (
                            <Badge 
                              variant="outline" 
                              className="text-xs whitespace-nowrap"
                            >
                              {new Date(model.modified).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateEmbedding}
              disabled={isGenerating || !selectedProvider || !selectedModel || !inputText.trim()}
              className="border border-primary/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Embedding
                </>
              )}
            </Button>
            
            {embeddingResult && (
              <Button 
                variant="outline" 
                onClick={copyToClipboard}
                size="icon"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
              Error: {error}
            </div>
          )}

          {embeddingResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Embedding Result</h3>
                <div className="text-sm text-muted-foreground">
                  Dimensions: {dimensionCount}
                </div>
              </div>
              
              <div className="p-4 bg-secondary/50 rounded-md max-h-60 overflow-auto">
                <div className="text-xs font-mono text-muted-foreground mb-2">
                  Embedding Vector ({dimensionCount} dimensions):
                </div>
                <div className="font-mono text-sm break-all">
                  {JSON.stringify(embeddingResult)}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Embedding values range approximately from -1 to 1, representing 
                the semantic meaning of the input text in vector space.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}