import { describe, expect, it } from "vitest";
import { chatSettingsSchema, savedChatSettings, withChatSettings } from "./chat-settings";

describe("chat settings", () => {
  const settings = { temperature: 0.3, topP: 0.8, maxOutputTokens: 1024 };

  it("round-trips through the chat's meta", () => {
    const meta = withChatSettings(null, settings);
    expect(savedChatSettings(meta)).toEqual(settings);
    expect(savedChatSettings(JSON.parse(meta))).toEqual(settings);
  });

  it("keeps other meta keys and replaces earlier settings", () => {
    const first = withChatSettings(JSON.stringify({ scheduleId: "s1" }), { temperature: 1 });
    const meta = JSON.parse(withChatSettings(first, settings));
    expect(meta).toEqual({ scheduleId: "s1", settings });
  });

  it("treats missing, malformed or invalid settings as none", () => {
    expect(savedChatSettings(null)).toBeNull();
    expect(savedChatSettings("not json")).toBeNull();
    expect(savedChatSettings(JSON.stringify({ scheduleId: "s1" }))).toBeNull();
    expect(savedChatSettings({ settings: { temperature: 5 } })).toBeNull();
    expect(JSON.parse(withChatSettings("[1,2]", settings))).toEqual({ settings });
  });

  it("rejects out-of-range values", () => {
    expect(chatSettingsSchema.safeParse({ topP: 1.5 }).success).toBe(false);
    expect(chatSettingsSchema.safeParse({ maxOutputTokens: 0 }).success).toBe(false);
    expect(chatSettingsSchema.safeParse({ presencePenalty: -2 }).success).toBe(true);
  });
});
