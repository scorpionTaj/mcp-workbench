// The operator's server-wide provider keys (OPENAI_API_KEY etc., see apiKeyEnvVar): who may fall
// back to them (SERVER_KEYS) and an optional per-user daily spend cap (SERVER_KEYS_DAILY_LIMIT_USD).
import { wrapLanguageModel, type LanguageModel } from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { costUsd, formatCost, lookupPrice } from "@/lib/pricing";
import type { LLMProviderConfig } from "@/lib/types";
import logger from "@/lib/logger";

export type ServerKeysMode = "all" | "admins" | "off";

/** Who a model call is for. Requests made with a personal API key carry role "user" (lib/api.ts). */
export interface KeyUser {
  id: string;
  role?: string | null;
}

type Env = Record<string, string | undefined>;

/** SERVER_KEYS: unset means "all" (self-hosting default); an unknown value fails closed. */
export function serverKeysMode(env: Env = process.env): ServerKeysMode {
  const v = env.SERVER_KEYS?.trim().toLowerCase();
  if (!v || v === "all") return "all";
  return v === "admins" ? "admins" : "off";
}

export function mayUseServerKeys(role: string | null | undefined, env: Env = process.env): boolean {
  const mode = serverKeysMode(env);
  return mode === "all" || (mode === "admins" && role === "admin");
}

/** The operator's env key for a provider, when this user may fall back to it. */
export function serverKey(
  config: Pick<LLMProviderConfig, "apiKeyEnvVar">,
  role: string | null | undefined,
  env: Env = process.env,
): string | undefined {
  if (!config.apiKeyEnvVar || !mayUseServerKeys(role, env)) return undefined;
  return env[config.apiKeyEnvVar] || undefined;
}

/** USD per user per day, or null for no cap. A value that isn't a number fails closed (0). */
export function dailyLimitUsd(env: Env = process.env): number | null {
  const raw = env.SERVER_KEYS_DAILY_LIMIT_USD?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Why the daily cap refuses another server-key call, or null. Admins are exempt. */
export function capProblem({
  role,
  spentUsd,
  limitUsd,
  providerName,
}: {
  role: string | null | undefined;
  spentUsd: number;
  limitUsd: number | null;
  providerName: string;
}): string | null {
  if (limitUsd == null || role === "admin" || spentUsd < limitUsd) return null;
  return (
    `You've used today's ${formatCost(limitUsd)} allowance on the shared ${providerName} key. ` +
    `Add your own API key on the Providers page (/providers) to keep going, or try again tomorrow.`
  );
}

/** List-price spend on server keys since the start of today (database time zone). */
export async function serverKeySpendToday(userId: string): Promise<number> {
  const u = schema.serverKeyUsage;
  const [row] = await db
    .select({ total: sql<string | null>`sum(${u.costUsd})` })
    .from(u)
    .where(and(eq(u.userId, userId), gte(u.createdAt, sql`date_trunc('day', localtimestamp)`)));
  return Number(row?.total ?? 0);
}

/** Run before each server-key call: the refusal message once the daily cap is reached, else null. */
export async function checkServerKeyBudget(user: KeyUser, providerName: string): Promise<string | null> {
  const limitUsd = dailyLimitUsd();
  if (limitUsd == null || user.role === "admin") return null;
  return capProblem({ role: user.role, spentUsd: await serverKeySpendToday(user.id), limitUsd, providerName });
}

/**
 * Records one server-key model call. Priced from the built-in table, not the user's override on
 * the Models page, so a user can't zero out their own spend. Never throws.
 */
export async function recordServerKeyUsage(
  userId: string,
  provider: string,
  modelId: string,
  tokensIn: number | undefined,
  tokensOut: number | undefined,
) {
  try {
    await db.insert(schema.serverKeyUsage).values({
      userId,
      provider,
      modelId,
      tokensIn: tokensIn ?? null,
      tokensOut: tokensOut ?? null,
      costUsd: costUsd(lookupPrice(provider, modelId), tokensIn, tokensOut),
    });
  } catch (err) {
    logger.error({ err, provider, modelId }, "Could not record server key usage");
  }
}

type Usage = { inputTokens: { total?: number }; outputTokens: { total?: number } };

/** Wraps a model so each call (each step of a tool loop) is recorded with recordServerKeyUsage. */
export function trackServerKeyUsage(model: LanguageModel, userId: string, provider: string, modelId: string): LanguageModel {
  if (typeof model === "string") return model;
  const record = (u: Usage) => recordServerKeyUsage(userId, provider, modelId, u.inputTokens.total, u.outputTokens.total);
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        await record(result.usage);
        return result;
      },
      wrapStream: async ({ doStream }) => {
        const { stream, ...rest } = await doStream();
        return {
          ...rest,
          stream: stream.pipeThrough(
            new TransformStream({
              async transform(part, controller) {
                if (part.type === "finish") await record(part.usage);
                controller.enqueue(part);
              },
            }),
          ),
        };
      },
    },
  });
}
