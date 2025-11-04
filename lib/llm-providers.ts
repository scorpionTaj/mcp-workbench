import type {
  LLMProvider,
  LLMProviderConfig,
  LLMModel,
  LLMProviderStatus,
  ProviderType,
} from "./types";
import { prisma } from "./db";
import { decrypt } from "./encryption";
import logger from "./logger";
import { isVisionModel } from "./vision-detection";
import { isEmbeddingModel } from "./embedding-detection";
import { isImageGenerationModel } from "./image-generation-detection";
import { isAudioTranscriptionModel } from "./audio-transcription-detection";

export const PROVIDER_CONFIGS: Record<LLMProvider, LLMProviderConfig> = {
  ollama: {
    name: "Ollama",
    type: "local",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    healthEndpoint: "/api/tags",
    modelsEndpoint: "/api/tags",
    chatCompletionsEndpoint: "/api/chat",
    completionsEndpoint: "/api/generate",
    embeddingsEndpoint: "/api/embeddings",
  },
  lmstudio: {
    name: "LM Studio",
    type: "local",
    baseUrl: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234",
    healthEndpoint: "/v1/models",
    modelsEndpoint: "/v1/models",
    chatCompletionsEndpoint: "/v1/chat/completions",
    completionsEndpoint: "/v1/completions",
    embeddingsEndpoint: "/v1/embeddings",
    responsesEndpoint: "/v1/responses",
  },
  openai: {
    name: "OpenAI",
    type: "remote",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    completionsEndpoint: "/completions",
    embeddingsEndpoint: "/embeddings",
    imageGenerationEndpoint: "/images/generations",
    audioTranscriptionEndpoint: "/audio/transcriptions",
    requiresApiKey: true,
    apiKeyEnvVar: "OPENAI_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
    supportsImageGeneration: true,
    supportsAudioTranscription: true,
  },
  anthropic: {
    name: "Anthropic (Claude)",
    type: "remote",
    baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
    healthEndpoint: "/messages",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/messages",
    requiresApiKey: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    defaultHeaders: {
      "x-api-key": "{API_KEY}",
      "anthropic-version": "2023-06-01",
    },
  },
  google: {
    name: "Google AI (Gemini)",
    type: "remote",
    baseUrl:
      process.env.GOOGLE_AI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/models/{model}:generateContent",
    imageGenerationEndpoint: "/models/{model}:generateImages",
    requiresApiKey: true,
    apiKeyEnvVar: "GOOGLE_API_KEY",
    supportsImageGeneration: true,
  },
  groq: {
    name: "Groq",
    type: "remote",
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    audioTranscriptionEndpoint: "/audio/transcriptions",
    requiresApiKey: true,
    apiKeyEnvVar: "GROQ_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
    supportsAudioTranscription: true,
  },
  openrouter: {
    name: "OpenRouter",
    type: "remote",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    requiresApiKey: true,
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
  },
  together: {
    name: "Together AI",
    type: "remote",
    baseUrl: process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    imageGenerationEndpoint: "/images/generations",
    requiresApiKey: true,
    apiKeyEnvVar: "TOGETHER_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
    supportsImageGeneration: true,
  },
  mistral: {
    name: "Mistral AI",
    type: "remote",
    baseUrl: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    requiresApiKey: true,
    apiKeyEnvVar: "MISTRAL_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
  },
  cohere: {
    name: "Cohere",
    type: "remote",
    baseUrl: process.env.COHERE_BASE_URL || "https://api.cohere.ai/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat",
    requiresApiKey: true,
    apiKeyEnvVar: "COHERE_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
  },
  huggingface: {
    name: "HuggingFace",
    type: "remote",
    baseUrl:
      process.env.HUGGINGFACE_BASE_URL || "https://router.huggingface.co/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    embeddingsEndpoint: "/embeddings",
    imageGenerationEndpoint: "/text-to-image",
    audioTranscriptionEndpoint: "/automatic-speech-recognition",
    requiresApiKey: true,
    apiKeyEnvVar: "HUGGINGFACE_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
    supportsImageGeneration: true,
    supportsAudioTranscription: true,
  },
  replicate: {
    name: "Replicate",
    type: "remote",
    baseUrl: process.env.REPLICATE_BASE_URL || "https://api.replicate.com/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/predictions",
    imageGenerationEndpoint: "/predictions",
    audioTranscriptionEndpoint: "/predictions",
    requiresApiKey: true,
    apiKeyEnvVar: "REPLICATE_API_KEY",
    defaultHeaders: {
      Authorization: "Token {API_KEY}",
    },
    supportsImageGeneration: true,
    supportsAudioTranscription: true,
  },
  custom: {
    name: "Custom Provider",
    type: "local",
    baseUrl: process.env.CUSTOM_BASE_URL || "http://localhost:8000",
    healthEndpoint: "/health",
    modelsEndpoint: "/v1/models",
    chatCompletionsEndpoint: "/v1/chat/completions",
  },
};

