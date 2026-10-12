import { createMCPClient, UnauthorizedError, type MCPClient } from "@ai-sdk/mcp";
import { DbOAuthProvider, readOAuthState } from "@/lib/mcp-oauth";
import type { ToolSet } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import logger from "@/lib/logger";
import type { McpServer } from "@/lib/schema";

const CONNECT_TIMEOUT_MS = 15_000;

export function serverHeaders(server: Pick<McpServer, "headers">): Record<string, string> {
  return server.headers ? JSON.parse(decrypt(server.headers)) : {};
}

/** The server uses OAuth and the user hasn't signed in yet (or the sign-in expired). */
export class McpAuthRequiredError extends Error {
  constructor(serverName: string) {
    super(`${serverName} needs you to sign in (MCP Inspector → Sign in)`);
  }
}

/** Opens a client to a user's remote MCP server. Caller must close() it. */
export async function connectServer(server: McpServer): Promise<MCPClient> {
  const problem = await checkOutboundUrl(server.url);
  if (problem) throw new Error(`Server URL rejected: ${problem}`);
  const authProvider = server.authType === "oauth" ? new DbOAuthProvider(server.id, readOAuthState(server)) : undefined;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out connecting to ${server.name}`)), CONNECT_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      createMCPClient({
        transport: {
          type: server.transport === "sse" ? "sse" : "http",
          url: server.url,
          headers: serverHeaders(server),
          ...(authProvider && { authProvider }),
          redirect: "error", // a redirect could point the server-side fetch somewhere internal
        },
        onUncaughtError: (err) => logger.warn({ err, server: server.name }, "MCP client error"),
      }),
      timeout,
    ]);
  } catch (err) {
    if (authProvider && (err instanceof UnauthorizedError || (err as Error)?.name === "UnauthorizedError")) {
      throw new McpAuthRequiredError(server.name);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Tool names must match ^[a-zA-Z0-9_-]{1,64}$ for most providers. */
export function toolKey(prefix: string, tool: string) {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${clean(prefix)}__${clean(tool)}`.slice(0, 64);
}

export function serverPrefix(name: string, taken: Set<string>) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20) || "mcp";
  let prefix = base;
  for (let i = 2; taken.has(prefix); i++) prefix = `${base}${i}`;
  taken.add(prefix);
  return prefix;
}

type Approval = "not-applicable" | { type: "user-approval"; reason: string };

/** Per-server policy: "never" never asks, "always" always asks, "readonly" asks unless the server marks the tool read-only. */
export function approvalFor(policy: string, readOnlyHint: boolean | undefined, serverName: string): Approval {
  if (policy === "never") return "not-applicable";
  if (policy === "readonly" && readOnlyHint === true) return "not-applicable";
  return {
    type: "user-approval",
    reason:
      policy === "always"
        ? `${serverName} is set to always ask before running tools`
        : `${serverName} does not mark this tool as read-only`,
  };
}

/**
 * Connects to the selected (enabled, owned) servers and returns their tools, namespaced
 * as `<server>__<tool>`, plus the approval policy for each. Unreachable servers are
 * skipped and reported in `errors` so one bad server doesn't break the chat.
 */
export async function loadChatTools(userId: string, serverIds: string[]) {
  const empty = { tools: {} as ToolSet, toolApproval: {} as Record<string, Approval>, errors: [] as string[], close: async () => {} };
  if (!serverIds.length) return empty;

  const servers = await db.query.mcpServers.findMany({
    where: and(
      eq(schema.mcpServers.userId, userId),
      eq(schema.mcpServers.enabled, true),
      inArray(schema.mcpServers.id, serverIds),
    ),
  });

  const clients: MCPClient[] = [];
  const taken = new Set<string>();
  const result = { ...empty, tools: {} as ToolSet, toolApproval: {} as Record<string, Approval>, errors: [] as string[] };

  await Promise.all(
    servers.map(async (server) => {
      try {
        const client = await connectServer(server);
        clients.push(client);
        const defs = await client.listTools();
        const tools = client.toolsFromDefinitions(defs);
        const prefix = serverPrefix(server.name, taken);
        for (const def of defs.tools) {
          if (server.disabledTools.includes(def.name) || !tools[def.name]) continue;
          const key = toolKey(prefix, def.name);
          result.tools[key] = tools[def.name];
          result.toolApproval[key] = approvalFor(server.approval, def.annotations?.readOnlyHint, server.name);
        }
      } catch (err) {
        logger.warn({ err, server: server.name }, "MCP server unavailable for chat");
        result.errors.push(`${server.name}: ${err instanceof Error ? err.message : "unavailable"}`);
      }
    }),
  );

  result.close = async () => {
    await Promise.allSettled(clients.map((c) => c.close()));
  };
  return result;
}
