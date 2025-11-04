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
    requiresApiKey: true,
    apiKeyEnvVar: "OPENAI_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
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
    requiresApiKey: true,
    apiKeyEnvVar: "GOOGLE_API_KEY",
  },
  groq: {
    name: "Groq",
    type: "remote",
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    healthEndpoint: "/models",
    modelsEndpoint: "/models",
    chatCompletionsEndpoint: "/chat/completions",
    requiresApiKey: true,
    apiKeyEnvVar: "GROQ_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
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
    requiresApiKey: true,
    apiKeyEnvVar: "TOGETHER_API_KEY",
    defaultHeaders: {
      Authorization: "Bearer {API_KEY}",
    },
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
    }

    // For local providers, use health endpoint
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
      }));
    } else if (provider === "lmstudio") {
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        provider,
        isReasoning: isReasoningModel(model.id),
        isVision: isVisionModel(model.id, provider),
        isEmbedding: isEmbeddingModel(model.id, provider),
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
        },
        {
          id: "claude-3-5-haiku-20241022",
          name: "Claude 3.5 Haiku",
          provider,
          isReasoning: false,
          isVision: isVisionModel("claude-3-5-haiku-20241022", provider),
          isEmbedding: false,
        },
        {
          id: "claude-3-opus-20240229",
          name: "Claude 3 Opus",
          provider,
          isReasoning: false,
          isVision: isVisionModel("claude-3-opus-20240229", provider),
          isEmbedding: false,
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
      }));
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
