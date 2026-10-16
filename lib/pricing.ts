// Model prices and cost math. Shared by client and server; no DB imports here.

/** USD per 1M tokens. */
export interface ModelPrice {
  input: number;
  output: number;
}

const p = (input: number, output: number): ModelPrice => ({ input, output });

/**
 * List prices (USD per 1M input/output tokens) for common models, checked October 2026.
 * Keys are normalized model ids (see normalizeModelId); "provider:model" keys win over bare ones,
 * for hosts whose price differs from the vendor's. Long-context and cached-input tiers are ignored.
 * Users can set their own price for any model on the Models page.
 */
export const PRICES: Record<string, ModelPrice> = {
  // Anthropic
  "claude-fable-5-1": p(10, 50),
  "claude-fable-5": p(10, 50),
  "claude-opus-5-5": p(4, 20),
  "claude-opus-5": p(5, 25),
  "claude-opus-4-8": p(5, 25),
  "claude-opus-4-7": p(5, 25),
  "claude-opus-4-6": p(5, 25),
  "claude-opus-4-5": p(5, 25),
  "claude-opus-4-1": p(15, 75),
  "claude-opus-4": p(15, 75),
  "claude-sonnet-5-5": p(2, 10),
  "claude-sonnet-5": p(2, 10),
  "claude-sonnet-4-6": p(3, 15),
  "claude-sonnet-4-5": p(3, 15),
  "claude-sonnet-4": p(3, 15),
  "claude-3-7-sonnet": p(3, 15),
  "claude-3-5-sonnet": p(3, 15),
  "claude-haiku-5-5": p(0.1, 0.5),
  "claude-haiku-4-5": p(1, 5),
  "claude-3-5-haiku": p(0.8, 4),
  "claude-3-haiku": p(0.25, 1.25),
  // OpenAI
  "gpt-5": p(1.25, 10),
  "gpt-5-mini": p(0.25, 2),
  "gpt-5-nano": p(0.05, 0.4),
  "gpt-4.1": p(2, 8),
  "gpt-4.1-mini": p(0.4, 1.6),
  "gpt-4.1-nano": p(0.1, 0.4),
  "gpt-4o": p(2.5, 10),
  "gpt-4o-mini": p(0.15, 0.6),
  "gpt-4-turbo": p(10, 30),
  "gpt-3.5-turbo": p(0.5, 1.5),
  o1: p(15, 60),
  o3: p(2, 8),
  "o3-mini": p(1.1, 4.4),
  "o4-mini": p(1.1, 4.4),
  // Google
  "gemini-2.5-pro": p(1.25, 10),
  "gemini-2.5-flash": p(0.3, 2.5),
  "gemini-2.5-flash-lite": p(0.1, 0.4),
  "gemini-2.0-flash": p(0.1, 0.4),
  "gemini-2.0-flash-lite": p(0.075, 0.3),
  "gemini-1.5-pro": p(1.25, 5),
  "gemini-1.5-flash": p(0.075, 0.3),
  // Mistral
  "mistral-large": p(2, 6),
  "mistral-medium": p(0.4, 2),
  "mistral-small": p(0.1, 0.3),
  codestral: p(0.3, 0.9),
  "open-mistral-nemo": p(0.15, 0.15),
  "ministral-8b": p(0.1, 0.1),
  "ministral-3b": p(0.04, 0.04),
  // Cohere
  "command-a": p(2.5, 10),
  "command-r-plus": p(2.5, 10),
  "command-r": p(0.15, 0.6),
  "command-r7b": p(0.0375, 0.15),
  // Groq
  "groq:llama-3.3-70b-versatile": p(0.59, 0.79),
  "groq:llama-3.1-8b-instant": p(0.05, 0.08),
  // Together AI
  "together:llama-3.3-70b-instruct-turbo": p(0.88, 0.88),
  "together:meta-llama-3.1-8b-instruct-turbo": p(0.18, 0.18),
};

/** Models on these run on the user's own machine, so they cost nothing per token. */
const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

/**
 * Lowercase, drop a host prefix ("anthropic/claude-…" on OpenRouter, "meta-llama/…" on Together),
 * and drop date or "latest" suffixes ("-20250929", "-2024-08-06", "-latest").
 */
export function normalizeModelId(modelId: string): string {
  return modelId
    .toLowerCase()
    .replace(/^.*\//, "")
    .replace(/:.*$/, "") // OpenRouter variants such as ":free"
    .replace(/-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4}|latest)$/, "");
}

/** The list price for a model, or null when it isn't in the table. */
export function lookupPrice(provider: string, modelId: string): ModelPrice | null {
  if (LOCAL_PROVIDERS.has(provider)) return p(0, 0);
  const id = normalizeModelId(modelId);
  if (/:free$/i.test(modelId)) return p(0, 0);
  const exact = PRICES[`${provider}:${id}`] ?? PRICES[id];
  if (exact) return exact;
  // A versioned id the table doesn't list exactly ("gpt-4o-audio-preview" is not "gpt-4o"; but
  // "claude-sonnet-4-5-thinking" is): only fall back for suffixes that don't change the model.
  const base = id.replace(/-(thinking|preview|exp|experimental|\d{3})$/, "");
  return base !== id ? (PRICES[`${provider}:${base}`] ?? PRICES[base] ?? null) : null;
}

/** A user's per-model override, when both prices are set; otherwise the list price. */
export function resolvePrice(
  provider: string,
  modelId: string,
  override?: { inputPricePerM: number | null; outputPricePerM: number | null } | null,
): ModelPrice | null {
  if (override?.inputPricePerM != null && override.outputPricePerM != null) {
    return p(override.inputPricePerM, override.outputPricePerM);
  }
  return lookupPrice(provider, modelId);
}

/** USD for one reply. Null when the price is unknown or no usage was reported. */
export function costUsd(price: ModelPrice | null, inputTokens?: number | null, outputTokens?: number | null): number | null {
  if (!price || (inputTokens == null && outputTokens == null)) return null;
  const usd = ((inputTokens ?? 0) * price.input + (outputTokens ?? 0) * price.output) / 1_000_000;
  // Round away float noise; ten decimals is far below a cent.
  return Math.round(usd * 1e10) / 1e10;
}

/** "$1.23", "$0.0042", "<$0.0001", or "—" when unknown. */
export function formatCost(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return "—";
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return "<$0.0001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
