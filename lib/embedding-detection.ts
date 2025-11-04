/**
 * Embedding Model Detection Utility
 *
 * Detects whether a model is designed for text embeddings/vector generation
 * rather than text generation. This helps identify models suitable for RAG,
 * semantic search, and vector database operations.
 */

/**
 * Known embedding model patterns by provider
 */
const EMBEDDING_MODEL_PATTERNS: Record<string, RegExp[]> = {
  openai: [/text-embedding/i, /^ada$/i, /^embedding/i],
  anthropic: [
    // Anthropic doesn't have dedicated embedding models yet
    // Voyage AI is their recommended embedding partner
  ],
  google: [/embedding/i, /text-embedding/i, /textembedding/i],
  cohere: [/embed/i, /^embed-/i],
  ollama: [
    /^nomic-embed/i,
    /^mxbai-embed/i,
    /^all-minilm/i,
    /^bge-/i,
    /^gte-/i,
    /^e5-/i,
    /embedding/i,
    /^jina-/i,
    /^stella/i,
  ],
  lmstudio: [/embed/i, /embedding/i, /^nomic-embed/i, /^bge-/i, /^gte-/i],
  together: [/embedding/i, /^embed/i],
  mistral: [/embed/i, /mistral-embed/i],
  openrouter: [
    // OpenRouter can route to various embedding models
    /embedding/i,
    /^embed/i,
  ],
};

/**
 * Common embedding model name patterns (provider-agnostic)
 */
const GENERIC_EMBEDDING_PATTERNS = [
  /text-embedding/i,
  /^embed-/i,
  /-embed-/i,
  /embedding-/i,
  /nomic-embed/i,
  /bge-/i, // BAAI General Embedding
  /gte-/i, // General Text Embeddings
  /e5-/i, // Text Embeddings from Microsoft
  /instructor-/i,
  /sentence-transformer/i,
  /all-minilm/i,
  /all-mpnet/i,
  /^jina-embeddings/i,
  /^stella-/i,
];

/**
 * Known embedding model sizes (for display purposes)
 */
interface EmbeddingModelInfo {
  dimensions?: number;
  maxTokens?: number;
  description?: string;
}

const KNOWN_EMBEDDING_MODELS: Record<string, EmbeddingModelInfo> = {
  "text-embedding-3-large": {
    dimensions: 3072,
    maxTokens: 8191,
    description: "OpenAI's most capable embedding model",
  },
  "text-embedding-3-small": {
    dimensions: 1536,
    maxTokens: 8191,
    description: "OpenAI's efficient embedding model",
  },
  "text-embedding-ada-002": {
    dimensions: 1536,
    maxTokens: 8191,
    description: "OpenAI's previous generation embedding model",
  },
  "nomic-embed-text": {
    dimensions: 768,
    maxTokens: 8192,
    description: "High-quality open-source embedding model",
  },
  "mxbai-embed-large": {
    dimensions: 1024,
    maxTokens: 512,
    description: "Powerful multilingual embedding model",
  },
  "all-minilm": {
    dimensions: 384,
    maxTokens: 512,
    description: "Fast and efficient embedding model",
  },
  "embed-english-v3.0": {
    dimensions: 1024,
    maxTokens: 512,
    description: "Cohere's English embedding model",
  },
  "embed-multilingual-v3.0": {
    dimensions: 1024,
    maxTokens: 512,
    description: "Cohere's multilingual embedding model",
  },
};

/**
 * Checks if a model is an embedding model
 *
 * @param modelId - The model identifier
 * @param provider - The provider name (optional)
 * @returns true if the model is designed for embeddings
 */
export function isEmbeddingModel(modelId: string, provider?: string): boolean {
  if (!modelId) return false;

  // Check provider-specific patterns first
  if (provider && EMBEDDING_MODEL_PATTERNS[provider]) {
    const patterns = EMBEDDING_MODEL_PATTERNS[provider];
    if (patterns.some((pattern) => pattern.test(modelId))) {
      return true;
    }
  }

  // Check generic patterns
  return GENERIC_EMBEDDING_PATTERNS.some((pattern) => pattern.test(modelId));
}

/**
 * Gets information about an embedding model
 *
 * @param modelId - The model identifier
 * @returns Model information if known, undefined otherwise
 */
export function getEmbeddingModelInfo(
  modelId: string
): EmbeddingModelInfo | undefined {
  // Check exact match first
  if (KNOWN_EMBEDDING_MODELS[modelId]) {
    return KNOWN_EMBEDDING_MODELS[modelId];
  }

  // Check partial matches
  const modelKey = Object.keys(KNOWN_EMBEDDING_MODELS).find((key) =>
    modelId.toLowerCase().includes(key.toLowerCase())
  );

  if (modelKey) {
    return KNOWN_EMBEDDING_MODELS[modelKey];
  }

  return undefined;
}

/**
 * Gets a human-readable description of embedding capabilities
 *
 * @param modelId - The model identifier
 * @param provider - The provider name
 * @returns A description string, or undefined if not an embedding model
 */
export function getEmbeddingCapabilityDescription(
  modelId: string,
  provider?: string
): string | undefined {
  if (!isEmbeddingModel(modelId, provider)) {
    return undefined;
  }

  const info = getEmbeddingModelInfo(modelId);
  if (info?.description) {
    return info.description;
  }

  // Generic descriptions based on provider
  if (provider === "openai") {
    return "OpenAI embedding model for semantic search and RAG";
  }

  if (provider === "cohere") {
    return "Cohere embedding model with high accuracy";
  }

  if (provider === "google") {
    return "Google embedding model for text understanding";
  }

  if (provider === "ollama" || provider === "lmstudio") {
    return "Local embedding model for privacy-focused applications";
  }

  return "Embedding model for vector generation and semantic search";
}

/**
 * Gets suggested use cases for an embedding model
 *
 * @param modelId - The model identifier
 * @returns Array of use case strings
 */
export function getEmbeddingUseCases(modelId: string): string[] {
  const useCases = [
    "Semantic search",
    "Document retrieval",
    "RAG (Retrieval Augmented Generation)",
    "Text clustering",
    "Similarity matching",
  ];

  // Add specific use cases based on model characteristics
  if (modelId.includes("multilingual")) {
    useCases.push("Cross-language search");
  }

  if (modelId.includes("code")) {
    useCases.push("Code search and analysis");
  }

  if (modelId.includes("large") || modelId.includes("3-large")) {
    useCases.push("High-precision tasks");
  }

  return useCases;
}

/**
 * Checks if a model should be hidden from chat model selection
 * (embedding models should not be used for chat)
 *
 * @param modelId - The model identifier
 * @param provider - The provider name
 * @returns true if the model should be excluded from chat selection
 */
export function shouldExcludeFromChat(
  modelId: string,
  provider?: string
): boolean {
  return isEmbeddingModel(modelId, provider);
}
