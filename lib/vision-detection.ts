/**
 * Vision Model Detection Utility
 *
 * Detects whether a model supports vision/image inputs based on model name patterns.
 * This helps identify multi-modal models that can process images.
 */

/**
 * Known vision-capable model patterns by provider
 */
const VISION_MODEL_PATTERNS: Record<string, RegExp[]> = {
  openai: [
    /gpt-4.*vision/i,
    /gpt-4v/i,
    /gpt-4-turbo.*vision/i,
    /gpt-4o/i, // GPT-4o and GPT-4o-mini support vision
  ],
  anthropic: [
    /claude-3/i, // All Claude 3 models support vision
    /claude-3\.5/i,
  ],
  google: [
    /gemini.*vision/i,
    /gemini-pro-vision/i,
    /gemini-1\.5/i, // Gemini 1.5 supports vision
    /gemini-2\.0/i, // Gemini 2.0 supports vision
  ],
  ollama: [
    /llava/i,
    /bakllava/i,
    /llama.*vision/i,
    /gemini.*vision/i,
    /qwen.*vl/i, // Qwen-VL models
    /minicpm-v/i,
    /cogvlm/i,
  ],
  lmstudio: [
    /llava/i,
    /bakllava/i,
    /vision/i,
    /vl/i, // Vision-Language models
  ],
  groq: [/llava/i, /vision/i],
  openrouter: [
    /gpt-4.*vision/i,
    /gpt-4v/i,
    /gpt-4o/i,
    /claude-3/i,
    /gemini.*vision/i,
    /llava/i,
  ],
  together: [/llava/i, /vision/i],
};

/**
 * Checks if a model supports vision/image inputs
 *
 * @param modelId - The model identifier (e.g., "gpt-4-vision-preview", "claude-3-opus-20240229")
 * @param provider - The provider name (e.g., "openai", "anthropic")
 * @returns true if the model supports vision, false otherwise
 */
export function isVisionModel(modelId: string, provider?: string): boolean {
  if (!modelId) return false;

  // Check provider-specific patterns first
  if (provider && VISION_MODEL_PATTERNS[provider]) {
    const patterns = VISION_MODEL_PATTERNS[provider];
    if (patterns.some((pattern) => pattern.test(modelId))) {
      return true;
    }
  }

  // Check all patterns if no provider match
  const allPatterns = Object.values(VISION_MODEL_PATTERNS).flat();
  return allPatterns.some((pattern) => pattern.test(modelId));
}

/**
 * Gets a human-readable description of vision capabilities for a model
 *
 * @param modelId - The model identifier
 * @param provider - The provider name
 * @returns A description string, or undefined if not a vision model
 */
export function getVisionCapabilityDescription(
  modelId: string,
  provider?: string
): string | undefined {
  if (!isVisionModel(modelId, provider)) {
    return undefined;
  }

  // Provider-specific descriptions
  if (provider === "openai" && /gpt-4o/i.test(modelId)) {
    return "Supports images, screenshots, and documents";
  }

  if (provider === "anthropic" && /claude-3/i.test(modelId)) {
    return "Supports images, PDFs, and documents";
  }

  if (provider === "google" && /gemini/i.test(modelId)) {
    return "Supports images, audio, and video";
  }

  if (/llava/i.test(modelId)) {
    return "Open-source vision model - supports images";
  }

  return "Supports image inputs";
}

/**
 * Checks if a file type is supported by vision models
 *
 * @param mimeType - The MIME type of the file
 * @returns true if the file type is supported
 */
export function isSupportedVisionFileType(mimeType: string): boolean {
  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Some models support PDFs
    "application/pdf",
  ];

  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Gets the list of supported file types for vision models
 *
 * @returns Array of supported MIME types
 */
export function getSupportedVisionFileTypes(): string[] {
  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
}
