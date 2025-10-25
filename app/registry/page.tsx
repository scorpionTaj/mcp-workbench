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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text">
            MCP Registry
          </h1>
          <p className="text-muted-foreground text-base">
            Browse and install Model Context Protocol servers from GitHub
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshRegistry}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isError && (
        <Card className="p-6 border-destructive/50 bg-destructive/5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">
                Failed to Load Registry
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {errorMessage ||
                  "Unable to fetch MCP servers from GitHub. This may be due to rate limiting or network issues."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshRegistry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search MCP servers by name or description..."
            value={searchQuery}
            onChange={(e) =>
              handleFilterChange(() => setSearchQuery(e.target.value))
            }
            className="pl-12 h-12 bg-background/50 border-border/50 text-base"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap p-4 rounded-lg bg-card/50 border border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Language:
            </span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedLanguage === null ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  handleFilterChange(() => setSelectedLanguage(null))
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
                >
                  {lang} (
                  {servers.filter((s) => s.languages.includes(lang)).length})
                </Button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Category:
            </span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange(() => setSelectedTag(null))}
              >
                All
              </Button>
              {allTags.slice(0, 6).map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(() => setSelectedTag(tag))}
                >
                  {tag}
                </Button>
              ))}
              {allTags.length > 6 && (
                <Button variant="outline" size="sm" disabled>
                  +{allTags.length - 6} more
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <RegistryLoadingState />
      ) : filteredServers.length === 0 && !isError ? (
        <Card className="p-12 text-center border-dashed">
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
            <Package className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Servers Found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {searchQuery
              ? "Try adjusting your search query or filters to find MCP servers"
              : "No MCP servers available in the registry"}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setSelectedLanguage(null);
                setSelectedTag(null);
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : !isError ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {startIndex + 1}-{Math.min(endIndex, filteredServers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {filteredServers.length}
              </span>{" "}
              servers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedServers.map((server, index) => (
              <Card
                key={server.id}
                className="p-6 border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg transition-all flex flex-col group card-hover animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors"
                      title={server.name}
                    >
                      {server.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {server.source === "mcp-org"
                          ? "MCP Official"
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
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3 leading-relaxed">
                  {server.description}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
                    {server.languages.slice(0, 3).map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                    {server.languages.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{server.languages.length - 3}
                      </Badge>
                    )}
                    {server.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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
                          console.error(
                            "Invalid repository URL:",
                            server.repoUrl
                          );
                        }
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Repository
                      </Button>
                    </a>

                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2 cursor-pointer"
                      onClick={() => setInstallModalServer(server)}
                    >
                      <Download className="w-4 h-4 " />
                      Install
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 p-4 rounded-lg bg-card/50 border border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
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
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-10 h-10"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
