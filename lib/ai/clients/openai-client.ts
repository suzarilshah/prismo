/**
 * OpenAI Client
 * 
 * Implementation of AIClient for OpenAI and Azure OpenAI.
 * Supports GPT-4, GPT-4o, GPT-3.5-turbo models.
 */

import {
  AIClient,
  AIClientConfig,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  StructuredOutputSchema,
  AIClientError,
  AuthenticationError,
  RateLimitError,
  ContentFilterError,
  ModelNotFoundError,
} from './types';

const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export class OpenAIClient implements AIClient {
  readonly provider = 'openai' as const;
  readonly modelName: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultOptions: ChatOptions;

  constructor(config: AIClientConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.baseUrl = 'https://api.openai.com/v1';
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...config.defaultOptions };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.name && { name: m.name }),
          })),
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          top_p: mergedOptions.topP,
          frequency_penalty: mergedOptions.frequencyPenalty,
          presence_penalty: mergedOptions.presencePenalty,
          ...(mergedOptions.stop && { stop: mergedOptions.stop }),
          ...(mergedOptions.responseFormat === 'json_object' && {
            response_format: { type: 'json_object' },
          }),
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.choices[0]?.message?.content || '',
        finishReason: data.choices[0]?.finish_reason || null,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.modelName,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      throw new AIClientError(
        `OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REQUEST_FAILED',
        this.provider,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Send a chat completion request with streaming
   */
  async chatStream(
    messages: ChatMessage[],
    options?: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: mergedOptions.temperature,
          max_tokens: mergedOptions.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIClientError('No response body', 'NO_BODY', this.provider);
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let finishReason: ChatResponse['finishReason'] = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            fullContent += content;
            finishReason = parsed.choices[0]?.finish_reason || finishReason;

            if (onChunk) {
              onChunk({
                content,
                isComplete: !!parsed.choices[0]?.finish_reason,
                finishReason: parsed.choices[0]?.finish_reason,
              });
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      return {
        content: fullContent,
        finishReason,
        usage: {
          promptTokens: 0, // Not available in streaming mode
          completionTokens: 0,
          totalTokens: 0,
        },
        model: this.modelName,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      throw new AIClientError(
        `OpenAI streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_FAILED',
        this.provider,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get structured output (JSON mode)
   */
  async chatStructured<T>(
    messages: ChatMessage[],
    schema: StructuredOutputSchema<T>,
    options?: ChatOptions
  ): Promise<T> {
    // Add JSON schema instruction to the system message
    const enhancedMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You must respond with valid JSON matching this schema: ${JSON.stringify(schema.schema)}`,
      },
      ...messages,
    ];

    const response = await this.chat(enhancedMessages, {
      ...options,
      responseFormat: 'json_object',
    });

    try {
      return schema.parse(response.content);
    } catch (error) {
      throw new AIClientError(
        `Failed to parse structured response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARSE_ERROR',
        this.provider,
        false
      );
    }
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'user', content: 'Say "OK" to confirm connection.' },
      ], { maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate tokens for messages
   */
  estimateTokens(messages: ChatMessage[]): number {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce(
      (sum, m) => sum + m.content.length + (m.role.length * 2),
      0
    );
    return Math.ceil(totalChars / 4);
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(this.provider);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError(
          this.provider,
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        );
      case 404:
        throw new ModelNotFoundError(this.provider, this.modelName);
      case 400:
        if (errorMessage.includes('content_filter')) {
          throw new ContentFilterError(this.provider);
        }
        throw new AIClientError(errorMessage, 'BAD_REQUEST', this.provider, false);
      default:
        throw new AIClientError(
          errorMessage,
          `HTTP_${response.status}`,
          this.provider,
          response.status >= 500
        );
    }
  }
}
