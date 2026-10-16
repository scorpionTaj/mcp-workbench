import { describe, expect, it } from "vitest";
import { costUsd, formatCost, lookupPrice, normalizeModelId, resolvePrice } from "./pricing";

describe("normalizeModelId", () => {
  it("drops host prefixes, date and latest suffixes", () => {
    expect(normalizeModelId("claude-sonnet-4-5-20250929")).toBe("claude-sonnet-4-5");
    expect(normalizeModelId("gpt-4o-2024-08-06")).toBe("gpt-4o");
    expect(normalizeModelId("anthropic/claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(normalizeModelId("meta-llama/Llama-3.3-70B-Instruct-Turbo")).toBe("llama-3.3-70b-instruct-turbo");
    expect(normalizeModelId("mistral-large-latest")).toBe("mistral-large");
    expect(normalizeModelId("openai/gpt-4o-mini:free")).toBe("gpt-4o-mini");
  });
});

describe("lookupPrice", () => {
  it("finds first-party models, including dated and OpenRouter ids", () => {
    expect(lookupPrice("anthropic", "claude-opus-5-5")).toEqual({ input: 4, output: 20 });
    expect(lookupPrice("openai", "gpt-4o-mini-2024-07-18")).toEqual({ input: 0.15, output: 0.6 });
    expect(lookupPrice("openrouter", "google/gemini-2.5-flash")).toEqual({ input: 0.3, output: 2.5 });
    expect(lookupPrice("google", "gemini-1.5-pro-002")).toEqual({ input: 1.25, output: 5 });
  });

  it("prefers a host-specific price and keys hosted open models by provider", () => {
    expect(lookupPrice("groq", "llama-3.3-70b-versatile")).toEqual({ input: 0.59, output: 0.79 });
    expect(lookupPrice("together", "meta-llama/Llama-3.3-70B-Instruct-Turbo")).toEqual({ input: 0.88, output: 0.88 });
    expect(lookupPrice("openrouter", "llama-3.3-70b-versatile")).toBeNull();
  });

  it("does not guess a price for a different model that shares a prefix", () => {
    expect(lookupPrice("openai", "gpt-4o-audio-preview")).toBeNull();
    expect(lookupPrice("openai", "gpt-4o-mini-tts")).toBeNull();
    expect(lookupPrice("custom", "my-finetune")).toBeNull();
  });

  it("treats local and free models as costing nothing", () => {
    expect(lookupPrice("ollama", "llama3.2")).toEqual({ input: 0, output: 0 });
    expect(lookupPrice("lmstudio", "qwen2.5-7b")).toEqual({ input: 0, output: 0 });
    expect(lookupPrice("openrouter", "deepseek/deepseek-r1:free")).toEqual({ input: 0, output: 0 });
  });
});

describe("resolvePrice", () => {
  it("uses the override only when both prices are set", () => {
    expect(resolvePrice("openai", "gpt-4o", { inputPricePerM: 1, outputPricePerM: 2 })).toEqual({ input: 1, output: 2 });
    expect(resolvePrice("custom", "x", { inputPricePerM: 0, outputPricePerM: 0 })).toEqual({ input: 0, output: 0 });
    expect(resolvePrice("openai", "gpt-4o", { inputPricePerM: 1, outputPricePerM: null })).toEqual({ input: 2.5, output: 10 });
    expect(resolvePrice("custom", "x", null)).toBeNull();
  });
});

describe("costUsd", () => {
  it("prices input and output tokens per million", () => {
    expect(costUsd({ input: 3, output: 15 }, 1_000_000, 1_000_000)).toBe(18);
    expect(costUsd({ input: 3, output: 15 }, 1200, 350)).toBe(0.00885);
    expect(costUsd({ input: 0.1, output: 0.2 }, 1, 1)).toBe(0.0000003);
  });

  it("treats a missing side as zero tokens", () => {
    expect(costUsd({ input: 2, output: 8 }, 500_000, undefined)).toBe(1);
  });

  it("is null when the price or all usage is unknown", () => {
    expect(costUsd(null, 100, 100)).toBeNull();
    expect(costUsd({ input: 1, output: 1 }, undefined, null)).toBeNull();
  });
});

describe("formatCost", () => {
  it("shows a dash for unknown and keeps small amounts readable", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
    expect(formatCost(0)).toBe("$0.00");
    expect(formatCost(0.00004)).toBe("<$0.0001");
    expect(formatCost(0.00885)).toBe("$0.0089");
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(1234.567)).toBe("$1,234.57");
  });
});
