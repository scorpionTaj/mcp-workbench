// MCP stdio bridge: run a local stdio MCP server and expose it to MCP Workbench as a remote
// (Streamable HTTP) server. The hosted app can't start processes on your machine; this can.
//
//   bun scripts/mcp-bridge.ts [--port 8808] [--host 127.0.0.1] [--token <secret>] -- <command> [args…]
//   e.g. bun scripts/mcp-bridge.ts -- npx -y @modelcontextprotocol/server-filesystem ~/notes
//
// Then add http://127.0.0.1:8808/mcp in the Inspector with header "Authorization: Bearer <token>".
// A self-hosted workbench can reach it directly; for the hosted app expose it with a tunnel
// (e.g. `cloudflared tunnel --url http://127.0.0.1:8808`) and use the tunnel's https URL.
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

const argv = process.argv.slice(2);
const split = argv.indexOf("--");
const flags = split < 0 ? [] : argv.slice(0, split);
const [command, ...args] = split < 0 ? argv : argv.slice(split + 1);
const flag = (name: string) => {
  const i = flags.indexOf(`--${name}`);
  return i >= 0 ? flags[i + 1] : undefined;
};
if (!command) {
  console.error("Usage: bun scripts/mcp-bridge.ts [--port 8808] [--host 127.0.0.1] [--token <secret>] -- <command> [args…]");
  process.exit(1);
}

const port = Number(flag("port") ?? 8808);
const host = flag("host") ?? "127.0.0.1"; // loopback only unless you opt in
const token = flag("token") ?? process.env.MCP_BRIDGE_TOKEN ?? randomBytes(24).toString("base64url");
const IDLE_MS = 10 * 60_000;

type Session = { http: WebStandardStreamableHTTPServerTransport; child: StdioClientTransport; lastUsed: number };
const sessions = new Map<string, Session>();

function authorized(req: Request) {
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${token}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function close(id: string) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  await Promise.allSettled([s.child.close(), s.http.close()]);
}

/** Each MCP session gets its own child process, so clients never share server state. */
async function openSession(): Promise<Pick<Session, "http" | "child">> {
  const child = new StdioClientTransport({ command, args, stderr: "inherit" });
  const http: WebStandardStreamableHTTPServerTransport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { http, child, lastUsed: Date.now() });
    },
    onsessionclosed: (id) => close(id),
  });
  // Forward JSON-RPC messages both ways.
  http.onmessage = (message) => void child.send(message).catch((err) => console.error("bridge → server:", err));
  child.onmessage = (message) => void http.send(message).catch((err) => console.error("server → client:", err));
  child.onclose = () => void http.close();
  child.onerror = (err) => console.error("server process:", err.message);
  await child.start();
  await http.start();
  return { http, child };
}

Bun.serve({
  port,
  hostname: host,
  async fetch(req) {
    if (new URL(req.url).pathname !== "/mcp") return new Response("not found", { status: 404 });
    if (!authorized(req)) return new Response("unauthorized", { status: 401 });

    const id = req.headers.get("mcp-session-id");
    if (id) {
      const s = sessions.get(id);
      if (!s) return new Response("unknown or expired session", { status: 404 });
      s.lastUsed = Date.now();
      return s.http.handleRequest(req);
    }
    if (req.method !== "POST") return new Response("start a session with POST initialize", { status: 400 });
    const { http, child } = await openSession();
    const res = await http.handleRequest(req);
    // Not a valid initialize: no session was created, so stop the process we started.
    if (!http.sessionId) void child.close();
    return res;
  },
});

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.lastUsed > IDLE_MS) void close(id);
}, 60_000).unref();

console.log(`MCP bridge for "${[command, ...args].join(" ")}"`);
console.log(`  URL:    http://${host}:${port}/mcp`);
console.log(`  Header: Authorization: Bearer ${token}`);
