import { describe, expect, it } from "vitest";
import { splitModel } from "@/components/chat/chat-conversation";
import { toDisplayMessage, textOf, type ChatUIMessage } from "@/lib/chat-messages";
import { rowToUIMessage } from "@/lib/chat-store";
import { openAICompatibleBase } from "@/lib/models";

describe("chat", () => {
  it("splits provider from model ids that contain colons", () => {
    expect(splitModel("ollama:llama3:8b")).toEqual(["ollama", "llama3:8b"]);
    expect(splitModel("openai:gpt-x")).toEqual(["openai", "gpt-x"]);
  });

  it("converts legacy rows (no parts) into UI messages", () => {
    const m = rowToUIMessage({
      id: "m1", chatId: "c", role: "assistant", content: "hi", reasoning: "think",
      provider: "openai", modelId: "x", toolCalls: null, toolResults: null,
      tokensIn: 3, tokensOut: 4, parts: null, metadata: null, createdAt: new Date(0),
      attachments: [{ id: "a", messageId: "m1", name: "p.png", mime: "image/png", size: 1, url: "/uploads/p.png", createdAt: new Date(0) }],
    });
    expect(m.parts.map((p) => p.type)).toEqual(["reasoning", "file", "text"]);
    expect(textOf(m)).toBe("hi");
    expect(m.metadata).toMatchObject({ provider: "openai", inputTokens: 3, outputTokens: 4 });
  });

  it("maps UI messages to the display shape", () => {
    const ui: ChatUIMessage = {
      id: "m2", role: "assistant",
      parts: [
        { type: "reasoning", text: "r" },
        { type: "text", text: "a" },
        { type: "text", text: "b" },
        { type: "dynamic-tool", toolName: "search", toolCallId: "t1", state: "output-available", input: { q: 1 }, output: "ok" },
      ],
      metadata: { inputTokens: 1, outputTokens: 2, createdAt: 0 },
    };
    const d = toDisplayMessage(ui, "c");
    expect(d).toMatchObject({ content: "ab", reasoning: "r", tokensIn: 1, tokensOut: 2 });
    expect(d.toolCalls).toEqual([{ toolName: "search", state: "output-available", input: { q: 1 }, output: "ok", error: undefined, approval: undefined }]);
  });

  it("derives OpenAI-compatible base URLs", () => {
    expect(openAICompatibleBase("ollama", "http://localhost:11434")).toBe("http://localhost:11434/v1");
    expect(openAICompatibleBase("lmstudio", "http://h:1234/")).toBe("http://h:1234/v1");
    expect(openAICompatibleBase("groq", "https://api.groq.com/openai/v1")).toBe("https://api.groq.com/openai/v1");
    expect(openAICompatibleBase("cohere", "https://api.cohere.ai/v1")).toBe("https://api.cohere.ai/compatibility/v1");
  });
});
