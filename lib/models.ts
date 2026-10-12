import type { EmbeddingModel, LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { PROVIDER_CONFIGS, getProviderCredentials } from "@/lib/llm-providers";
import type { LLMProvider } from "@/lib/types";

export class ProviderError extends Error {}

// Base URL of the provider's OpenAI-compatible API, for providers without a dedicated AI SDK package.
export function openAICompatibleBase(provider: LLMProvider, baseUrl: string) {
  const root = baseUrl.replace(/\/+$/, "");
  if (provider === "cohere") return root.replace(/\/v\d+$/, "") + "/compatibility/v1";
  // Local servers are configured by host; their OpenAI API lives under /v1.
  if (provider === "ollama" || PROVIDER_CONFIGS[provider].chatCompletionsEndpoint?.startsWith("/v1/")) {
    return root.endsWith("/v1") ? root : root + "/v1";
  }
  return root;
}

type ProviderFactory = {
  languageModel: (modelId: string) => LanguageModel;
  embeddingModel?: (modelId: string) => EmbeddingModel;
};

/** The AI SDK provider for a user: their stored key/base URL, falling back to the server env key. */
async function providerFor(userId: string, provider: string): Promise<ProviderFactory> {
  if (!(provider in PROVIDER_CONFIGS)) throw new ProviderError(`Unknown provider: ${provider}`);
  const p = provider as LLMProvider;
  const config = PROVIDER_CONFIGS[p];
  const creds = await getProviderCredentials(userId, p);
  if (!creds.enabled) throw new ProviderError(`${config.name} is disabled`);

  const apiKey = creds.apiKey ?? (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);
  if (config.requiresApiKey && !apiKey) {
    throw new ProviderError(`Add an API key for ${config.name} on the Providers page`);
  }
  const baseURL = creds.baseUrl ?? config.baseUrl;

  switch (p) {
    case "openai":
      return createOpenAI({ apiKey, baseURL });
    case "anthropic":
      return { languageModel: createAnthropic({ apiKey, baseURL }) };
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL });
    case "replicate":
      throw new ProviderError("Replicate has no chat-compatible API");
    default:
      return createOpenAICompatible({
        name: p,
        baseURL: openAICompatibleBase(p, baseURL),
        apiKey,
        includeUsage: true,
      });
  }
}

export async function getModel(userId: string, provider: string, modelId: string): Promise<LanguageModel> {
  return (await providerFor(userId, provider)).languageModel(modelId);
}

export async function getEmbeddingModel(userId: string, provider: string, modelId: string): Promise<EmbeddingModel> {
  const factory = await providerFor(userId, provider);
  if (!factory.embeddingModel) throw new ProviderError(`${PROVIDER_CONFIGS[provider as LLMProvider].name} has no embedding models`);
  return factory.embeddingModel(modelId);
}
