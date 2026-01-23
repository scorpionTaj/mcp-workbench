"use client";

import { useState, useEffect } from "react";
import { useChatTemplates } from "@/hooks/use-chat-templates";
import { useProviders } from "@/hooks/use-providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Star,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatTemplatesGalleryProps {
  onTemplateSelect?: (template: any, model?: string) => void;
  category?: string;
}

export function ChatTemplatesGallery({
  onTemplateSelect,
  category,
}: ChatTemplatesGalleryProps) {
  const { templates, isLoading, fetchTemplates, useTemplate } =
    useChatTemplates();
  const { providers } = useProviders();
  const [selectedCategory, setSelectedCategory] = useState(category || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [templateForModel, setTemplateForModel] = useState<any>(null);

  const categories = [
    "all",
    "general",
    "coding",
    "analysis",
    "creative",
    "research",
    "tutoring",
  ];

  useEffect(() => {
    fetchTemplates({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: searchQuery || undefined,
    });
  }, [selectedCategory, searchQuery, fetchTemplates]);

  const handleUseTemplate = async (template: any) => {
    try {
      await useTemplate(template.id);

      // Check if suggested model is available
      const suggestedModel = template.suggestedModel;
      if (suggestedModel && providers) {
        // Check if model exists in available providers
        const modelExists = providers.some((p) =>
          p.models?.some(
            (m) =>
              `${p.provider}:${m}` === suggestedModel || m === suggestedModel,
          ),
        );

        if (!modelExists) {
          // Model not found, show selector
          setTemplateForModel(template);
          setShowModelSelector(true);
          setSelectedTemplate(null);
          return;
        }
      }

      setSelectedTemplate(template);
      onTemplateSelect?.(template, suggestedModel);
    } catch (error) {
      console.error("Failed to use template:", error);
    }
  };

  const handleCopySystemPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-card/50 text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No templates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                selectedTemplate?.id === template.id && "border-primary",
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  {template.rating && template.rating > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">
                        {template.rating}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Tags */}
                {template.tags && (
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(template.tags || "[]").map(
                      (tag: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ),
                    )}
                  </div>
                )}

                {/* Category Badge */}
                <Badge variant="outline" className="capitalize">
                  {template.category}
                </Badge>

                {/* System Prompt Preview */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    System Prompt
                  </p>
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {template.systemPrompt}
                  </p>
                </div>

                {/* Usage Count */}
                {template.usageCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Used {template.usageCount} times
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Copy className="w-4 h-4" />
                  Use
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setShowDetails(
                      showDetails === template.id ? null : template.id,
                    )
                  }
                >
                  {showDetails === template.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CardFooter>

              {/* Details Panel */}
              {showDetails === template.id && (
                <div className="px-6 pb-4 space-y-3 border-t border-border">
                  {template.suggestedModel && (
                    <div className="text-xs">
                      <p className="font-semibold text-muted-foreground">
                        Suggested Model
                      </p>
                      <p className="text-foreground font-mono">
                        {template.suggestedModel}
                      </p>
                    </div>
                  )}

                  {template.suggestedTools && (
                    <div className="text-xs">
                      <p className="font-semibold text-muted-foreground">
                        Suggested Tools
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {JSON.parse(template.suggestedTools || "[]").map(
                          (tool: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {tool}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs">
                    <p className="font-semibold text-muted-foreground mb-1">
                      Full Prompt
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      onClick={() =>
                        handleCopySystemPrompt(template.systemPrompt)
                      }
                    >
                      <Copy className="w-3 h-3" />
                      Copy Full Prompt
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Model Selection Dialog */}
      {showModelSelector && templateForModel && (
        <Dialog open={showModelSelector} onOpenChange={setShowModelSelector}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select a Model</DialogTitle>
              <DialogDescription>
                The suggested model "{templateForModel.suggestedModel}" is not
                available. Please select an alternative model to use with this
                template.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {providers?.map((provider) =>
                provider.models?.map((model) => (
                  <Button
                    key={model.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => {
                      setSelectedTemplate(templateForModel);
                      onTemplateSelect?.(
                        templateForModel,
                        `${provider.provider}:${model.id}`,
                      );
                      setShowModelSelector(false);
                      setTemplateForModel(null);
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium capitalize">
                        {provider.provider}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {model.name || model.id}
                      </span>
                    </div>
                  </Button>
                )),
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Selected Template Dialog */}
      {selectedTemplate && (
        <Dialog
          open={!!selectedTemplate}
          onOpenChange={() => setSelectedTemplate(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Category & Rating */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {selectedTemplate.category}
                </Badge>
                {selectedTemplate.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{selectedTemplate.rating}/5</span>
                  </div>
                )}
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <h3 className="font-semibold">System Prompt</h3>
                <div className="p-3 rounded-lg bg-card/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedTemplate.systemPrompt}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() =>
                    handleCopySystemPrompt(selectedTemplate.systemPrompt)
                  }
                >
                  <Copy className="w-4 h-4" />
                  Copy Prompt
                </Button>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedTemplate.author && (
                  <div>
                    <p className="text-xs text-muted-foreground">Author</p>
                    <p className="font-medium">{selectedTemplate.author}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Uses</p>
                  <p className="font-medium">{selectedTemplate.usageCount}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
