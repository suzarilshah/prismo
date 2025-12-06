/**
 * AI Client Types
 * 
 * Type definitions for AI provider abstraction layer.
 * Supports OpenAI, Azure AI Foundry, and Anthropic.
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'azure_foundry' | 'anthropic';

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string; // For function messages
}

/**
 * Chat completion options
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  responseFormat?: 'text' | 'json_object';
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Chat completion response
 */
export interface ChatResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  usage: TokenUsage;
  model: string;
  latencyMs: number;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  content: string;
  isComplete: boolean;
  finishReason?: ChatResponse['finishReason'];
}

/**
 * Structured output schema (for JSON mode)
 */
export interface StructuredOutputSchema<T> {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  parse: (json: string) => T;
}

/**
 * AI Client configuration
 */
export interface AIClientConfig {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  endpoint?: string; // For Azure
  apiVersion?: string; // For Azure
  defaultOptions?: ChatOptions;
}

/**
 * AI Client interface
 */
export interface AIClient {
  readonly provider: AIProvider;
  readonly modelName: string;

  /**
   * Send a chat completion request
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Send a chat completion request with streaming
   */
  chatStream?(
    messages: ChatMessage[],
    options?: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatResponse>;

  /**
   * Get structured output (JSON mode)
   */
  chatStructured?<T>(
    messages: ChatMessage[],
    schema: StructuredOutputSchema<T>,
    options?: ChatOptions
  ): Promise<T>;

  /**
   * Test the connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Estimate tokens for messages
   */
  estimateTokens?(messages: ChatMessage[]): number;
}

/**
 * Error types for AI operations
 */
export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: AIProvider,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class RateLimitError extends AIClientError {
  constructor(provider: AIProvider, retryAfterMs?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ''}`,
      'RATE_LIMIT',
      provider,
      true
    );
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AIClientError {
  constructor(provider: AIProvider) {
    super(
      `Authentication failed for ${provider}. Check your API key.`,
      'AUTH_FAILED',
      provider,
      false
    );
    this.name = 'AuthenticationError';
  }
}

export class ModelNotFoundError extends AIClientError {
  constructor(provider: AIProvider, modelName: string) {
    super(
      `Model '${modelName}' not found for ${provider}`,
      'MODEL_NOT_FOUND',
      provider,
      false
    );
    this.name = 'ModelNotFoundError';
  }
}

export class ContentFilterError extends AIClientError {
  constructor(provider: AIProvider) {
    super(
      `Content was filtered by ${provider} safety systems`,
      'CONTENT_FILTERED',
      provider,
      false
    );
    this.name = 'ContentFilterError';
  }
}
