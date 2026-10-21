import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText, streamText } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";

// A fake db: the user's provider row, today's server-key spend, and recorded usage rows.
const h = vi.hoisted(() => {
  const state = {
    provider: undefined as undefined | { apiKey: string | null; baseUrl: string | null; enabled: boolean },
    spent: null as string | null,
    selects: 0,
    inserts: [] as Record<string, unknown>[],
  };
  const db = {
    query: { providerConfigs: { findFirst: async () => state.provider } },
    select: () => ({
      from: () => ({
        where: async () => {
          state.selects++;
          return [{ total: state.spent }];
        },
      }),
    }),
    insert: () => ({ values: async (v: Record<string, unknown>) => void state.inserts.push(v) }),
  };
  return { state, db };
});

vi.mock("@/lib/db", async () => ({ db: h.db, schema: await import("@/lib/schema") }));

const { capProblem, dailyLimitUsd, freeDailyLimitUsd, mayUseServerKeys, serverKey, serverKeysMode, trackServerKeyUsage } = await import(
  "@/lib/server-keys"
);
const { resolveProviderAccess } = await import("@/lib/models");

const openai = { apiKeyEnvVar: "OPENAI_API_KEY" };
const user = { id: "u1", role: "user" };
const admin = { id: "a1", role: "admin" };

