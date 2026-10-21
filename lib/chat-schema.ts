import { z } from "zod";

export const PROVIDERS = [
  "ollama",
  "lmstudio",
  "openai",
  "anthropic",
  "google",
  "groq",
  "openrouter",
  "together",
  "mistral",
  "cohere",
  "huggingface",
  "replicate",
  "custom",
] as const;

export const createChatSchema = z.object({
  title: z.string().max(200).optional(),
  systemPrompt: z.string().max(20_000).optional(),
  defaultProvider: z.enum(PROVIDERS).default("ollama"),
  defaultModelId: z.string().optional(),
  toolServerIds: z.array(z.string()).optional(),
  knowledgeBaseIds: z.array(z.string()).max(20).optional(),
});
