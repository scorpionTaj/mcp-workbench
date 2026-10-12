// Client for the official MCP Registry (registry.modelcontextprotocol.io).
// Only servers with a remote (HTTP/SSE) endpoint can be used by the hosted app.

const REGISTRY = "https://registry.modelcontextprotocol.io/v0/servers";

export interface RegistryRemote {
  transport: "http" | "sse";
  url: string;
  headers: { name: string; required: boolean; secret: boolean; description?: string }[];
}

export interface RegistryEntry {
  name: string;
  title: string;
  description: string;
  version: string;
  websiteUrl: string | null;
  repositoryUrl: string | null;
  remotes: RegistryRemote[];
  hasLocalPackages: boolean;
}

type RawServer = {
  server: {
    name: string;
    title?: string | null;
    description?: string;
    version?: string;
    websiteUrl?: string | null;
    repository?: { url?: string } | null;
    packages?: unknown[] | null;
    remotes?: {
      type: string;
      url: string;
      headers?: { name: string; isRequired?: boolean | null; isSecret?: boolean | null; description?: string }[] | null;
    }[] | null;
  };
};

export function normalizeEntry({ server }: RawServer): RegistryEntry {
  return {
    name: server.name,
    title: server.title || server.name.split("/").pop() || server.name,
    description: server.description ?? "",
    version: server.version ?? "",
    websiteUrl: server.websiteUrl ?? null,
    repositoryUrl: server.repository?.url ?? null,
    hasLocalPackages: (server.packages?.length ?? 0) > 0,
    remotes: (server.remotes ?? [])
      // Registry remote URLs may contain {placeholders} the user must fill in; skip those for one-click add.
      .filter((r) => (r.type === "streamable-http" || r.type === "sse") && !r.url.includes("{"))
      .map((r) => ({
        transport: r.type === "sse" ? "sse" : "http",
        url: r.url,
        headers: (r.headers ?? []).map((h) => ({
          name: h.name,
          required: !!h.isRequired,
          secret: !!h.isSecret,
          description: h.description,
        })),
      })),
  };
}

export async function searchRegistry(opts: { search?: string; cursor?: string; remoteOnly?: boolean }) {
  const url = new URL(REGISTRY);
  url.searchParams.set("limit", "100");
  url.searchParams.set("version", "latest");
  if (opts.search) url.searchParams.set("search", opts.search);
  if (opts.cursor) url.searchParams.set("cursor", opts.cursor);

  // Cached by Next's fetch cache for an hour per URL.
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`MCP registry responded ${res.status}`);
  const body = (await res.json()) as { servers: RawServer[]; metadata?: { nextCursor?: string } };

  const servers = body.servers.map(normalizeEntry);
  return {
    servers: opts.remoteOnly === false ? servers : servers.filter((s) => s.remotes.length > 0),
    nextCursor: body.metadata?.nextCursor ?? null,
  };
}