// Keywords that indicate a reasoning/thinking model
const REASONING_KEYWORDS = [
  "reasoning",
  "think",
  "thought",
  "o1",
  "o3",
  "deepseek-r1",
  "qwq",
  "skywork-o1",
];

export function isReasoningModel(modelName: string): boolean {
  const lowerName = modelName.toLowerCase();
  return REASONING_KEYWORDS.some((keyword) => lowerName.includes(keyword));
}

export async function checkProviderHealth(
  provider: LLMProvider,
  apiKey?: string,
  customBaseUrl?: string
): Promise<boolean> {
  const config = PROVIDER_CONFIGS[provider];
  const baseUrl = customBaseUrl || config.baseUrl;

  // Get API key from parameter or environment
  const key =
    apiKey ||
    (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);

  // For providers requiring API keys, check if key is available
  if (config.requiresApiKey && !key) {
    logger.info(`MCP Workbench ${provider} requires API key but none provided`);
    return false;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authentication headers if needed
    if (config.requiresApiKey && key) {
      if (provider === "google") {
        // Google uses x-goog-api-key header
        headers["x-goog-api-key"] = key;
      } else if (config.defaultHeaders) {
        Object.entries(config.defaultHeaders).forEach(
          ([headerKey, headerValue]) => {
            headers[headerKey] = headerValue.replace("{API_KEY}", key);
          }
        );
      } else {
        headers["Authorization"] = `Bearer ${key}`;
      }
    }

    // For remote providers with API keys, check models endpoint instead
    // This is more reliable than health endpoints which may not exist
    if (config.type === "remote" && config.requiresApiKey) {
      const url = `${baseUrl}${config.modelsEndpoint}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10000), // Longer timeout for remote APIs
      });
      return response.ok;
    } // For local providers, use health endpoint
    const response = await fetch(`${baseUrl}${config.healthEndpoint}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    logger.error(
      { err: error },
      `MCP Workbench Health check failed for ${provider}:`
    );
    return false;
  }
}

export async function fetchProviderModels(
  provider: LLMProvider,
  apiKey?: string,
  customBaseUrl?: string
): Promise<LLMModel[]> {
  const config = PROVIDER_CONFIGS[provider];
  const baseUrl = customBaseUrl || config.baseUrl;

  // Get API key from parameter or environment
  const key =
    apiKey ||
    (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authentication headers if needed
    if (config.requiresApiKey && key) {
      if (provider === "google") {
        // Google uses x-goog-api-key header
        headers["x-goog-api-key"] = key;
      } else if (config.defaultHeaders) {
        Object.entries(config.defaultHeaders).forEach(
          ([headerKey, headerValue]) => {
            headers[headerKey] = headerValue.replace("{API_KEY}", key);
          }
        );
      } else if (!config.usesQueryParamAuth) {
        // Only add bearer token if not using query param auth
        headers["Authorization"] = `Bearer ${key}`;
      }
    }

    const url = `${baseUrl}${config.modelsEndpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.error(
        `MCP Workbench Failed to fetch models for ${provider}: HTTP ${response.status}`
      );
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    logger.info(
      {
        provider,
        dataKeys: Object.keys(data),
        modelsCount: data.models?.length || data.data?.length || 0,
      },
      `MCP Workbench Fetched models for ${provider}`
    );

    if (provider === "ollama") {
      return (data.models || []).map((model: any) => ({
        id: model.name,
        name: model.name,
        provider,
        size: model.size ? `${(model.size / 1e9).toFixed(1)}GB` : undefined,
        modified: model.modified_at,
        isReasoning: isReasoningModel(model.name),
        isVision: isVisionModel(model.name, provider),
        isEmbedding: isEmbeddingModel(model.name, provider),
        isImageGeneration: isImageGenerationModel(model.name),
        isAudioTranscription: isAudioTranscriptionModel(model.name),
      }));
    } else if (provider === "lmstudio") {
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        provider,
        isReasoning: isReasoningModel(model.id),
        isVision: isVisionModel(model.id, provider),
        isEmbedding: isEmbeddingModel(model.id, provider),
        isImageGeneration: isImageGenerationModel(model.id),
        isAudioTranscription: isAudioTranscriptionModel(model.id),
      }));
    } else if (
      ["openai", "groq", "openrouter", "together", "mistral"].includes(provider)
    ) {
      // OpenAI-compatible API
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        provider,
        isReasoning: isReasoningModel(model.id),
        isVision: isVisionModel(model.id, provider),
        isEmbedding: isEmbeddingModel(model.id, provider),
        isImageGeneration: isImageGenerationModel(model.id),
        isAudioTranscription: isAudioTranscriptionModel(model.id),
      }));
    } else if (provider === "anthropic") {
      // Anthropic doesn't have a models endpoint, return known models
      return [
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          provider,
          isReasoning: false,
          isVision: isVisionModel("claude-3-5-sonnet-20241022", provider),
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "claude-3-5-haiku-20241022",
          name: "Claude 3.5 Haiku",
          provider,
          isReasoning: false,
          isVision: isVisionModel("claude-3-5-haiku-20241022", provider),
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          provider,
          isReasoning: false,
          isVision: isVisionModel("claude-3-opus-20240229", provider),
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
      ];
    } else if (provider === "google") {
      // Google AI models
      return (data.models || []).map((model: any) => ({
        id: model.name.replace("models/", ""),
        name: model.displayName || model.name,
        provider,
        isReasoning: isReasoningModel(model.name),
        isVision: isVisionModel(model.name, provider),
        isEmbedding: isEmbeddingModel(model.name, provider),
        isImageGeneration: isImageGenerationModel(model.name),
        isAudioTranscription: isAudioTranscriptionModel(model.name),
      }));
    } else if (provider === "cohere") {
      // Cohere models
      return (data.models || []).map((model: any) => ({
        id: model.name,
        name: model.name,
        provider,
        isReasoning: isReasoningModel(model.name),
        isVision: isVisionModel(model.name, provider),
        isEmbedding: isEmbeddingModel(model.name, provider),
        isImageGeneration: isImageGenerationModel(model.name),
        isAudioTranscription: isAudioTranscriptionModel(model.name),
      }));
    } else if (provider === "huggingface") {
      // HuggingFace models - fetch from API using OpenAI-compatible endpoint
      // The /v1/models endpoint returns all available models dynamically
      try {
        // Try to fetch from API first
        const models = (data.data || []).map((model: any) => ({
          id: model.id,
          name: model.id,
          provider,
          isReasoning: isReasoningModel(model.id),
          isVision: isVisionModel(model.id, provider),
          isEmbedding: isEmbeddingModel(model.id, provider),
          isImageGeneration: isImageGenerationModel(model.id),
          isAudioTranscription: isAudioTranscriptionModel(model.id),
        }));

        // If API returned models, use them
        if (models.length > 0) {
          logger.info(
            { count: models.length },
            "MCP Workbench Fetched HuggingFace models from API"
          );
          return models;
        }
      } catch (error) {
        logger.warn(
          { error },
          "MCP Workbench Failed to fetch HuggingFace models from API, using fallback"
        );
      }

      // Fallback to curated list if API fetch fails
      return [
        // Chat/Text Generation Models
        {
          id: "meta-llama/Llama-3.3-70B-Instruct",
          name: "Llama 3.3 70B Instruct",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "meta-llama/Llama-3.2-11B-Vision-Instruct",
          name: "Llama 3.2 11B Vision Instruct",
          provider,
          isReasoning: false,
          isVision: true,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "mistralai/Mistral-7B-Instruct-v0.3",
          name: "Mistral 7B Instruct v0.3",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "meta-llama/Llama-3.2-3B-Instruct",
          name: "Llama 3.2 3B Instruct",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "Qwen/Qwen2.5-72B-Instruct",
          name: "Qwen 2.5 72B Instruct",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "microsoft/Phi-3.5-mini-instruct",
          name: "Phi 3.5 Mini Instruct",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        // Image Generation Models
        {
          id: "black-forest-labs/FLUX.1-dev",
          name: "FLUX.1 Dev",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "black-forest-labs/FLUX.1-schnell",
          name: "FLUX.1 Schnell",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "stabilityai/stable-diffusion-xl-base-1.0",
          name: "Stable Diffusion XL",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "stabilityai/stable-diffusion-3-medium",
          name: "Stable Diffusion 3 Medium",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "stabilityai/stable-diffusion-3.5-large",
          name: "Stable Diffusion 3.5 Large",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        // Audio Transcription Models
        {
          id: "openai/whisper-large-v3-turbo",
          name: "Whisper Large V3 Turbo",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
        {
          id: "openai/whisper-large-v3",
          name: "Whisper Large V3",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
        {
          id: "distil-whisper/distil-large-v3",
          name: "Distil Whisper Large V3",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
        {
          id: "nvidia/canary-1b",
          name: "NVIDIA Canary 1B",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
        // Embedding Models
        {
          id: "sentence-transformers/all-MiniLM-L6-v2",
          name: "All MiniLM L6 v2",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: true,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "BAAI/bge-large-en-v1.5",
          name: "BGE Large EN v1.5",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: true,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "intfloat/e5-large-v2",
          name: "E5 Large v2",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: true,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
      ];
    } else if (provider === "replicate") {
      // Replicate models - return popular ones
      return [
        {
          id: "black-forest-labs/flux-schnell",
          name: "FLUX Schnell",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "black-forest-labs/flux-pro",
          name: "FLUX Pro",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "stability-ai/sdxl",
          name: "Stable Diffusion XL",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: true,
          isAudioTranscription: false,
        },
        {
          id: "meta/llama-2-70b-chat",
          name: "Llama 2 70B Chat",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: false,
        },
        {
          id: "vaibhavs10/incredibly-fast-whisper",
          name: "Incredibly Fast Whisper",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
        {
          id: "openai/whisper",
          name: "Whisper",
          provider,
          isReasoning: false,
          isVision: false,
          isEmbedding: false,
          isImageGeneration: false,
          isAudioTranscription: true,
        },
      ];
    }

    return [];
  } catch (error) {
    logger.error(
      { err: error, provider },
      `MCP Workbench Failed to fetch models for ${provider}`
    );
    return [];
  }
}

export async function getProviderStatus(
  provider: LLMProvider,
  apiKey?: string,
  customBaseUrl?: string
): Promise<LLMProviderStatus> {
  const config = PROVIDER_CONFIGS[provider];
  const connected = await checkProviderHealth(provider, apiKey, customBaseUrl);

  if (!connected) {
    return {
      provider,
      type: config.type,
      connected: false,
      models: [],
      error: "Provider not reachable",
      requiresApiKey: config.requiresApiKey,
      hasApiKey: !!apiKey || !!process.env[config.apiKeyEnvVar || ""],
    };
  }

  const models = await fetchProviderModels(provider, apiKey, customBaseUrl);

  return {
    provider,
    type: config.type,
    connected: true,
    models,
    requiresApiKey: config.requiresApiKey,
    hasApiKey: !!apiKey || !!process.env[config.apiKeyEnvVar || ""],
  };
}

export async function getAllProvidersStatus(): Promise<LLMProviderStatus[]> {
  try {
    // Get enabled providers from database
    const providerConfigs = await prisma.providerConfig.findMany({
      where: { enabled: true },
    });

    // If no providers configured, return defaults for local providers
    if (providerConfigs.length === 0) {
      return Promise.all([
        getProviderStatus("ollama"),
        getProviderStatus("lmstudio"),
      ]);
    }

    // Get status for each configured provider
    return Promise.all(
      providerConfigs.map(
        (config: {
          provider: string;
          apiKey: string | null;
          baseUrl: string | null;
        }) => {
          // Decrypt API key if it exists
          const decryptedApiKey = config.apiKey
            ? decrypt(config.apiKey)
            : undefined;
          return getProviderStatus(
            config.provider as LLMProvider,
            decryptedApiKey,
            config.baseUrl || undefined
          );
        }
      )
    );
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to fetch provider configs from database"
    );
    // Fallback to env-based detection
    const enabledProviders: LLMProvider[] = ["ollama", "lmstudio"];

    // Add remote providers if API keys are available
    if (process.env.OPENAI_API_KEY) enabledProviders.push("openai");
    if (process.env.ANTHROPIC_API_KEY) enabledProviders.push("anthropic");
    if (process.env.GOOGLE_API_KEY) enabledProviders.push("google");
    if (process.env.GROQ_API_KEY) enabledProviders.push("groq");
    if (process.env.OPENROUTER_API_KEY) enabledProviders.push("openrouter");
    if (process.env.TOGETHER_API_KEY) enabledProviders.push("together");
    if (process.env.MISTRAL_API_KEY) enabledProviders.push("mistral");
    if (process.env.COHERE_API_KEY) enabledProviders.push("cohere");
    if (process.env.HUGGINGFACE_API_KEY) enabledProviders.push("huggingface");
    if (process.env.REPLICATE_API_KEY) enabledProviders.push("replicate");

    return Promise.all(
      enabledProviders.map((provider) => getProviderStatus(provider))
    );
  }
}

export async function checkModelLoaded(
  provider: LLMProvider,
  modelId: string
): Promise<{ loaded: boolean; error?: string }> {
  const config = PROVIDER_CONFIGS[provider];

  try {
    if (provider === "ollama") {
      // For Ollama, check if model is in the list of running models
      const response = await fetch(`${config.baseUrl}/api/ps`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { loaded: false, error: "Failed to check model status" };
      }

      const data = await response.json();
      const runningModels = data.models || [];

      // Check if our model is running
      const isRunning = runningModels.some(
        (m: any) => m.name === modelId || m.model === modelId
      );

      if (!isRunning) {
        // Model not loaded, but we can try to load it by making a simple request
        // Ollama will auto-load the model on first request
        return { loaded: true }; // Ollama auto-loads models
      }

      return { loaded: true };
    } else if (provider === "lmstudio") {
      // For LM Studio, check if a model is loaded via /v1/models endpoint
      const response = await fetch(`${config.baseUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { loaded: false, error: "Failed to check model status" };
      }

      const data = await response.json();
      const models = data.data || [];

      if (models.length === 0) {
        return {
          loaded: false,
          error: "No model loaded in LM Studio. Please load a model first.",
        };
      }

      // Check if the specific model is loaded
      const isLoaded = models.some((m: any) => m.id === modelId);

      if (!isLoaded && models.length > 0) {
        // A different model is loaded
        return {
          loaded: false,
          error: `Model "${modelId}" is not loaded. Currently loaded: "${models[0].id}"`,
        };
      }

      return { loaded: true };
    }

    // For remote providers (OpenAI, Anthropic, Google, etc.), models are always available
    // No need to check if they're "loaded" - they're accessed via API
    if (config.type === "remote") {
      return { loaded: true };
    }

    return { loaded: false, error: "Unsupported provider" };
  } catch (error) {
    logger.error(
      { err: error, provider },
      `MCP Workbench Failed to check model status for ${provider}`
    );
    return { loaded: false, error: "Failed to connect to provider" };
  }
}
