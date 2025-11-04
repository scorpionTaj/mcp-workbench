import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import logger from "@/lib/logger";

/**
 * POST /api/images/generate
 * Generate images from text prompts using various providers
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider,
      model,
      prompt,
      n = 1,
      size = "1024x1024",
      quality = "standard",
    } = body;

    if (!provider || !model || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, prompt" },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
    if (!config) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    if (!config.supportsImageGeneration) {
      return NextResponse.json(
        { error: `Provider ${provider} does not support image generation` },
        { status: 400 }
      );
    }

    // Get API key from database or environment
    let apiKey: string | undefined;
    if (config.requiresApiKey) {
      const providerConfig = await prisma.providerConfig.findUnique({
        where: { provider },
      });

      if (providerConfig?.apiKey) {
        apiKey = decrypt(providerConfig.apiKey);
      } else if (config.apiKeyEnvVar) {
        apiKey = process.env[config.apiKeyEnvVar];
      }

      if (!apiKey) {
        return NextResponse.json(
          { error: `API key required for ${provider}` },
          { status: 401 }
        );
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.defaultHeaders && apiKey) {
      Object.entries(config.defaultHeaders).forEach(([key, value]) => {
        headers[key] = value.replace("{API_KEY}", apiKey!);
      });
    }

    // Generate image based on provider
    let response;
    const baseUrl = config.baseUrl;

    switch (provider) {
      case "openai": {
        // OpenAI DALL-E API
        const endpoint = `${baseUrl}${config.imageGenerationEndpoint}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            prompt,
            n,
            size,
            quality,
          }),
        });
        break;
      }

      case "replicate": {
        // Replicate API
        const endpoint = `${baseUrl}${config.imageGenerationEndpoint}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            version: model,
            input: {
              prompt,
              num_outputs: n,
            },
          }),
        });
        break;
      }

      case "huggingface": {
        // HuggingFace Inference API
        const endpoint = `${baseUrl}/models/${model}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: prompt,
          }),
        });
        break;
      }

      case "google": {
        // Google Gemini Image Generation API
        // API uses query parameter for authentication
        const endpoint = `${baseUrl}/models/${model}:generateImages?key=${apiKey}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: {
              text: prompt,
            },
            number_of_images: n,
            // Gemini supports various aspect ratios
            aspect_ratio: size === "1024x1024" ? "1:1" : "16:9",
          }),
        });
        break;
      }

      case "together": {
        // Together AI uses OpenAI-compatible API
        const endpoint = `${baseUrl}${config.imageGenerationEndpoint}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            prompt,
            n,
            size,
          }),
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Image generation not implemented for ${provider}` },
          { status: 501 }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Image generation failed: ${errorText}`);
      return NextResponse.json(
        { error: `Image generation failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize response format
    let images: Array<{ url?: string; b64_json?: string }> = [];

    switch (provider) {
      case "openai":
        images = data.data || [];
        break;
      case "together":
        // Together AI uses OpenAI-compatible format
        images = data.data || [];
        break;
      case "replicate":
        // Replicate returns URLs in output array
        images = (data.output || []).map((url: string) => ({ url }));
        break;
      case "huggingface":
        // HuggingFace returns image data directly
        images = [{ b64_json: data }];
        break;
      case "google":
        // Google Gemini returns images with base64 data
        if (data.images) {
          images = data.images.map((img: any) => ({
            b64_json: img.imageData || img.bytesBase64Encoded,
            url: img.uri,
          }));
        } else if (data.generatedImages) {
          images = data.generatedImages.map((img: any) => ({
            b64_json: img.bytesBase64Encoded,
          }));
        }
        break;
    }

    return NextResponse.json({
      provider,
      model,
      prompt,
      images,
      created: Date.now(),
    });
  } catch (error) {
    logger.error({ err: error }, "Image generation error");
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