beforeEach(() => {
  h.state.provider = { apiKey: null, baseUrl: null, enabled: true };
  h.state.spent = null;
  h.state.selects = 0;
  h.state.inserts = [];
  vi.stubEnv("OPENAI_API_KEY", "sk-server");
  vi.stubEnv("SERVER_KEYS", "");
  vi.stubEnv("SERVER_KEYS_DAILY_LIMIT_USD", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("SERVER_KEYS", () => {
  it("defaults to all, and fails closed on unknown values", () => {
    expect(serverKeysMode({})).toBe("all");
    expect(serverKeysMode({ NODE_ENV: "production" })).toBe("admins");
    expect(serverKeysMode({ SERVER_KEYS: " Admins " })).toBe("admins");
    expect(serverKeysMode({ SERVER_KEYS: "off" })).toBe("off");
    expect(serverKeysMode({ SERVER_KEYS: "admin" })).toBe("off");
  });

  it("decides who may fall back per mode", () => {
    expect(mayUseServerKeys("user", { SERVER_KEYS: "all" })).toBe(true);
    expect(mayUseServerKeys("user", { SERVER_KEYS: "admins" })).toBe(false);
    expect(mayUseServerKeys("admin", { SERVER_KEYS: "admins" })).toBe(true);
    expect(mayUseServerKeys("admin", { SERVER_KEYS: "off" })).toBe(false);
    expect(mayUseServerKeys(undefined, { SERVER_KEYS: "admins" })).toBe(false);
  });

  it("returns the env key only when allowed and set", () => {
    const env = { OPENAI_API_KEY: "sk-server" };
    expect(serverKey(openai, "user", env)).toBe("sk-server");
    expect(serverKey(openai, "user", { ...env, SERVER_KEYS: "admins" })).toBeUndefined();
    expect(serverKey(openai, "user", {})).toBeUndefined();
    expect(serverKey({}, "admin", env)).toBeUndefined(); // local providers have no env key
  });
});

describe("daily cap", () => {
  it("parses the limit; unset is no cap and junk fails closed", () => {
    expect(dailyLimitUsd({})).toBeNull();
    expect(dailyLimitUsd({ SERVER_KEYS_DAILY_LIMIT_USD: "2.5" })).toBe(2.5);
    expect(dailyLimitUsd({ SERVER_KEYS_DAILY_LIMIT_USD: "five" })).toBe(0);
    expect(dailyLimitUsd({ SERVER_KEYS_DAILY_LIMIT_USD: "-1" })).toBe(0);
  });

  it("uses a separate free allowance and fails closed for production when no cap is configured", () => {
    expect(freeDailyLimitUsd({ SERVER_KEYS_DAILY_LIMIT_USD: "5", SERVER_KEYS_FREE_DAILY_LIMIT_USD: "1" })).toBe(1);
    expect(freeDailyLimitUsd({ SERVER_KEYS_DAILY_LIMIT_USD: "5" })).toBe(5);
    expect(freeDailyLimitUsd({ SERVER_KEYS_FREE_DAILY_LIMIT_USD: "bad" })).toBe(0);
    expect(freeDailyLimitUsd({ NODE_ENV: "production" })).toBe(0);
    expect(freeDailyLimitUsd({})).toBeNull();
  });

  it("refuses once spend reaches the limit, pointing at /providers", () => {
    const at = (spentUsd: number, limitUsd: number | null, role = "user") =>
      capProblem({ role, spentUsd, limitUsd, providerName: "OpenAI" });
    expect(at(0.99, 1)).toBeNull();
    expect(at(5, null)).toBeNull();
    expect(at(1, 1)).toMatch(/\$1\.00 allowance on the shared OpenAI key.*\/providers/);
    expect(at(0, 0)).not.toBeNull();
    expect(at(100, 1, "admin")).toBeNull();
  });
});

describe("resolveProviderAccess with server keys", () => {
  it("falls back to the env key by default", async () => {
    const access = await resolveProviderAccess(user, "openai");
    expect(access).toMatchObject({ apiKey: "sk-server", usesServerKey: true });
    expect(h.state.selects).toBe(0); // no cap, no spend query
  });

  it("keeps regular users off the env key with SERVER_KEYS=admins", async () => {
    vi.stubEnv("SERVER_KEYS", "admins");
    await expect(resolveProviderAccess(user, "openai")).rejects.toThrow(/Add an API key for OpenAI/);
    await expect(resolveProviderAccess(admin, "openai")).resolves.toMatchObject({ apiKey: "sk-server" });
  });

  it("never falls back with SERVER_KEYS=off", async () => {
    vi.stubEnv("SERVER_KEYS", "off");
    await expect(resolveProviderAccess(admin, "openai")).rejects.toThrow(/Add an API key for OpenAI/);
  });

  it("refuses the fallback over the daily cap, but not for admins", async () => {
    vi.stubEnv("SERVER_KEYS_DAILY_LIMIT_USD", "1");
    h.state.spent = "0.4";
    await expect(resolveProviderAccess(user, "openai")).resolves.toMatchObject({ usesServerKey: true });
    h.state.spent = "1.2";
    await expect(resolveProviderAccess(user, "openai")).rejects.toThrow(/allowance on the shared OpenAI key/);
    await expect(resolveProviderAccess(admin, "openai")).resolves.toMatchObject({ usesServerKey: true });
  });
});

describe("server-key usage tracking", () => {
  const usage = {
    inputTokens: { total: 1000, noCache: 1000, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 500, text: 500, reasoning: 0 },
  };
  const finishReason = { unified: "stop" as const, raw: "stop" };

  it("records each generate call at list price", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: "text", text: "hi" }], finishReason, usage, warnings: [] }),
    });
    await generateText({ model: trackServerKeyUsage(model, "u1", "openai", "gpt-4o"), prompt: "hello" });
    // gpt-4o: $2.50 in / $10 out per 1M tokens.
    expect(h.state.inserts).toEqual([
      { userId: "u1", provider: "openai", modelId: "gpt-4o", tokensIn: 1000, tokensOut: 500, costUsd: 0.0075 },
    ]);
  });

  it("records streamed calls when they finish", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "hi" },
            { type: "text-end", id: "t" },
            { type: "finish", finishReason, usage },
          ],
        }),
      }),
    });
    const result = streamText({ model: trackServerKeyUsage(model, "u1", "acme", "unknown-model"), prompt: "hello" });
    expect(await result.text).toBe("hi");
    // Unpriced models are recorded without a cost.
    expect(h.state.inserts).toEqual([
      { userId: "u1", provider: "acme", modelId: "unknown-model", tokensIn: 1000, tokensOut: 500, costUsd: null },
    ]);
  });
});
