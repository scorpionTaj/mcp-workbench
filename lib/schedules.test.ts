import { describe, expect, it } from "vitest";
import { planSchedule } from "@/lib/schedules";
import { newShareId, publicMessages } from "@/lib/chat-share";
import type { ChatUIMessage } from "@/lib/chat-messages";

describe("planSchedule", () => {
  const from = new Date("2026-10-12T06:00:00Z"); // a Monday

  it("finds the next run in the schedule's time zone", () => {
    const plan = planSchedule("0 9 * * 1-5", "Europe/Paris", from);
    expect("next" in plan && plan.next.toISOString()).toBe("2026-10-12T07:00:00.000Z");
    const ny = planSchedule("0 9 * * 1-5", "America/New_York", from);
    expect("next" in ny && ny.next.toISOString()).toBe("2026-10-12T13:00:00.000Z");
  });

  it("rejects bad input and runs closer than 15 minutes apart", () => {
    expect(planSchedule("* * * * *", "UTC", from)).toEqual({ error: "Runs must be at least 15 minutes apart" });
    expect(planSchedule("*/10 * * * *", "UTC", from)).toHaveProperty("error");
    expect("next" in planSchedule("*/15 * * * *", "UTC", from)).toBe(true);
    expect(planSchedule("0 9 * *", "UTC", from)).toHaveProperty("error");
    expect(planSchedule("0 99 * * *", "UTC", from)).toHaveProperty("error");
    expect(planSchedule("0 9 * * *", "Mars/Olympus", from)).toEqual({ error: "Unknown time zone: Mars/Olympus" });
  });
});

describe("shared chats", () => {
  it("makes unguessable URL-safe tokens", () => {
    const id = newShareId();
    expect(id).toMatch(/^[\w-]{24}$/);
    expect(newShareId()).not.toBe(id);
  });

  it("hides private files, system messages and usage details", () => {
    const messages: ChatUIMessage[] = [
      { id: "s", role: "system", parts: [{ type: "text", text: "secret instructions" }] },
      {
        id: "u",
        role: "user",
        parts: [
          { type: "file", mediaType: "image/png", filename: "photo.png", url: "/uploads/abc_1-x.png" },
          { type: "text", text: "What is this?" },
        ],
        metadata: { createdAt: 1, inputTokens: 5 },
      },
      {
        id: "a",
        role: "assistant",
        parts: [{ type: "text", text: "A cat." }],
        metadata: { provider: "openai", modelId: "gpt-5", outputTokens: 9, mcpErrors: ["internal-server"] },
      },
    ];
    const out = publicMessages(messages);
    expect(out.map((m) => m.id)).toEqual(["u", "a"]);
    expect(out[0].parts[0]).toEqual({ type: "text", text: expect.stringContaining("photo.png (not included") });
    expect(JSON.stringify(out)).not.toContain("/uploads/");
    expect(out[1].metadata).toEqual({ provider: "openai", modelId: "gpt-5", createdAt: undefined });
  });
});
