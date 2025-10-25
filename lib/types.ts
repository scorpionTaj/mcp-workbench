// LLM Provider Types
export type LLMProvider = "ollama" | "lmstudio";

export interface LLMProviderConfig {
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  modelsEndpoint: string;
  chatCompletionsEndpoint?: string;
  completionsEndpoint?: string;
  embeddingsEndpoint?: string;
  responsesEndpoint?: string;
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
