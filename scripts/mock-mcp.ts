// Mock remote MCP server (Streamable HTTP, stateless) for local testing and e2e.
// Run: bun scripts/mock-mcp.ts [port]  → add server URL http://127.0.0.1:<port>/mcp
// Set MOCK_MCP_TOKEN to require "Authorization: Bearer <token>".
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

Bun.serve({
  port,
  async fetch(req) {
    if (new URL(req.url).pathname !== "/mcp") return new Response("not found", { status: 404 });
    if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
      return new Response("unauthorized", { status: 401 });
    }
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await buildServer().connect(transport);
    return transport.handleRequest(req);
  },
});

console.log(`mock MCP on http://127.0.0.1:${port}/mcp`);
