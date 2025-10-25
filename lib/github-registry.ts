interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  homepage: string | null;
}

interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

export interface RegistryServer {
  id: string;
  name: string;
  description: string;
  homepage: string | null;
  repoUrl: string;
  languages: string[];
  packageName: string | null;
  installSnippets: {
    npm?: string;
    pnpm?: string;
    bun?: string;
    docker?: string;
    python?: string;
  };
  tags: string[];
  source: "mcp-org" | "servers-repo";
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const cache = new Map<
  string,
  { data: any; etag: string | null; timestamp: number }
>();

// Validate and normalize URLs
function validateUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    // Must start with http:// or https://
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return null;
    }
    // Try to parse as URL to validate
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

async function fetchWithCache(url: string, token?: string) {
  const cached = cache.get(url);
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && cached.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store", // Prevent Next.js caching issues
    });

    if (response.status === 304 && cached) {
      console.log("[MCP Registry] Using cached data for:", url);
      return cached.data;
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const etag = response.headers.get("ETag");

    cache.set(url, { data, etag, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error("[MCP Registry] Error fetching:", url, error);
    // If we have cached data, return it even if it's stale
    if (cached) {
      console.log("[MCP Registry] Returning stale cache due to error");
      return cached.data;
    }
    throw error;
  }
}

export async function fetchModelContextProtocolServers(
  token?: string
): Promise<RegistryServer[]> {
  try {
    console.log("[MCP Registry] Fetching servers from multiple sources...");

    const allServers: RegistryServer[] = [];

    // Source 1: Official modelcontextprotocol/servers README
    const officialReadmeUrl =
      "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md";
    console.log("[MCP Registry] Fetching official servers...");
    const officialReadme = await fetchFileContent(officialReadmeUrl, token);

    if (officialReadme) {
      console.log(
        "[MCP Registry] Official README fetched, length:",
        officialReadme.length
      );
      const officialServers = parseReadmeServers(
        officialReadme,
        "servers-repo"
      );
      allServers.push(...officialServers);
      console.log(
        `[MCP Registry] Parsed ${officialServers.length} official servers`
      );
    } else {
      console.warn("[MCP Registry] Failed to fetch official README");
    }

    // Source 2: Awesome MCP Servers list (community curated)
    const awesomeUrl =
      "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md";
    console.log("[MCP Registry] Fetching community servers...");
    const awesomeReadme = await fetchFileContent(awesomeUrl, token);

    if (awesomeReadme) {
      console.log(
        "[MCP Registry] Community README fetched, length:",
        awesomeReadme.length
      );
      const communityServers = parseReadmeServers(awesomeReadme, "mcp-org");
      // Merge and deduplicate by repo URL
      const existingUrls = new Set(allServers.map((s) => s.repoUrl));
      const newServers = communityServers.filter(
        (s) => !existingUrls.has(s.repoUrl)
      );
      allServers.push(...newServers);
      console.log(
        `[MCP Registry] Added ${newServers.length} community servers (${
          communityServers.length - newServers.length
        } duplicates skipped)`
      );
    } else {
      console.warn("[MCP Registry] Failed to fetch community README");
    }

    // Source 3: Direct GitHub API search for MCP servers
    console.log(
      "[MCP Registry] Searching GitHub for additional MCP servers..."
    );
    const githubServers = await searchGitHubForMCPServers(token);
    if (githubServers.length > 0) {
      const existingUrls = new Set(allServers.map((s) => s.repoUrl));
      const newGithubServers = githubServers.filter(
        (s) => !existingUrls.has(s.repoUrl)
      );
      allServers.push(...newGithubServers);
      console.log(
        `[MCP Registry] Added ${
          newGithubServers.length
        } GitHub search results (${
          githubServers.length - newGithubServers.length
        } duplicates skipped)`
      );
    }

    console.log(`[MCP Registry] Total servers fetched: ${allServers.length}`);
    return allServers;
  } catch (error) {
    console.error("[MCP Registry] Error fetching servers:", error);
    throw error;
  }
}

function parseReadmeServers(
  readme: string,
  source: "mcp-org" | "servers-repo"
): RegistryServer[] {
  const servers: RegistryServer[] = [];

  try {
    // Parse markdown format: **[Name](url)** - Description
    // This regex matches the pattern with optional emoji/badges before the link
    const serverRegex =
      /(?:🎖️\s*)?(?:[\w\s]*\s*)?\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[-–]\s*(.+?)(?=\n|$)/gm;

    let currentCategory = "General";

    // Also track category headers (e.g., ## Databases, ## Developer Tools)
    const lines = readme.split("\n");

    for (const line of lines) {
      // Check for category headers (remove emoji and clean up)
      const categoryMatch = line.match(/^##\s+(?:[\p{Emoji}\s]*)?(.+)$/u);
      if (categoryMatch) {
        currentCategory = categoryMatch[1]
          .trim()
          .replace(/[^\w\s-]/g, "")
          .trim();
        continue;
      }

      // Parse server entries
      const serverMatch = line.match(
        /(?:🎖️\s*)?(?:[\w\s]*\s*)?\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[-–]\s*(.+?)$/
      );
      if (serverMatch) {
        const [, name, rawRepoUrl, description] = serverMatch;

        // Validate and normalize the URL
        const repoUrl = validateUrl(rawRepoUrl);

        if (!repoUrl) {
          console.warn(
            `[MCP Registry] Skipping server "${name}" with invalid URL: "${rawRepoUrl}"`
          );
          continue;
        }

        // Extract package name from URL if it's a GitHub URL
        let packageName: string | null = null;
        let languages: string[] = [];
        let tags: string[] = [];

        // Add cleaned category tag
        if (currentCategory && currentCategory !== "General") {
          tags.push(currentCategory.toLowerCase().replace(/\s+/g, "-"));
        }

        // Check if it's an official server (has official badge 🎖️)
        if (line.includes("🎖️")) {
          tags.push("official");
        }

        // Detect language from badges or URL
        if (line.includes("🐍") || repoUrl.includes("python")) {
          languages.push("Python");
        }
        if (
          line.includes("📇") ||
          repoUrl.includes("typescript") ||
          repoUrl.includes("javascript")
        ) {
          languages.push("TypeScript");
        }
        if (
          line.includes("🏎️") ||
          repoUrl.includes("golang") ||
          repoUrl.includes("/go")
        ) {
          languages.push("Go");
        }
        if (line.includes("☕")) {
          languages.push("Java");
        }
        if (line.includes("🦀") || repoUrl.includes("rust")) {
          languages.push("Rust");
        }

        // If no language detected, default to TypeScript for GitHub repos
        if (languages.length === 0 && repoUrl.includes("github.com")) {
          languages.push("TypeScript");
        }

        // Try to extract package name from GitHub URL
        const githubMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (githubMatch) {
          const [, owner, repo] = githubMatch;
          // Common pattern: @owner/mcp-server-name or mcp-server-name
          packageName = `@${owner}/${repo}`;
        }

        const installSnippets: RegistryServer["installSnippets"] = {};

        // Generate install snippets based on language
        if (languages.includes("Python")) {
          installSnippets.python = packageName
            ? `pip install ${packageName}`
            : `# Clone and install from ${repoUrl}`;
        } else if (packageName) {
          // Node.js packages
          installSnippets.npm = `npm install -g ${packageName}`;
          installSnippets.pnpm = `pnpm add -g ${packageName}`;
          installSnippets.bun = `bun add -g ${packageName}`;
        }

        const id = `${source}-${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`;

        servers.push({
          id,
          name,
          description: description.trim(),
          homepage: null,
          repoUrl,
          languages,
          packageName,
          installSnippets,
          tags,
          source,
        });
      }
    }

    return servers;
  } catch (error) {
    console.error("[MCP Registry] Error parsing README servers:", error);
    return [];
  }
}

// Search GitHub for repositories with "mcp-server" or "model-context-protocol" topics
async function searchGitHubForMCPServers(
  token?: string
): Promise<RegistryServer[]> {
  try {
    const searchQueries = [
      "mcp-server in:name,description,topics",
      "model-context-protocol in:topics",
    ];

    const servers: RegistryServer[] = [];
    const seenRepos = new Set<string>();

    for (const query of searchQueries) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
        query
      )}&sort=stars&per_page=30`;

      try {
        const response = await fetchWithCache(url, token);

        if (response?.items) {
          for (const repo of response.items) {
            if (seenRepos.has(repo.html_url)) continue;
            seenRepos.add(repo.html_url);

            const languages: string[] = [];
            if (repo.language) {
              languages.push(repo.language);
            }

            const tags: string[] = [...(repo.topics || [])];

            const installSnippets: RegistryServer["installSnippets"] = {};
            const packageName = `@${repo.owner.login}/${repo.name}`;

            if (repo.language === "Python") {
              installSnippets.python = `pip install ${packageName}`;
            } else if (["TypeScript", "JavaScript"].includes(repo.language)) {
              installSnippets.npm = `npm install -g ${packageName}`;
              installSnippets.pnpm = `pnpm add -g ${packageName}`;
              installSnippets.bun = `bun add -g ${packageName}`;
            }

            servers.push({
              id: `github-${repo.id}`,
              name: repo.name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: repo.description || "No description available",
              homepage: repo.homepage ? validateUrl(repo.homepage) : null,
              repoUrl: repo.html_url,
              languages,
              packageName,
              installSnippets,
              tags,
              source: "mcp-org" as const,
            });
          }
        }
      } catch (error) {
        console.warn(
          `[MCP Registry] Failed to search GitHub with query: ${query}`,
          error
        );
      }
    }

    return servers;
  } catch (error) {
    console.error("[MCP Registry] Error searching GitHub:", error);
    return [];
  }
}

async function fetchFileContent(
  url: string,
  token?: string
): Promise<string | null> {
  try {
    console.log("[MCP Registry] Fetching file content from:", url);

    const cached = cache.get(url);
    const headers: HeadersInit = {};

    // For raw.githubusercontent.com, don't use GitHub API headers
    if (!url.includes("raw.githubusercontent.com")) {
      headers.Accept = "application/vnd.github.v3.raw";
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Use ETag caching
    if (
      cached &&
      Date.now() - cached.timestamp < CACHE_DURATION &&
      cached.etag
    ) {
      headers["If-None-Match"] = cached.etag;
    }

    const response = await fetch(url, {
      headers,
      cache: "no-store", // Prevent Next.js caching issues
    });

    if (response.status === 304 && cached) {
      console.log("[MCP Registry] Using cached content for:", url);
      return cached.data;
    }

    if (!response.ok) {
      console.error(
        "[MCP Registry] Fetch failed:",
        response.status,
        response.statusText
      );
      // Return cached data if available
      if (cached) {
        console.log("[MCP Registry] Returning stale cache due to error");
        return cached.data;
      }
      return null;
    }

    const data = await response.text();
    const etag = response.headers.get("ETag");

    cache.set(url, { data, etag, timestamp: Date.now() });

    console.log("[MCP Registry] Successfully fetched and cached content");
    return data;
  } catch (error) {
    console.error("[MCP Registry] Error fetching file content:", error);
    // Return cached data if available
    const cached = cache.get(url);
    if (cached) {
      console.log("[MCP Registry] Returning stale cache due to error");
      return cached.data;
    }
    return null;
  }
}

export function clearCache() {
  cache.clear();
  console.log("[MCP Registry] Cache cleared");
}
