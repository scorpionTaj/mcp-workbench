import { randomBytes, timingSafeEqual } from "node:crypto";
import type {
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthTokens,
} from "@ai-sdk/mcp";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { checkOutboundUrl } from "@/lib/url-guard";
import type { McpServer } from "@/lib/schema";

/** Everything the OAuth flow persists for one server, stored encrypted in McpServer.oauth. */
export interface OAuthState {
  clientInformation?: OAuthClientInformation;
  dynamic?: boolean; // client came from dynamic registration (may be re-registered on auth errors)
  tokens?: OAuthTokens;
  codeVerifier?: string;
  state?: string; // CSRF state of the authorization in progress: "<serverId>.<random>"
}

export const oauthCallbackUrl = () =>
  `${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "")}/api/mcp/oauth/callback`;

export function readOAuthState(server: Pick<McpServer, "oauth">): OAuthState {
  if (!server.oauth) return {};
  try {
    return JSON.parse(decrypt(server.oauth));
  } catch {
    return {}; // unreadable (e.g. key rotated): start the flow over
  }
}

/** The server id a callback's `state` refers to (the random part is checked against storage). */
export const serverIdFromState = (state: string) => state.split(".")[0] || null;

export function stateMatches(stored: string | undefined, received: string) {
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * OAuth client for one MCP server, backed by the database. The MCP SDK drives discovery,
 * dynamic client registration, PKCE, code exchange and token refresh through these hooks.
 * A browser redirect can't happen server-side, so `redirectToAuthorization` only records the
 * URL; the API hands it to the browser.
 */
export class DbOAuthProvider implements OAuthClientProvider {
  authorizationUrl?: URL;

  constructor(
    private readonly serverId: string,
    private st: OAuthState,
  ) {}

  static async load(serverId: string) {
    const server = await db.query.mcpServers.findFirst({ where: eq(schema.mcpServers.id, serverId) });
    return new DbOAuthProvider(serverId, server ? readOAuthState(server) : {});
  }

  get connected() {
    return Boolean(this.st.tokens?.access_token);
  }

  private async persist(patch: Partial<OAuthState>) {
    this.st = { ...this.st, ...patch };
    await db
      .update(schema.mcpServers)
      .set({ oauth: encrypt(JSON.stringify(this.st)), updatedAt: new Date() })
      .where(eq(schema.mcpServers.id, this.serverId));
  }

  get redirectUrl() {
    return oauthCallbackUrl();
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "MCP Workbench",
      redirect_uris: [oauthCallbackUrl()],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  async state() {
    const state = `${this.serverId}.${randomBytes(24).toString("base64url")}`;
    await this.persist({ state });
    return state;
  }
  storedState() {
    return this.st.state;
  }

  clientInformation() {
    return this.st.clientInformation;
  }
  async saveClientInformation(clientInformation: OAuthClientInformation) {
    await this.persist({ clientInformation, dynamic: true });
  }
  isClientInformationDynamicallyRegistered() {
    return this.st.dynamic === true;
  }

  tokens() {
    return this.st.tokens;
  }
  async saveTokens(tokens: OAuthTokens) {
    await this.persist({ tokens, codeVerifier: undefined, state: undefined });
  }

  async saveCodeVerifier(codeVerifier: string) {
    await this.persist({ codeVerifier });
  }
  codeVerifier() {
    if (!this.st.codeVerifier) throw new Error("No sign-in in progress for this server");
    return this.st.codeVerifier;
  }

  redirectToAuthorization(authorizationUrl: URL) {
    this.authorizationUrl = authorizationUrl;
  }

  /** The MCP server tells us where to log in; that host must pass the same SSRF checks. */
  async validateAuthorizationServerURL(_serverUrl: string | URL, authorizationServerUrl: string | URL) {
    const problem = await checkOutboundUrl(String(authorizationServerUrl));
    if (problem) throw new Error(`Authorization server rejected: ${problem}`);
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier", context?: { tokens: OAuthTokens }) {
    if (scope === "verifier") return this.persist({ codeVerifier: undefined });
    if (scope === "tokens") {
      // Only drop the tokens that failed; a concurrent refresh may already have saved newer ones.
      const current = (await DbOAuthProvider.load(this.serverId)).st.tokens;
      if (context && current?.access_token !== context.tokens.access_token) return;
      return this.persist({ tokens: undefined });
    }
    if (scope === "client") return this.persist({ clientInformation: undefined, dynamic: undefined });
    return this.persist({ clientInformation: undefined, dynamic: undefined, tokens: undefined, codeVerifier: undefined });
  }
}
