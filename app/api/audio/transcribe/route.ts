import { NextRequest, NextResponse } from "next/server";
import { PROVIDER_CONFIGS } from "@/lib/llm-providers";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import logger from "@/lib/logger";
import {
  MAX_AUDIO_FILE_SIZE,
  SUPPORTED_AUDIO_FORMATS,
} from "@/lib/audio-transcription-detection";

/**
 * POST /api/audio/transcribe
 * Transcribe audio files to text using various providers
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const provider = formData.get("provider") as string;
    const model = formData.get("model") as string;
    const language = formData.get("language") as string | undefined;
    const prompt = formData.get("prompt") as string | undefined; // Optional context

    if (!file || !provider || !model) {
      return NextResponse.json(
        { error: "Missing required fields: file, provider, model" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_AUDIO_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${
            MAX_AUDIO_FILE_SIZE / 1024 / 1024
          }MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_AUDIO_FORMATS.includes(file.type as any)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${file.type}` },
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

    if (!config.supportsAudioTranscription) {
      return NextResponse.json(
        { error: `Provider ${provider} does not support audio transcription` },
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

    // Prepare form data for API call
    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("model", model);

    if (language) {
      apiFormData.append("language", language);
    }

    if (prompt) {
      apiFormData.append("prompt", prompt);
    }

    // Prepare headers
    const headers: Record<string, string> = {};

    if (config.defaultHeaders && apiKey) {
      Object.entries(config.defaultHeaders).forEach(([key, value]) => {
        if (key !== "Content-Type") {
          // Let browser set Content-Type for multipart/form-data
          headers[key] = value.replace("{API_KEY}", apiKey!);
        }
      });
    }

    // Transcribe audio based on provider
    let response;
    const baseUrl = config.baseUrl;

    switch (provider) {
      case "openai": {
        // OpenAI Whisper API
        const endpoint = `${baseUrl}${config.audioTranscriptionEndpoint}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: apiFormData,
        });
        break;
      }

      case "groq": {
        // Groq Whisper API (OpenAI-compatible)
        const endpoint = `${baseUrl}${config.audioTranscriptionEndpoint}`;
        response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: apiFormData,
        });
        break;
      }

      case "huggingface": {
        // HuggingFace Inference API
        const endpoint = `${baseUrl}/models/${model}`;
        const audioBuffer = await file.arrayBuffer();
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": file.type,
          },
          body: audioBuffer,
        });
        break;
      }

      case "replicate": {
        // Replicate API
        const endpoint = `${baseUrl}${config.imageGenerationEndpoint}`; // Uses same predictions endpoint
        const audioBase64 = Buffer.from(await file.arrayBuffer()).toString(
          "base64"
        );
        const dataUri = `data:${file.type};base64,${audioBase64}`;

        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: model,
            input: {
              audio: dataUri,
              language: language || "en",
            },
          }),
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Audio transcription not implemented for ${provider}` },
          { status: 501 }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Audio transcription failed: ${errorText}`);
      return NextResponse.json(
        { error: `Audio transcription failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize response format
    let text = "";

    switch (provider) {
      case "openai":
        text = data.text || "";
        break;
      case "groq":
        // Groq uses OpenAI-compatible format
        text = data.text || "";
        break;
      case "huggingface":
        text = data.text || data.transcription || "";
        break;
      case "replicate":
        text = data.output?.transcription || data.output || "";
        break;
    }

    return NextResponse.json({
      provider,
      model,
      text,
      language: data.language || language,
      duration: data.duration,
    });
  } catch (error) {
    logger.error({ err: error }, "Audio transcription error");
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
