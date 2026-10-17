import type { EmbeddingModel, ImageModel, LanguageModel, RerankingModel, SpeechModel, TranscriptionModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createCohere } from "@ai-sdk/cohere";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PROVIDER_CONFIGS, getProviderCredentials } from "@/lib/llm-providers";
import { resolvePrice, type ModelPrice } from "@/lib/pricing";
import type { LLMProvider } from "@/lib/types";

import { ProviderError } from "@/lib/model-errors";

export { ProviderError };

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
  imageModel?: (modelId: string) => ImageModel;
  transcriptionModel?: (modelId: string) => TranscriptionModel;
  speechModel?: (modelId: string) => SpeechModel;
  rerankingModel?: (modelId: string) => RerankingModel;
};

/** A user's key and base URL for a provider: their stored config, falling back to the server env key. */
export async function resolveProviderAccess(userId: string, provider: string) {
  if (!(provider in PROVIDER_CONFIGS)) throw new ProviderError(`Unknown provider: ${provider}`);
  const p = provider as LLMProvider;
  const config = PROVIDER_CONFIGS[p];
  const creds = await getProviderCredentials(userId, p);
  if (!creds.enabled) throw new ProviderError(`${config.name} is disabled`);

  const apiKey = creds.apiKey ?? (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);
  if (config.requiresApiKey && !apiKey) {
    throw new ProviderError(`Add an API key for ${config.name} on the Providers page`);
  }
  return { provider: p, apiKey, baseURL: creds.baseUrl ?? config.baseUrl };
}

/** The AI SDK provider for a user. */
async function providerFor(userId: string, provider: string): Promise<ProviderFactory> {
  const { provider: p, apiKey, baseURL } = await resolveProviderAccess(userId, provider);

  switch (p) {
    case "openai": {
      const openai = createOpenAI({ apiKey, baseURL });
      return { ...openai, languageModel: openai.languageModel, transcriptionModel: openai.transcription, speechModel: openai.speech };
    }
    case "anthropic":
      return { languageModel: createAnthropic({ apiKey, baseURL }) };
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey, baseURL });
      return {
        ...google,
        languageModel: google.languageModel,
        imageModel: google.image,
        transcriptionModel: google.transcriptionModel,
        speechModel: google.speechModel,
      };
    }
    case "replicate":
      // Studio images go through lib/replicate.ts; there is no chat or OpenAI-compatible API.
      throw new ProviderError("Replicate has no chat-compatible API");
    default: {
      const compatBase = openAICompatibleBase(p, baseURL);
      const compat = createOpenAICompatible({ name: p, baseURL: compatBase, apiKey, includeUsage: true });
      // Audio endpoints (/audio/transcriptions, /audio/speech) follow OpenAI's format on compatible
      // servers (e.g. Groq Whisper), which the OpenAI provider speaks.
      const audio = createOpenAI({ apiKey: apiKey ?? "none", baseURL: compatBase });
      return {
        languageModel: compat.languageModel,
        embeddingModel: compat.embeddingModel,
        imageModel: compat.imageModel,
        transcriptionModel: audio.transcription,
        speechModel: audio.speech,
        // Reranking uses each vendor's native API (not part of the OpenAI-compatible surface).
        ...(p === "cohere" && { rerankingModel: createCohere({ apiKey }).reranking }),
        ...(p === "together" && { rerankingModel: createTogetherAI({ apiKey }).reranking }),
      };
    }
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

type Capability = "imageModel" | "transcriptionModel" | "speechModel";
const CAPABILITY_LABEL: Record<Capability, string> = {
  imageModel: "image generation",
  transcriptionModel: "transcription",
  speechModel: "text to speech",
};

async function capability<C extends Capability>(userId: string, provider: string, kind: C) {
  const factory = await providerFor(userId, provider);
  const make = factory[kind];
  if (!make) throw new ProviderError(`${PROVIDER_CONFIGS[provider as LLMProvider].name} doesn't offer ${CAPABILITY_LABEL[kind]}`);
  return make as NonNullable<ProviderFactory[C]>;
}

/** Providers whose reranking models work here (knowledge search). */
export const RERANK_PROVIDERS = ["cohere", "together"] as const;

export async function getRerankingModel(userId: string, provider: string, modelId: string): Promise<RerankingModel> {
  const factory = await providerFor(userId, provider);
  if (!factory.rerankingModel) throw new ProviderError(`${PROVIDER_CONFIGS[provider as LLMProvider].name} has no reranking models`);
  return factory.rerankingModel(modelId);
}

export const getImageModel = async (userId: string, provider: string, modelId: string) =>
  (await capability(userId, provider, "imageModel"))(modelId);
export const getTranscriptionModel = async (userId: string, provider: string, modelId: string) =>
  (await capability(userId, provider, "transcriptionModel"))(modelId);
export const getSpeechModel = async (userId: string, provider: string, modelId: string) =>
  (await capability(userId, provider, "speechModel"))(modelId);

/** The price a user pays for a model: their override on the Models page, else the built-in table. */
export async function getModelPrice(userId: string, provider: string, modelId: string): Promise<ModelPrice | null> {
  const override = await db.query.modelOverrides.findFirst({
    where: and(
      eq(schema.modelOverrides.userId, userId),
      eq(schema.modelOverrides.provider, provider),
      eq(schema.modelOverrides.modelId, modelId),
    ),
    columns: { inputPricePerM: true, outputPricePerM: true },
  });
  return resolvePrice(provider, modelId, override);
}
