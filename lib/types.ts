// LLM Provider Types
export type LLMProvider =
  | "ollama"
  | "lmstudio"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "openrouter"
  | "together"
  | "mistral"
  | "cohere"
  | "custom";

export type ProviderType = "local" | "remote";

export interface LLMProviderConfig {
  name: string;
  type: ProviderType;
  baseUrl: string;
  healthEndpoint: string;
  modelsEndpoint: string;
  chatCompletionsEndpoint?: string;
  completionsEndpoint?: string;
  embeddingsEndpoint?: string;
  responsesEndpoint?: string;
  requiresApiKey?: boolean;
  apiKeyEnvVar?: string;
  defaultHeaders?: Record<string, string>;
  usesQueryParamAuth?: boolean; // For providers like Google that use ?key=API_KEY
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  size?: string;
  modified?: string;
  isReasoning?: boolean;
}

export interface LLMProviderStatus {
  provider: LLMProvider;
  connected: boolean;
  models: LLMModel[];
  error?: string;
  type: ProviderType;
  requiresApiKey?: boolean;
  hasApiKey?: boolean;
}

export interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  type: ProviderType;
  enabled: boolean;
}

// MCP Types
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  repository?: string;
  installed: boolean;
  enabled: boolean;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  tokensIn?: number;
  tokensOut?: number;
}

export interface ToolCall {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

// Dataset Types
export interface Dataset {
  id: string;
  name: string;
  type: "csv" | "parquet";
  size: number;
  rows?: number;
  columns?: string[];
  uploadedAt: Date;
  indexed: boolean;
}
