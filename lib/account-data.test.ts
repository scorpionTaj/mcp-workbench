import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  db: {},
  deleteUpload: vi.fn(),
  readUpload: vi.fn(),
  isOwnUpload: vi.fn(),
  uploadName: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: h.db, schema: {} }));
vi.mock("@/lib/storage", () => ({ deleteUpload: h.deleteUpload, readUpload: h.readUpload }));
vi.mock("@/lib/uploads", () => ({
  isOwnUpload: h.isOwnUpload,
  uploadName: h.uploadName,
  MIME_BY_EXT: { pdf: "application/pdf" },
}));

const { exportApiKey, exportMcpServer, exportProviderConfig, exportSchedule } = await import("@/lib/account-data");

describe("account export secret redaction", () => {
  it("removes API key hashes, provider credentials, MCP credentials, and notification webhooks", () => {
    expect(exportApiKey({ id: "key_1", name: "automation", hash: "sha256:secret" })).toEqual({
      id: "key_1",
      name: "automation",
    });
    expect(exportProviderConfig({ id: "openai", apiKey: "encrypted-secret", config: "private-config", enabled: true })).toEqual({
      id: "openai",
      enabled: true,
      hasApiKey: true,
      hasCustomConfig: true,
    });
    expect(exportMcpServer({ id: "mcp_1", headers: "Bearer secret", oauth: "refresh-token", name: "private server" })).toEqual({
      id: "mcp_1",
      name: "private server",
      hasHeaders: true,
      hasOAuth: true,
    });
    expect(exportSchedule({ id: "schedule_1", notifyWebhook: "https://secret.example/hook", enabled: true })).toEqual({
      id: "schedule_1",
      enabled: true,
      webhookConfigured: true,
    });
  });
});
