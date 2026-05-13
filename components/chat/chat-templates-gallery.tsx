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
  Search,
  Sparkles,
  Code2,
  BarChart3,
  PenTool,
  BookOpen,
  Lightbulb,
  Copy,
  Star,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatTemplatesGalleryProps {
  onTemplateSelect?: (template: any, model?: string) => void;
  category?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  all: <Sparkles className="w-5 h-5" />,
  general: <Lightbulb className="w-5 h-5" />,
  coding: <Code2 className="w-5 h-5" />,
  analysis: <BarChart3 className="w-5 h-5" />,
  creative: <PenTool className="w-5 h-5" />,
  research: <BookOpen className="w-5 h-5" />,
  tutoring: <Sparkles className="w-5 h-5" />,
};

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
    <div className="w-full space-y-8 py-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates by name or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "capitalize transition-all gap-2",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {categoryIcons[cat]}
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-card/50">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 bg-card/30">
          <CardContent className="py-16 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No templates found
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 overflow-hidden",
                "border border-border/50 hover:border-primary/50 bg-linear-to-br from-card to-card/80",
                selectedTemplate?.id === template.id &&
                  "border-primary shadow-lg ring-2 ring-primary/20",
              )}
              onClick={() =>
                setShowDetails(showDetails === template.id ? null : template.id)
              }
            >
              {/* Card Header with Gradient Background */}
              <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/30">
                <CardHeader className="p-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                    {template.rating && template.rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0 bg-yellow-50 dark:bg-yellow-950/30 px-2 py-1 rounded">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                          {template.rating}/5
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="capitalize w-fit text-xs bg-primary/20 text-primary hover:bg-primary/30 border-0"
                  >
                    {template.category}
                  </Badge>
                </CardHeader>
              </div>

              {/* Card Content */}
              <CardContent className="pt-4 space-y-3">
                {/* Tags */}
                {template.tags && (
                  <div className="flex flex-wrap gap-1">
                    {JSON.parse(template.tags || "[]")
                      .slice(0, 3)
                      .map((tag: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] border-primary/20 text-primary/70 hover:bg-primary/5"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}

                {/* System Prompt Preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Purpose
                  </p>
                  <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">
                    {template.systemPrompt}
                  </p>
                </div>

                {/* Usage Stats */}
                {template.usageCount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      💫 Used {template.usageCount} time
                      {template.usageCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </CardContent>

              {/* Card Footer */}
              <CardFooter className="gap-2 pt-2 border-t border-border/20 flex-col">
                <Button
                  size="sm"
                  className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Use Template
                  <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(
                      showDetails === template.id ? null : template.id,
                    );
                  }}
                >
                  <span className="text-xs">
                    {showDetails === template.id ? "Hide" : "View"} Details
                  </span>
                  {showDetails === template.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CardFooter>

              {/* Details Panel */}
              {showDetails === template.id && (
                <div className="px-4 pb-4 space-y-4 bg-muted/30 border-t border-border/30 animate-in fade-in duration-200">
                  {template.suggestedModel && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Suggested Model
                      </p>
                      <div className="flex items-center gap-2 bg-card/50 rounded px-3 py-2 border border-border/50">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        <p className="text-sm text-foreground font-mono">
                          {template.suggestedModel}
                        </p>
                      </div>
                    </div>
                  )}

                  {template.suggestedTools && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Suggested Tools
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(template.suggestedTools || "[]").map(
                          (tool: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/20 border-0"
                            >
                              {tool}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Full Prompt
                    </p>
                    <div className="bg-card/50 rounded p-3 border border-border/50 max-h-32 overflow-y-auto">
                      <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed font-mono">
                        {template.systemPrompt}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10"
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
          <DialogContent className="max-w-2xl">
            <DialogHeader className="space-y-3 pb-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Model Not Available
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    The suggested model "{templateForModel.suggestedModel}" is
                    not available. Choose an alternative below.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template Info Card */}
              <div className="p-4 rounded-lg bg-linear-to-br from-primary/5 via-primary/2 to-transparent border border-primary/20">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Using template:{" "}
                  <span className="text-primary">{templateForModel.name}</span>
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {templateForModel.description}
                </p>
              </div>

              {/* Available Models */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Available Models
                </p>

                {providers?.map(
                  (provider) =>
                    provider.models &&
                    provider.models.length > 0 && (
                      <div key={provider.provider} className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest px-1 pt-2">
                          {provider.provider}
                        </p>
                        <div className="grid gap-2">
                          {provider.models.map((model) => (
                            <Button
                              key={model.id}
                              variant="outline"
                              className="w-full justify-between text-left h-auto py-3 px-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group"
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
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {model.name || model.id}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Model ID: {model.id}
                                </span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    ),
                )}

                {providers &&
                  providers.every(
                    (p) => !p.models || p.models.length === 0,
                  ) && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No models available. Please configure your providers
                        first.
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowModelSelector(false);
                  setTemplateForModel(null);
                }}
              >
                Cancel
              </Button>
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
