import { NextResponse } from "next/server";
import { auth } from "@ai-sdk/mcp";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withUser } from "@/lib/api";
import { DbOAuthProvider, readOAuthState, serverIdFromState, stateMatches } from "@/lib/mcp-oauth";
import logger from "@/lib/logger";

/**
 * OAuth redirect target. The `state` names the server and must match the one stored when the
 * signed-in owner started the flow, so a crafted link can't attach tokens to someone's server.
 */
export const GET = withUser(async (req, user) => {
  const url = new URL(req.url);
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(new URL(`/tools?${new URLSearchParams(params)}`, url.origin));

  const state = url.searchParams.get("state") ?? "";
  const serverId = serverIdFromState(state);
  const server = serverId
    ? await db.query.mcpServers.findFirst({
        where: and(eq(schema.mcpServers.id, serverId), eq(schema.mcpServers.userId, user.id)),
      })
    : undefined;
  if (!server || !stateMatches(readOAuthState(server).state, state)) {
    return back({ oauth: "error", message: "This sign-in link is invalid or expired; start again from the Inspector" });
  }
  const denied = url.searchParams.get("error");
  if (denied) {
    return back({ oauth: "error", server: server.id, message: url.searchParams.get("error_description") ?? denied });
  }

  try {
    await auth(await DbOAuthProvider.load(server.id), {
      serverUrl: server.url,
      authorizationCode: url.searchParams.get("code") ?? "",
      callbackState: state,
      callbackIssuer: url.searchParams.get("iss") ?? undefined,
    });
    return back({ oauth: "connected", server: server.id });
  } catch (err) {
    logger.warn({ err, serverId: server.id }, "MCP OAuth callback failed");
    return back({ oauth: "error", server: server.id, message: err instanceof Error ? err.message : "Sign-in failed" });
  }
});
