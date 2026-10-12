/**
 * Image Generation Model Detection
 *
 * Detects models that can generate images from text prompts.
 * Includes models from OpenAI (DALL-E), Stability AI, Midjourney, HuggingFace, Replicate, etc.
 */

const IMAGE_GENERATION_PATTERNS = [
  // OpenAI DALL-E models
  /dall-?e/i,

  // Stability AI models
  /stable-?diffusion/i,
  /sdxl/i,
  /sd-/i,
  /stability/i,

  // Midjourney (via APIs)
  /midjourney/i,
  /mj-/i,

  // Google Gemini image generation
  /gemini.*image/i,
  /imagen/i,

  // Popular open-source image models
  /flux/i,
  /playground-v/i,
  /parti/i,

  // HuggingFace popular models
  /runwayml.*stable/i,
  /stabilityai/i,
  /CompVis/i,

  // Model types/keywords
  /text-to-image/i,
  /txt2img/i,
  /image-generation/i,
  /diffusion/i,
];

/**
 * Check if a model name indicates an image generation capability
 */
export function isImageGenerationModel(modelName: string): boolean {
  const normalized = modelName.toLowerCase().trim();

  // Check against all patterns
  return IMAGE_GENERATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Get popular image generation models by provider
 */
export const KNOWN_IMAGE_MODELS = {
  openai: ["dall-e-2", "dall-e-3"],
  google: [
    "gemini-2.0-flash-exp-image-generation",
    "imagen-3.0-generate-001",
    "imagen-3.0-fast-generate-001",
  ],
  together: [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-2-1-base",
    "prompthero/openjourney-v4",
    "runwayml/stable-diffusion-v1-5",
    "SG161222/Realistic_Vision_V3.0_VAE",
    "wavymulder/Analog-Diffusion",
  ],
  replicate: [
    "stability-ai/sdxl",
    "stability-ai/stable-diffusion",
    "playgroundai/playground-v2",
    "black-forest-labs/flux-schnell",
    "black-forest-labs/flux-dev",
    "black-forest-labs/flux-pro",
  ],
  huggingface: [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-2-1",
    "stabilityai/stable-diffusion-3-medium",
    "runwayml/stable-diffusion-v1-5",
    "prompthero/openjourney",
    "CompVis/stable-diffusion-v1-4",
  ],
} as const;

/**
 * Check if a provider supports image generation
 */
export function providerSupportsImageGeneration(provider: string): boolean {
  return ["openai", "google", "replicate", "huggingface", "together"].includes(
    provider
  );
}
