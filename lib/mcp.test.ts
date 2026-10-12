import { describe, expect, it } from "vitest";
import { approvalFor, serverPrefix, toolKey } from "@/lib/mcp";
import { applyApprovalResponses } from "@/lib/chat-store";
import { normalizeEntry } from "@/lib/mcp-registry";
import { argsSkeleton } from "@/components/mcp/server-inspector";
import { parseHeaderLines } from "@/components/mcp/server-form";
import type { ChatUIMessage } from "@/lib/chat-messages";

describe("mcp tool naming", () => {
  it("namespaces tools with provider-safe names", () => {
    expect(toolKey("github", "create_issue")).toBe("github__create_issue");
    expect(toolKey("my srv", "a.b/c")).toBe("my_srv__a_b_c");
    expect(toolKey("x", "y".repeat(100))).toHaveLength(64);
  });

  it("gives servers unique prefixes", () => {
    const taken = new Set<string>();
    expect(serverPrefix("GitHub Tools!", taken)).toBe("github_tools");
    expect(serverPrefix("GitHub tools", taken)).toBe("github_tools2");
    expect(serverPrefix("***", taken)).toBe("mcp");
  });
});

describe("approval policy", () => {
  it("asks unless read-only, always, or never", () => {
    expect(approvalFor("readonly", true, "S")).toBe("not-applicable");
    expect(approvalFor("readonly", undefined, "S")).toMatchObject({ type: "user-approval" });
    expect(approvalFor("always", true, "S")).toMatchObject({ type: "user-approval" });
    expect(approvalFor("never", false, "S")).toBe("not-applicable");
  });

  it("takes only approval decisions from the client, matched by approval id", () => {
    const stored: ChatUIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "dynamic-tool", toolName: "s__del", toolCallId: "c1", state: "approval-requested", input: { t: 1 }, approval: { id: "ap1", signature: "sig" } },
        { type: "text", text: "server text" },
      ],
    };
    const incoming: ChatUIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "dynamic-tool", toolName: "s__del", toolCallId: "c1", state: "approval-responded", input: { t: 999 }, approval: { id: "ap1", approved: true } },
        { type: "text", text: "client tampered" },
      ],
    };
    const merged = applyApprovalResponses(stored, incoming);
    expect(merged.parts[0]).toMatchObject({ state: "approval-responded", input: { t: 1 }, approval: { id: "ap1", approved: true, signature: "sig" } });
    expect(merged.parts[1]).toEqual({ type: "text", text: "server text" });

    const forged = applyApprovalResponses(stored, {
      ...incoming,
      parts: [{ ...incoming.parts[0], approval: { id: "other", approved: true } } as ChatUIMessage["parts"][number]],
    });
    expect(forged.parts[0]).toMatchObject({ state: "approval-requested" });
  });
});

describe("registry + inspector helpers", () => {
  it("keeps only usable remote endpoints", () => {
    const e = normalizeEntry({
      server: {
        name: "io.x/srv",
        remotes: [
          { type: "streamable-http", url: "https://a/mcp", headers: [{ name: "Authorization", isRequired: true, isSecret: true }] },
          { type: "streamable-http", url: "https://{tenant}.b/mcp" },
          { type: "sse", url: "https://c/sse" },
        ],
        packages: [{}],
      },
    });
    expect(e.title).toBe("srv");
    expect(e.hasLocalPackages).toBe(true);
    expect(e.remotes).toEqual([
      { transport: "http", url: "https://a/mcp", headers: [{ name: "Authorization", required: true, secret: true, description: undefined }] },
      { transport: "sse", url: "https://c/sse", headers: [] },
    ]);
  });

  it("builds argument skeletons and parses header lines", () => {
    expect(JSON.parse(argsSkeleton({ properties: { a: { type: "number" }, q: { type: "string" }, f: { type: "boolean" } } }))).toEqual({ a: 0, q: "", f: false });
    expect(parseHeaderLines("Authorization: Bearer a:b\n\nX-Key: 1\nbad")).toEqual({ Authorization: "Bearer a:b", "X-Key": "1" });
  });
});
