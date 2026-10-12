import { describe, expect, it } from "vitest";
import { encrypt } from "@/lib/encryption";
import { readOAuthState, serverIdFromState, stateMatches } from "@/lib/mcp-oauth";

process.env.ENCRYPTION_KEY ??= "test-key-that-is-at-least-32-characters-long";

describe("MCP OAuth state", () => {
  it("reads the encrypted state and tolerates missing or unreadable values", () => {
    const st = { tokens: { access_token: "a", token_type: "Bearer" }, state: "srv.abc" };
    expect(readOAuthState({ oauth: encrypt(JSON.stringify(st)) })).toEqual(st);
    expect(readOAuthState({ oauth: null })).toEqual({});
    expect(readOAuthState({ oauth: "v1:garbage" })).toEqual({});
  });

  it("matches callback state exactly", () => {
    expect(serverIdFromState("srv123.random")).toBe("srv123");
    expect(serverIdFromState("")).toBeNull();
    expect(stateMatches("srv.abc", "srv.abc")).toBe(true);
    expect(stateMatches("srv.abc", "srv.abd")).toBe(false);
    expect(stateMatches("srv.abc", "srv.ab")).toBe(false);
    expect(stateMatches(undefined, "srv.abc")).toBe(false);
  });
});
