// Mock remote MCP server (Streamable HTTP, stateless) for local testing and e2e.
// Run: bun scripts/mock-mcp.ts [port]  → add server URL http://127.0.0.1:<port>/mcp
// Set MOCK_MCP_TOKEN to require "Authorization: Bearer <token>", or MOCK_MCP_OAUTH=1 to require OAuth sign-in.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

const port = Number(process.argv[2] ?? 4020);
const token = process.env.MOCK_MCP_TOKEN;
const notes = new Map([["welcome", "Hello from the mock MCP server"]]);

function buildServer() {
  const server = new McpServer({ name: "mock-mcp", version: "1.0.0" });

  server.registerTool(
    "add",
    {
      description: "Add two numbers",
      inputSchema: { a: z.number(), b: z.number() },
      annotations: { readOnlyHint: true },
    },
    async ({ a, b }) => ({ content: [{ type: "text", text: String(a + b) }] }),
  );

  server.registerTool(
    "list_notes",
    { description: "List note titles", annotations: { readOnlyHint: true } },
    async () => ({ content: [{ type: "text", text: [...notes.keys()].join(", ") || "(none)" }] }),
  );

  server.registerTool(
    "delete_note",
    {
      description: "Delete a note by title",
      inputSchema: { title: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ title }) => ({
      content: [{ type: "text", text: notes.delete(title) ? `Deleted ${title}` : `No note ${title}` }],
    }),
  );

  server.registerResource(
    "welcome-note",
    "notes://welcome",
    { description: "The welcome note", mimeType: "text/plain" },
    async (uri) => ({ contents: [{ uri: uri.href, text: notes.get("welcome") ?? "" }] }),
  );

  server.registerPrompt(
    "summarize",
    { description: "Summarize a topic", argsSchema: { topic: z.string() } },
    ({ topic }) => ({
      messages: [{ role: "user", content: { type: "text", text: `Summarize ${topic} in one line.` } }],
    }),
  );

  return server;
}

// --- Optional OAuth mode (MOCK_MCP_OAUTH=1): a tiny authorization server that auto-approves.
// Enough for the real MCP SDK flow: resource metadata, AS metadata, dynamic registration,
// PKCE (S256) code exchange and refresh tokens.
const oauthMode = process.env.MOCK_MCP_OAUTH === "1";
const base = `http://127.0.0.1:${port}`;
const codes = new Map<string, { challenge: string; redirectUri: string }>();
const accessTokens = new Set<string>();
const refreshTokens = new Set<string>();
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const rand = () => crypto.randomUUID().replaceAll("-", "");
const s256 = async (v: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))).toString("base64url");

async function handleOAuth(req: Request, url: URL): Promise<Response | null> {
  switch (url.pathname) {
    case "/.well-known/oauth-protected-resource":
    case "/.well-known/oauth-protected-resource/mcp":
      return json({ resource: `${base}/mcp`, authorization_servers: [base] });
    case "/.well-known/oauth-authorization-server":
      return json({
        issuer: base,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        registration_endpoint: `${base}/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      });
    case "/register": {
      const meta = (await req.json()) as Record<string, unknown>;
      return json({ ...meta, client_id: `client-${rand()}`, client_id_issued_at: Math.floor(Date.now() / 1000) }, 201);
    }
    case "/authorize": {
      // Auto-approve: send the user straight back with a code.
      const redirect = new URL(url.searchParams.get("redirect_uri")!);
      const code = rand();
      codes.set(code, { challenge: url.searchParams.get("code_challenge")!, redirectUri: redirect.toString() });
      redirect.searchParams.set("code", code);
      redirect.searchParams.set("state", url.searchParams.get("state") ?? "");
      redirect.searchParams.set("iss", base);
      return Response.redirect(redirect.toString(), 302);
    }
    case "/token": {
      const form = new URLSearchParams(await req.text());
      if (form.get("grant_type") === "authorization_code") {
        const entry = codes.get(form.get("code") ?? "");
        codes.delete(form.get("code") ?? "");
        if (!entry || entry.challenge !== (await s256(form.get("code_verifier") ?? ""))) {
          return json({ error: "invalid_grant" }, 400);
        }
      } else if (form.get("grant_type") === "refresh_token") {
        if (!refreshTokens.delete(form.get("refresh_token") ?? "")) return json({ error: "invalid_grant" }, 400);
      } else return json({ error: "unsupported_grant_type" }, 400);
      const access = rand();
      const refresh = rand();
      accessTokens.add(access);
      refreshTokens.add(refresh);
      return json({ access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: 3600 });
    }
  }
  return null;
}

// --stdio: speak MCP over stdin/stdout instead (used to test scripts/mcp-bridge.ts).
if (process.argv.includes("--stdio")) {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  await buildServer().connect(new StdioServerTransport());
} else
Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (oauthMode) {
      const handled = await handleOAuth(req, url);
      if (handled) return handled;
    }
    if (url.pathname !== "/mcp") return new Response("not found", { status: 404 });
    if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
      return new Response("unauthorized", { status: 401 });
    }
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (oauthMode && !accessTokens.has(bearer)) {
      return new Response("unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"` },
      });
    }
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await buildServer().connect(transport);
    return transport.handleRequest(req);
  },
});

if (!process.argv.includes("--stdio")) console.log(`mock MCP on http://127.0.0.1:${port}/mcp${oauthMode ? " (OAuth)" : ""}`);
