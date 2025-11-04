"use client";

import { useState, useMemo, useCallback } from "react";
import { useRegistryServers } from "@/hooks/use-registry";
import { InstallModal } from "@/components/registry/install-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  ExternalLink,
  Download,
  RefreshCw,
  Globe,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";
import type { RegistryServer } from "@/lib/github-registry";
import { RegistryLoadingState } from "@/components/loading-states";

export default function RegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [installModalServer, setInstallModalServer] =
    useState<RegistryServer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 12;
  const { servers, isLoading, isError, errorMessage, refreshRegistry } =
    useRegistryServers();

  // Memoize expensive computations
  const allLanguages = useMemo(
    () =>
      Array.from(new Set(servers.flatMap((s) => s.languages))).filter(Boolean),
    [servers]
  );

  const allTags = useMemo(
    () => Array.from(new Set(servers.flatMap((s) => s.tags))).filter(Boolean),
    [servers]
  );

  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      const matchesSearch =
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesLanguage =
        !selectedLanguage || server.languages.includes(selectedLanguage);
      const matchesTag = !selectedTag || server.tags.includes(selectedTag);
      return matchesSearch && matchesLanguage && matchesTag;
    });
  }, [servers, searchQuery, selectedLanguage, selectedTag]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServers = useMemo(
    () => filteredServers.slice(startIndex, endIndex),
    [filteredServers, startIndex, endIndex]
  );

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback((filterFn: () => void) => {
    filterFn();
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedLanguage(null);
    setSelectedTag(null);
    setCurrentPage(1);
  }, []);

  const activeFiltersCount =
    (searchQuery ? 1 : 0) + (selectedLanguage ? 1 : 0) + (selectedTag ? 1 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl glass border-border/50 p-8 lg:p-12">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-violet-500/10" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Package className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-5xl font-bold tracking-tight bg-linear-to-r from-primary via-primary to-violet-500 bg-clip-text text-transparent mb-3">
                MCP Registry
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Discover and install Model Context Protocol servers from the
                community. Extend your AI capabilities with powerful tools and
                integrations.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">
                    {servers.length} servers available
                  </span>
                </div>
                <div className="w-px h-4 bg-border/50" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>Open Source</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={refreshRegistry}
            disabled={isLoading}
            className="gap-2 glass border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
            size="lg"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Registry
          </Button>
        </div>
      </div>

      {isError && (
        <Card className="p-6 border-destructive/20 bg-destructive/5 glass animate-in slide-in-from-top duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-destructive mb-2">
                Failed to Load Registry
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {errorMessage ||
                  "Unable to fetch MCP servers from GitHub. This may be due to rate limiting or network issues."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshRegistry}
                className="gap-2 border-destructive/30 hover:bg-destructive/10"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search servers by name, description, or tags..."
            value={searchQuery}
            onChange={(e) =>
              handleFilterChange(() => setSearchQuery(e.target.value))
            }
            className="pl-12 h-14 glass border-border/50 text-base focus:border-primary/50 hover:border-primary/30 transition-colors"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Card className="p-6 glass border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Filter className="w-4 h-4 text-violet-500" />
            </div>
            <h3 className="font-semibold text-lg">Filters</h3>
            {activeFiltersCount > 0 && (
              <>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 border-primary/20"
                >
                  {activeFiltersCount} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto gap-2 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear all
                </Button>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Language
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedLanguage === null ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleFilterChange(() => setSelectedLanguage(null))
                  }
                  className={
                    selectedLanguage === null
                      ? ""
                      : "glass hover:border-primary/50 hover:bg-primary/5"
                  }
                >
                  All ({servers.length})
                </Button>
                {allLanguages.map((lang) => (
                  <Button
                    key={lang}
                    variant={selectedLanguage === lang ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handleFilterChange(() => setSelectedLanguage(lang))
                    }
                    className={
                      selectedLanguage === lang
                        ? ""
                        : "glass hover:border-primary/50 hover:bg-primary/5"
                    }
                  >
                    {lang} (
                    {servers.filter((s) => s.languages.includes(lang)).length})
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/50" />

            <div>
              <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Category
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedTag === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(() => setSelectedTag(null))}
                  className={
                    selectedTag === null
                      ? ""
                      : "glass hover:border-primary/50 hover:bg-primary/5"
                  }
                >
                  All
                </Button>
                {allTags.slice(0, 8).map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handleFilterChange(() => setSelectedTag(tag))
                    }
                    className={
                      selectedTag === tag
                        ? ""
                        : "glass hover:border-primary/50 hover:bg-primary/5"
                    }
                  >
                    {tag}
                  </Button>
                ))}
                {allTags.length > 8 && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1.5 text-xs opacity-60"
                  >
                    +{allTags.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <RegistryLoadingState />
      ) : filteredServers.length === 0 && !isError ? (
        <Card className="p-12 text-center border-dashed glass">
          <div className="p-5 rounded-full bg-primary/10 border border-primary/20 w-fit mx-auto mb-4">
            <Package className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Servers Found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? "Try adjusting your search query or filters to find MCP servers"
              : "No MCP servers available in the registry"}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 hover:border-primary/50 hover:bg-primary/5"
              onClick={() => {
                setSearchQuery("");
                setSelectedLanguage(null);
                setSelectedTag(null);
                setCurrentPage(1);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </Card>
      ) : !isError ? (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground font-medium">
              Showing{" "}
              <span className="font-bold text-primary">
                {startIndex + 1}-{Math.min(endIndex, filteredServers.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-primary">
                {filteredServers.length}
              </span>{" "}
              {filteredServers.length === 1 ? "server" : "servers"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedServers.map((server, index) => (
              <Card
                key={server.id}
                className="p-6 border-border/50 glass hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 flex flex-col group animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <h3
                        className="font-bold text-lg truncate group-hover:text-primary transition-colors"
                        title={server.name}
                      >
                        {server.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          server.source === "mcp-org"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}
                      >
                        {server.source === "mcp-org"
                          ? "✓ Official"
                          : "Community"}
                      </Badge>
                    </div>
                  </div>
                  {server.homepage && (
                    <a
                      href={server.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visit homepage"
                      className="shrink-0"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3 leading-relaxed min-h-18">
                  {server.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap min-h-7">
                    {server.languages.slice(0, 2).map((lang) => (
                      <Badge
                        key={lang}
                        variant="secondary"
                        className="text-xs bg-violet-500/10 text-violet-500 border-violet-500/20"
                      >
                        {lang}
                      </Badge>
                    ))}
                    {server.languages.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-violet-500/10 text-violet-500 border-violet-500/20"
                      >
                        +{server.languages.length - 2}
                      </Badge>
                    )}
                    {server.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs glass hover:border-primary/50 transition-colors"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {server.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs opacity-60">
                        +{server.tags.length - 2}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                    <a
                      href={server.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                      onClick={(e) => {
                        // Prevent default if URL is invalid
                        if (
                          !server.repoUrl ||
                          !server.repoUrl.startsWith("http")
                        ) {
                          e.preventDefault();
                          logger.error(
                            "Invalid repository URL:",
                            server.repoUrl
                          );
                        }
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 glass hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Repo
                      </Button>
                    </a>

                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2 cursor-pointer shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                      onClick={() => setInstallModalServer(server)}
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card className="p-5 glass border-border/50 animate-in fade-in duration-500">
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-2 glass hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Smart pagination: show first, last, current, and surrounding pages
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="default"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-11 h-11 font-semibold ${
                          currentPage === pageNum
                            ? "shadow-lg shadow-primary/20"
                            : "glass hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-muted-foreground font-bold">
                        ...
                      </span>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-11 h-11 font-semibold glass hover:border-primary/50 hover:bg-primary/5"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="default"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="gap-2 glass hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40 transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : null}

      <InstallModal
        server={installModalServer}
        open={!!installModalServer}
        onOpenChange={(open) => !open && setInstallModalServer(null)}
      />
    </div>
  );
}
