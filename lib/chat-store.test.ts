import { describe, expect, it } from "vitest";
import { hasContent } from "./chat-store";
import type { ChatUIMessage } from "./chat-messages";

const reply = (parts: ChatUIMessage["parts"]): ChatUIMessage => ({ id: "r", role: "assistant", parts });

describe("hasContent", () => {
  it("is false for a reply from a failed model call", () => {
    expect(hasContent(reply([]))).toBe(false);
    expect(hasContent(reply([{ type: "step-start" }]))).toBe(false);
    expect(hasContent(reply([{ type: "step-start" }, { type: "text", text: "  " }]))).toBe(false);
  });

  it("is true for text, reasoning or other parts", () => {
    expect(hasContent(reply([{ type: "text", text: "Hi" }]))).toBe(true);
    expect(hasContent(reply([{ type: "reasoning", text: "thinking" }]))).toBe(true);
    expect(hasContent(reply([{ type: "file", mediaType: "image/png", url: "/uploads/a.png" }]))).toBe(true);
  });
});
