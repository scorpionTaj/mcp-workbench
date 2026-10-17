import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBridgeAuth, MAX_PAIRING_FAILURES, newPairingCode } from "./mcp-bridge-oauth";

const BASE = "http://127.0.0.1:8808";
const REDIRECT = "https://workbench.example/api/mcp/oauth/callback";
const VERIFIER = "v".repeat(50);
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

function setup() {
  let t = 1_000_000;
  const auth = createBridgeAuth({ staticToken: "static-secret", pairingCode: "ABCD234567", description: "npx server", now: () => t });
  const call = async (path: string, init?: RequestInit) => (await auth.handle(new Request(`${BASE}${path}`, init)))!;
  const form = (body: Record<string, string>) => ({
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  async function register() {
    const res = await call("/register", { method: "POST", body: JSON.stringify({ client_name: "MCP Workbench", redirect_uris: [REDIRECT] }) });
    return ((await res.json()) as { client_id: string }).client_id;
  }
  const authorizeParams = (clientId: string) => ({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "st-1",
  });
  async function approve(clientId: string, pairing = "abcd234567") {
    return call("/authorize", form({ ...authorizeParams(clientId), decision: "approve", pairing_code: pairing }));
  }
  const bearer = (token: string) => auth.authorized(new Request(`${BASE}/mcp`, { headers: { Authorization: `Bearer ${token}` } }));
  return { auth, call, form, register, authorizeParams, approve, bearer, advance: (ms: number) => (t += ms) };
}

describe("stdio bridge OAuth", () => {
  it("publishes resource and authorization server metadata, and challenges with it", async () => {
    const { auth, call } = setup();
    expect(await (await call("/.well-known/oauth-protected-resource/mcp")).json()).toMatchObject({
      resource: `${BASE}/mcp`,
      authorization_servers: [BASE],
    });
    const meta = await (await call("/.well-known/oauth-authorization-server")).json();
    expect(meta).toMatchObject({ token_endpoint: `${BASE}/token`, code_challenge_methods_supported: ["S256"] });
    const res = auth.challenge(new Request(`${BASE}/mcp`));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(`${BASE}/.well-known/oauth-protected-resource`);
    expect(await auth.handle(new Request(`${BASE}/mcp`))).toBeNull();
  });

  it("runs register → consent → code → tokens → refresh", async () => {
    const { call, form, register, authorizeParams, approve, bearer } = setup();
    const clientId = await register();

    const consent = await call(`/authorize?${new URLSearchParams(authorizeParams(clientId))}`);
    expect(consent.status).toBe(200);
    expect(consent.headers.get("x-frame-options")).toBe("DENY");
    expect(await consent.text()).toContain("MCP Workbench");

    const approved = await approve(clientId);
    expect(approved.status).toBe(302);
    const location = new URL(approved.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(REDIRECT);
    expect(location.searchParams.get("state")).toBe("st-1");
    const code = location.searchParams.get("code")!;

    const exchange = { grant_type: "authorization_code", code, client_id: clientId, redirect_uri: REDIRECT, code_verifier: VERIFIER };
    const tokens = (await (await call("/token", form(exchange))).json()) as { access_token: string; refresh_token: string };
    expect(bearer(tokens.access_token)).toBe(true);
    // Codes are single use.
    expect((await call("/token", form(exchange))).status).toBe(400);

    const refreshed = (await (
      await call("/token", form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId }))
    ).json()) as { access_token: string };
    expect(bearer(refreshed.access_token)).toBe(true);
    // Refresh tokens rotate.
    const again = await call("/token", form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId }));
    expect(again.status).toBe(400);
  });

  it("rejects a wrong PKCE verifier and expired access tokens", async () => {
    const { call, form, register, approve, bearer, advance } = setup();
    const clientId = await register();
    const code = new URL((await approve(clientId)).headers.get("location")!).searchParams.get("code")!;
    const bad = await call("/token", form({ grant_type: "authorization_code", code, client_id: clientId, redirect_uri: REDIRECT, code_verifier: "x".repeat(50) }));
    expect(((await bad.json()) as { error: string }).error).toBe("invalid_grant");

    const code2 = new URL((await approve(clientId)).headers.get("location")!).searchParams.get("code")!;
    const ok = await call("/token", form({ grant_type: "authorization_code", code: code2, client_id: clientId, redirect_uri: REDIRECT, code_verifier: VERIFIER }));
    const { access_token } = (await ok.json()) as { access_token: string };
    advance(60 * 60_000 + 1);
    expect(bearer(access_token)).toBe(false);
  });

  it("needs the pairing code, and stops approving after too many wrong ones", async () => {
    const { call, form, register, authorizeParams, approve } = setup();
    const clientId = await register();
    const wrong = await approve(clientId, "WRONGCODE1");
    expect(wrong.status).toBe(400);
    expect(await wrong.text()).toContain("doesn&#39;t match");

    for (let i = 1; i < MAX_PAIRING_FAILURES; i++) await approve(clientId, "WRONGCODE1");
    const locked = await approve(clientId);
    expect(locked.status).toBe(400);
    expect(await locked.text()).toContain("Restart the bridge");

    // Denying still returns to the client.
    const denied = await call("/authorize", form({ ...authorizeParams(clientId), decision: "deny" }));
    expect(new URL(denied.headers.get("location")!).searchParams.get("error")).toBe("access_denied");
  });

  it("refuses unregistered clients, redirect URIs and missing PKCE", async () => {
    const { call, register, authorizeParams } = setup();
    expect((await call(`/authorize?${new URLSearchParams(authorizeParams("nope"))}`)).status).toBe(400);
    const clientId = await register();
    const other = { ...authorizeParams(clientId), redirect_uri: "https://evil.example/cb" };
    expect((await call(`/authorize?${new URLSearchParams(other)}`)).status).toBe(400);
    const plain = { ...authorizeParams(clientId), code_challenge_method: "plain" };
    expect((await call(`/authorize?${new URLSearchParams(plain)}`)).status).toBe(400);
    const badReg = await call("/register", { method: "POST", body: JSON.stringify({ redirect_uris: ["http://evil.example/cb"] }) });
    expect(badReg.status).toBe(400);
  });

  it("still accepts the static token", () => {
    const { bearer } = setup();
    expect(bearer("static-secret")).toBe(true);
    expect(bearer("static-secreT")).toBe(false);
  });

  it("makes readable pairing codes", () => {
    expect(newPairingCode()).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });
});
