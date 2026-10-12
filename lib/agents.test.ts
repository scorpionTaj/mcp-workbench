import { describe, expect, it } from "vitest";
import { agentInputSchema, composeSystemPrompt } from "@/lib/agents";

describe("agents", () => {
  it("puts agent instructions before the chat's own prompt", () => {
    expect(composeSystemPrompt("Be a reviewer.", "Focus on SQL.")).toBe("Be a reviewer.\n\nFocus on SQL.");
    expect(composeSystemPrompt(" ", null)).toBeUndefined();
    expect(composeSystemPrompt(undefined, "Only chat")).toBe("Only chat");
  });

  it("validates and defaults agent input", () => {
    const a = agentInputSchema.parse({ name: " Bot ", systemPrompt: "x" });
    expect(a).toMatchObject({ name: "Bot", category: "general", maxSteps: 8, toolServerIds: [], starterPrompts: [], isPublic: false });
    expect(agentInputSchema.safeParse({ name: "a", systemPrompt: "x", maxSteps: 500 }).success).toBe(false);
    expect(agentInputSchema.safeParse({ name: "", systemPrompt: "x" }).success).toBe(false);
  });
});
