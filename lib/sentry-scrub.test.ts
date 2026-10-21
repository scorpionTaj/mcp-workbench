import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

describe("scrubSentryEvent", () => {
  it("removes error messages, request details, breadcrumbs, and local variables", () => {
    const event = {
      message: "chat text and sk-live-secret",
      request: {
        url: "/api/chat?key=sk-live-secret",
        headers: { authorization: "Bearer sk-live-secret" },
        data: { messages: [{ content: "private conversation" }] },
      },
      user: { id: "user-1" },
      extra: { apiKey: "sk-live-secret" },
      contexts: { chat: { content: "private conversation" } },
      breadcrumbs: [{ message: "private conversation" }],
      tags: { apiKey: "sk-live-secret" },
      threads: {
        values: [
          {
            stacktrace: {
              frames: [{ vars: { prompt: "private conversation" } }],
            },
          },
        ],
      },
      spans: [{ description: "private conversation" }],
      exception: {
        values: [
          {
            type: "ProviderError",
            value: "sk-live-secret: private conversation",
            stacktrace: {
              frames: [
                {
                  filename: "app/api/chat/route.ts?token=sk-live-secret",
                  module_metadata: { code: "private conversation" },
                  vars: {
                    prompt: "private conversation",
                    apiKey: "sk-live-secret",
                  },
                  context_line: "const secret = 'sk-live-secret'",
                },
              ],
            },
          },
        ],
      },
    };

    const scrubbed = scrubSentryEvent(event);
    const serialized = JSON.stringify(scrubbed);

    expect(serialized).not.toContain("private conversation");
    expect(serialized).not.toContain("sk-live-secret");
    expect(scrubbed.exception.values[0]).toMatchObject({
      type: "Error",
      value: "Error",
    });
    expect(scrubbed.exception.values[0].stacktrace.frames[0]).toMatchObject({
      filename: "app/api/chat/route.ts",
    });
    expect(scrubbed).not.toHaveProperty("threads");
    expect(scrubbed).not.toHaveProperty("spans");
  });
});
