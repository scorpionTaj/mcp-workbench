import type {
  LLMProvider,
  LLMProviderConfig,
  LLMModel,
  LLMProviderStatus,
} from "./types";

export const PROVIDER_CONFIGS: Record<LLMProvider, LLMProviderConfig> = {
  ollama: {
    name: "Ollama",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    healthEndpoint: "/api/tags",
    modelsEndpoint: "/api/tags",
    chatCompletionsEndpoint: "/api/chat",
    completionsEndpoint: "/api/generate",
    embeddingsEndpoint: "/api/embeddings",
  },
  lmstudio: {
    name: "LM Studio",
    baseUrl: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234",
    healthEndpoint: "/v1/models",
    modelsEndpoint: "/v1/models",
    chatCompletionsEndpoint: "/v1/chat/completions",
    completionsEndpoint: "/v1/completions",
    embeddingsEndpoint: "/v1/embeddings",
    responsesEndpoint: "/v1/responses",
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
  provider: LLMProvider
): Promise<boolean> {
  const config = PROVIDER_CONFIGS[provider];

  try {
    const response = await fetch(`${config.baseUrl}${config.healthEndpoint}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error(`MCP Workbench Health check failed for ${provider}:`, error);
    return false;
  }
}

export async function fetchProviderModels(
  provider: LLMProvider
): Promise<LLMModel[]> {
  const config = PROVIDER_CONFIGS[provider];

  try {
    const response = await fetch(`${config.baseUrl}${config.modelsEndpoint}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (provider === "ollama") {
      return (data.models || []).map((model: any) => ({
        id: model.name,
        name: model.name,
        provider,
        size: model.size ? `${(model.size / 1e9).toFixed(1)}GB` : undefined,
        modified: model.modified_at,
        isReasoning: isReasoningModel(model.name),
      }));
    } else if (provider === "lmstudio") {
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id,
        provider,
        isReasoning: isReasoningModel(model.id),
      }));
    }

    return [];
  } catch (error) {
    console.error(
      `MCP Workbench Failed to fetch models for ${provider}:`,
      error
    );
    return [];
  }
}

export async function getProviderStatus(
  provider: LLMProvider
): Promise<LLMProviderStatus> {
  const connected = await checkProviderHealth(provider);

  if (!connected) {
    return {
      provider,
      connected: false,
      models: [],
      error: "Provider not reachable",
    };
  }

  const models = await fetchProviderModels(provider);

  return {
    provider,
    connected: true,
    models,
  };
}

export async function getAllProvidersStatus(): Promise<LLMProviderStatus[]> {
  const providers: LLMProvider[] = ["ollama", "lmstudio"];
  return Promise.all(providers.map((provider) => getProviderStatus(provider)));
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

    return { loaded: false, error: "Unsupported provider" };
  } catch (error) {
    console.error(
      `MCP Workbench Failed to check model status for ${provider}:`,
      error
    );
    return { loaded: false, error: "Failed to connect to provider" };
  }
}
