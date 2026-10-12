import { describe, expect, it } from "vitest";
import { webhookBody, webhookHost } from "@/lib/notify";
import { webhookColumn } from "@/lib/schedules";
import { encrypt } from "@/lib/encryption";

process.env.ENCRYPTION_KEY ??= "test-key-that-is-at-least-32-characters-long";

const run = { scheduleName: "Daily", status: "error" as const, error: "boom", finishedAt: "2026-01-01T00:00:00Z", chatUrl: "https://app/chat?id=1" };

describe("schedule notifications", () => {
  it("formats Slack, Discord and generic webhooks", () => {
    expect(webhookBody("https://hooks.slack.com/services/x", run)).toEqual({
      text: '❌ Scheduled run "Daily" failed\n\nError: boom\n\nhttps://app/chat?id=1',
    });
    expect(webhookBody("https://discord.com/api/webhooks/1/x", { ...run, status: "ok", error: undefined, summary: "All good" })).toEqual({
      content: '✅ Scheduled run "Daily" finished\n\nAll good\n\nhttps://app/chat?id=1',
    });
    expect(webhookBody("https://example.com/hook", run)).toEqual({ event: "schedule.run", ...run });
  });

  it("stores webhook URLs encrypted and validates them", async () => {
    expect(await webhookColumn(undefined)).toEqual({});
    expect(await webhookColumn(null)).toEqual({ notifyWebhook: null });
    const saved = await webhookColumn("https://8.8.8.8/hook");
    expect("notifyWebhook" in saved && saved.notifyWebhook?.startsWith("v1:")).toBe(true);
    expect(webhookHost(encrypt("https://hooks.slack.com/services/x"))).toBe("hooks.slack.com");
    process.env.ALLOW_PRIVATE_PROVIDER_URLS = "false";
    expect(await webhookColumn("https://169.254.169.254/latest")).toMatchObject({ error: expect.stringMatching(/private/) });
    delete process.env.ALLOW_PRIVATE_PROVIDER_URLS;
  });
});
