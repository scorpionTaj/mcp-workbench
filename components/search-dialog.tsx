"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "@/hooks/use-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Search,
  Clock,
  Trash2,
  Zap,
  ChevronDown,
  MessageSquare,
  User,
} from "lucide-react";
import type { SearchFilters } from "@/lib/search-service";

interface SearchDialogProps {
  onSelectResult?: (resultId: string, chatId: string) => void;
}

export function SearchDialog({ onSelectResult }: SearchDialogProps) {
  const {
    results,
    history,
    suggestions,
    isLoading,
    error,
    search,
    fetchHistory,
    fetchSuggestions,
    fetchPopularTerms,
  } = useSearch();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState<SearchFilters>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load popular terms on dialog open
  useEffect(() => {
    if (isOpen) {
      fetchPopularTerms(5).then(setPopularTerms);
    }
  }, [isOpen, fetchPopularTerms]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await search(searchQuery, filters);
      setShowHistory(false);
      setShowSuggestions(false);
    }
  };

  const handleQuickSearch = async (query: string) => {
    setSearchQuery(query);
    await search(query, filters);
    setShowHistory(false);
    setShowSuggestions(false);
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (value.length > 0) {
      fetchSuggestions(value);
      setShowSuggestions(true);
      setShowHistory(false);
    } else {
      setShowSuggestions(false);
      setShowHistory(true);
    }
  };

  const handleSelectResult = (messageId: string, chatId: string) => {
    onSelectResult?.(messageId, chatId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
        >
          <Search className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Search chats...</span>
          <span className="sm:hidden">Search...</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Chats & Messages</DialogTitle>
          <DialogDescription>
            Search across all your chats and messages with advanced filters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={searchInputRef}
                placeholder="Search messages, conversations..."
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isLoading || !searchQuery}>
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  showFilters && "rotate-180",
                )}
              />
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border rounded-lg p-4 space-y-3 bg-secondary/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Message Role
                  </label>
                  <Select
                    value={filters.messageRole || ""}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        messageRole:
                          (value as "user" | "assistant") || undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Provider
                  </label>
                  <Select
                    value={filters.provider || ""}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        provider: value || undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All providers</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Min Tokens
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minTokens || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minTokens: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    placeholder="999999"
                    value={filters.maxTokens || ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxTokens: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Suggestions or History */}
          {!searchQuery && showHistory && history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchHistory(0)}
                  className="h-auto p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {history.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleQuickSearch(item.query)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-sm transition-colors flex items-center justify-between group"
                  >
                    <span>{item.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.resultsCount} results
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Suggestions</h3>
              <div className="space-y-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickSearch(suggestion)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!searchQuery && !showHistory && popularTerms.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Popular Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleQuickSearch(term)}
                    className="px-3 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-sm transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-medium">
                Results ({results.length})
              </h3>
              {results.map((result) => (
                <button
                  key={result.message.id}
                  onClick={() =>
                    handleSelectResult(result.message.id, result.chat.id)
                  }
                  className="w-full text-left p-3 rounded border border-border hover:bg-secondary/50 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {result.chat.title || "Untitled Chat"}
                    </span>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {result.relevanceScore}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.snippet}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1">
                      {result.message.role === "user" ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      {result.message.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.message.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* No Results */}
          {!isLoading && searchQuery && results.length === 0 && !error && (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
