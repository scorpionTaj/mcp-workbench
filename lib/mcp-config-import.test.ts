import { describe, expect, it } from "vitest";
import { parseMcpConfig } from "./mcp-config-import";

describe("parseMcpConfig", () => {
  it("imports remote servers and skips stdio ones", () => {
    const { servers, skipped } = parseMcpConfig(
      JSON.stringify({
        mcpServers: {
          github: { url: "https://api.githubcopilot.com/mcp/", headers: { Authorization: "Bearer x", n: 1 } },
          legacy: { type: "sse", url: "https://example.com/events" },
          auto: { url: "https://example.com/sse" },
          files: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
          bad: { url: "file:///etc/passwd" },
        },
      }),
    );
    expect(servers).toEqual([
      { name: "github", url: "https://api.githubcopilot.com/mcp/", transport: "http", headers: { Authorization: "Bearer x" } },
      { name: "legacy", url: "https://example.com/events", transport: "sse", headers: {} },
      { name: "auto", url: "https://example.com/sse", transport: "sse", headers: {} },
    ]);
    expect(skipped.map((s) => s.name)).toEqual(["files", "bad"]);
    expect(skipped[0].reason).toMatch(/stdio/);
  });

  it("accepts VS Code's servers key and a bare map", () => {
    expect(parseMcpConfig('{"servers":{"a":{"url":"https://a.dev/mcp"}}}').servers).toHaveLength(1);
    expect(parseMcpConfig('{"a":{"url":"https://a.dev/mcp"}}').servers).toHaveLength(1);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseMcpConfig("{nope")).toThrow(/valid JSON/);
  });
});
