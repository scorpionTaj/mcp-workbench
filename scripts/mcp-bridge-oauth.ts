// OAuth 2.1 for the stdio bridge, following the MCP authorization spec: protected-resource and
// authorization-server metadata, dynamic client registration, authorization code + PKCE (S256)
// and refresh tokens. MCP Workbench's existing MCP OAuth support drives the whole flow, so no
// token has to be copied by hand.
//
// The bridge may sit behind a public tunnel, so reaching /authorize proves nothing. Approving a
// client takes the pairing code printed in the bridge's terminal; wrong codes are counted, and
// after MAX_PAIRING_FAILURES the bridge stops approving until it is restarted.
//
// Everything lives in memory: restarting the bridge signs every client out.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAX_PAIRING_FAILURES = 10;
const CODE_TTL_MS = 60_000;
const ACCESS_TTL_MS = 60 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;
const MAX_CLIENTS = 100;

interface Client {
  id: string;
  name: string;
  redirectUris: string[];
}
interface AuthCode {
  clientId: string;
  redirectUri: string;
  challenge: string;
  expires: number;
}
interface Token {
  clientId: string;
  expires: number;
}

const random = (bytes = 32) => randomBytes(bytes).toString("base64url");
const s256 = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A short code that is easy to read off a terminal: 10 characters, no look-alikes (≈50 bits). */
export function newPairingCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Redirect URIs must be https, or http on a loopback host (a self-hosted workbench). */
function allowedRedirect(uri: unknown): uri is string {
  if (typeof uri !== "string" || uri.length > 2000) return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
const oauthError = (error: string, description: string, status = 400) =>
  json({ error, error_description: description }, status);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface BridgeAuthOptions {
  /** The pre-shared bearer token; still accepted alongside OAuth access tokens. */
  staticToken: string;
  pairingCode: string;
  /** What the bridge serves, shown on the consent page. */
  description: string;
  /** Public origin (e.g. the tunnel URL); otherwise taken from the request. */
  publicUrl?: string;
  now?: () => number;
}

export function createBridgeAuth(opts: BridgeAuthOptions) {
  const now = opts.now ?? Date.now;
  const clients = new Map<string, Client>();
  const codes = new Map<string, AuthCode>();
  const accessTokens = new Map<string, Token>();
  const refreshTokens = new Map<string, Token>();
  let pairingFailures = 0;

  const origin = (req: Request) => {
    if (opts.publicUrl) return opts.publicUrl.replace(/\/+$/, "");
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    return `${proto}://${host}`;
  };
  const resourceMetadataUrl = (req: Request) => `${origin(req)}/.well-known/oauth-protected-resource`;

  function sweep() {
    const t = now();
    for (const map of [codes, accessTokens, refreshTokens] as Map<string, { expires: number }>[]) {
      for (const [k, v] of map) if (v.expires <= t) map.delete(k);
    }
  }

  function issueTokens(clientId: string) {
    const access = random();
    const refresh = random();
    accessTokens.set(access, { clientId, expires: now() + ACCESS_TTL_MS });
    refreshTokens.set(refresh, { clientId, expires: now() + REFRESH_TTL_MS });
    return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh });
  }

  /** Validates an authorization request; returns the client or an error message to show. */
  function checkAuthorizeParams(p: URLSearchParams): { client: Client } | { error: string } {
    const client = clients.get(p.get("client_id") ?? "");
    if (!client) return { error: "Unknown client. Connect again from MCP Workbench." };
    if (!client.redirectUris.includes(p.get("redirect_uri") ?? "")) return { error: "This redirect URI isn't registered for the client." };
    if (p.get("response_type") !== "code") return { error: "Only response_type=code is supported." };
    if (p.get("code_challenge_method") !== "S256" || !/^[\w-]{43,128}$/.test(p.get("code_challenge") ?? "")) {
      return { error: "A PKCE S256 code_challenge is required." };
    }
    return { client };
  }

  const FIELDS = ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource"];

  /**
   * `formAction` adds an origin the page's form may lead to. Chrome applies form-action to the
   * redirect that follows a POST, so the consent form needs the client's redirect_uri origin.
   */
  function page(title: string, body: string, status = 200, formAction?: string) {
    return new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#111;background:#fff}@media(prefers-color-scheme:dark){body{color:#eee;background:#111}input{background:#222;color:#eee}}
code{font-size:.9em}input[type=text]{font:inherit;letter-spacing:.15em;text-transform:uppercase;padding:.4rem .6rem;width:100%;box-sizing:border-box;border:1px solid #888;border-radius:6px}
.row{display:flex;gap:.5rem;margin-top:1rem}button{font:inherit;padding:.45rem 1rem;border-radius:6px;border:1px solid #888;cursor:pointer}.err{color:#c33}</style></head><body>${body}</body></html>`,
      {
        status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Frame-Options": "DENY",
          "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; form-action 'self'${formAction ? ` ${formAction}` : ""}; frame-ancestors 'none'`,
        },
      },
    );
  }

  function consentPage(p: URLSearchParams, client: Client, error?: string) {
    const hidden = FIELDS.filter((f) => p.has(f))
      .map((f) => `<input type="hidden" name="${f}" value="${escapeHtml(p.get(f)!)}">`)
      .join("");
    // checkAuthorizeParams already matched redirect_uri against the client's registered URIs.
    const redirect = new URL(p.get("redirect_uri")!);
    const redirectHost = redirect.host;
    return page(
      "Approve MCP client",
      `<h1>Allow ${escapeHtml(client.name)}?</h1>
<p>It wants to use <code>${escapeHtml(opts.description)}</code> through this bridge, then return to <strong>${escapeHtml(redirectHost)}</strong>.</p>
<form method="post" action="/authorize">${hidden}
<label for="pairing">Pairing code from the bridge's terminal</label>
<input id="pairing" name="pairing_code" type="text" autocomplete="off" autofocus maxlength="20">
${error ? `<p class="err" role="alert">${escapeHtml(error)}</p>` : ""}
<div class="row"><button type="submit" name="decision" value="approve">Approve</button><button type="submit" name="decision" value="deny">Deny</button></div>
</form>`,
      error ? 400 : 200,
      redirect.origin,
    );
  }

  function redirectWith(redirectUri: string, params: Record<string, string | null>) {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
  }

  async function authorize(req: Request) {
    const p = req.method === "POST" ? new URLSearchParams(await req.text()) : new URL(req.url).searchParams;
    const checked = checkAuthorizeParams(p);
    if ("error" in checked) return page("Can't authorize", `<h1>Can't authorize</h1><p class="err">${escapeHtml(checked.error)}</p>`, 400);
    if (req.method !== "POST") return consentPage(p, checked.client);

    const redirectUri = p.get("redirect_uri")!;
    const state = p.get("state");
    if (p.get("decision") !== "approve") return redirectWith(redirectUri, { error: "access_denied", state });
    if (pairingFailures >= MAX_PAIRING_FAILURES) {
      return consentPage(p, checked.client, "Too many wrong codes. Restart the bridge to get a new pairing code.");
    }
    const entered = (p.get("pairing_code") ?? "").trim().toUpperCase();
    if (!sameSecret(entered, opts.pairingCode)) {
      pairingFailures++;
      return consentPage(p, checked.client, "That code doesn't match the one in the bridge's terminal.");
    }
    sweep();
    const code = random();
    codes.set(code, { clientId: checked.client.id, redirectUri, challenge: p.get("code_challenge")!, expires: now() + CODE_TTL_MS });
    return redirectWith(redirectUri, { code, state });
  }

  async function register(req: Request) {
    const body = (await req.json().catch(() => null)) as { client_name?: unknown; redirect_uris?: unknown } | null;
    const uris = body?.redirect_uris;
    if (!Array.isArray(uris) || !uris.length || uris.length > 10 || !uris.every(allowedRedirect)) {
      return oauthError("invalid_redirect_uri", "redirect_uris must be https URLs (or http on localhost)");
    }
    const name = typeof body?.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 100) : "An MCP client";
    // Oldest registrations go first once the table is full (Map keeps insertion order).
    while (clients.size >= MAX_CLIENTS) clients.delete(clients.keys().next().value!);
    const client: Client = { id: random(16), name, redirectUris: uris };
    clients.set(client.id, client);
    return json(
      {
        client_id: client.id,
        client_id_issued_at: Math.floor(now() / 1000),
        client_name: name,
        redirect_uris: uris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      201,
    );
  }

  async function token(req: Request) {
    const p = new URLSearchParams(await req.text());
    const clientId = p.get("client_id") ?? "";
    sweep();
    if (p.get("grant_type") === "authorization_code") {
      const code = codes.get(p.get("code") ?? "");
      if (code) codes.delete(p.get("code")!); // single use, even when the exchange fails
      if (!code || code.clientId !== clientId || code.redirectUri !== p.get("redirect_uri")) {
        return oauthError("invalid_grant", "Unknown, expired or mismatched authorization code");
      }
      if (!sameSecret(s256(p.get("code_verifier") ?? ""), code.challenge)) return oauthError("invalid_grant", "PKCE verification failed");
      return issueTokens(clientId);
    }
    if (p.get("grant_type") === "refresh_token") {
      const refresh = p.get("refresh_token") ?? "";
      const t = refreshTokens.get(refresh);
      if (!t || t.clientId !== clientId) return oauthError("invalid_grant", "Unknown or expired refresh token");
      refreshTokens.delete(refresh); // rotated
      return issueTokens(clientId);
    }
    return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
  }

  return {
    /** Answers the OAuth endpoints; null for any other path. */
    async handle(req: Request): Promise<Response | null> {
      const path = new URL(req.url).pathname;
      if (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp") {
        const base = origin(req);
        return json({ resource: `${base}/mcp`, authorization_servers: [base], bearer_methods_supported: ["header"] });
      }
      if (path === "/.well-known/oauth-authorization-server") {
        const base = origin(req);
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
      }
      if (path === "/register" && req.method === "POST") return register(req);
      if (path === "/authorize" && (req.method === "GET" || req.method === "POST")) return authorize(req);
      if (path === "/token" && req.method === "POST") return token(req);
      return null;
    },

    /** True for the static token or a live OAuth access token. */
    authorized(req: Request) {
      const header = req.headers.get("authorization") ?? "";
      if (sameSecret(header, `Bearer ${opts.staticToken}`)) return true;
      const m = /^Bearer (\S+)$/.exec(header);
      const t = m && accessTokens.get(m[1]);
      return Boolean(t && t.expires > now());
    },

    /** 401 that points OAuth clients at the resource metadata, per the MCP spec. */
    challenge(req: Request) {
      return new Response("unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl(req)}"` },
      });
    },
  };
}
