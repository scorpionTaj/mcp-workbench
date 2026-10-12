// Parses an `mcpServers` config (Claude Desktop / Cursor / VS Code style) into remote servers
// this app can connect to. stdio servers (`command`) can't run in a hosted app and are reported.

export interface ImportedServer {
  name: string;
  url: string;
  transport: "http" | "sse";
  headers: Record<string, string>;
}

export interface ConfigImport {
  servers: ImportedServer[];
  skipped: { name: string; reason: string }[];
}

export function parseMcpConfig(text: string): ConfigImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That isn't valid JSON");
  }
  const root = json as Record<string, unknown>;
  // Accept { mcpServers: {...} }, VS Code's { servers: {...} }, or the map itself.
  const map = (root?.mcpServers ?? root?.servers ?? root) as Record<string, unknown>;
  if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error("Expected an object of servers");

  const result: ConfigImport = { servers: [], skipped: [] };
  for (const [name, raw] of Object.entries(map)) {
    const entry = raw as Record<string, unknown>;
    if (!entry || typeof entry !== "object") {
      result.skipped.push({ name, reason: "not an object" });
      continue;
    }
    const url = typeof entry.url === "string" ? entry.url : typeof entry.serverUrl === "string" ? entry.serverUrl : null;
    if (!url) {
      result.skipped.push({
        name,
        reason: typeof entry.command === "string" ? "local (stdio) server: runs a command, which a hosted app can't do" : "no url",
      });
      continue;
    }
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      result.skipped.push({ name, reason: `invalid url ${url}` });
      continue;
    }
    const headers: Record<string, string> = {};
    if (entry.headers && typeof entry.headers === "object") {
      for (const [k, v] of Object.entries(entry.headers as Record<string, unknown>)) {
        if (typeof v === "string") headers[k] = v;
      }
    }
    const type = String(entry.type ?? entry.transport ?? "");
    result.servers.push({
      name: name.slice(0, 60),
      url,
      transport: type === "sse" || /\/sse\/?$/.test(new URL(url).pathname) ? "sse" : "http",
      headers,
    });
  }
  return result;
}
