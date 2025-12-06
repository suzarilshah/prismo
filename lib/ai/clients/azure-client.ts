/**
 * Azure OpenAI Client
 * 
 * Implementation of AIClient for Azure AI Foundry / Azure OpenAI Service.
 * Supports GPT-4, GPT-4o, GPT-35-turbo deployments.
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
} from './types';

const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const DEFAULT_API_VERSION = '2024-02-01';

export class AzureOpenAIClient implements AIClient {
  readonly provider = 'azure_foundry' as const;
  readonly modelName: string;

  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly apiVersion: string;
  private readonly defaultOptions: ChatOptions;

  constructor(config: AIClientConfig) {
    if (!config.endpoint) {
      throw new AIClientError(
        'Azure endpoint is required',
        'CONFIG_ERROR',
        'azure_foundry'
      );
    }

    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.endpoint = config.endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...config.defaultOptions };
  }

  /**
   * Build the Azure OpenAI API URL
   */
  private buildUrl(): string {
    return `${this.endpoint}/openai/deployments/${this.modelName}/chat/completions?api-version=${this.apiVersion}`;
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      const response = await fetch(this.buildUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
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
        finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
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
        `Azure OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      const response = await fetch(this.buildUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
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
            finishReason = this.mapFinishReason(parsed.choices[0]?.finish_reason) || finishReason;

            if (onChunk) {
              onChunk({
                content,
                isComplete: !!parsed.choices[0]?.finish_reason,
                finishReason: this.mapFinishReason(parsed.choices[0]?.finish_reason),
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
          promptTokens: 0,
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
        `Azure OpenAI streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const totalChars = messages.reduce(
      (sum, m) => sum + m.content.length + (m.role.length * 2),
      0
    );
    return Math.ceil(totalChars / 4);
  }

  /**
   * Map Azure finish reasons to standard format
   */
  private mapFinishReason(reason?: string): ChatResponse['finishReason'] {
    if (!reason) return null;
    
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'function_call':
        return 'function_call';
      default:
        return null;
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;

    switch (response.status) {
      case 401:
      case 403:
        throw new AuthenticationError(this.provider);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError(
          this.provider,
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        );
      case 400:
        if (errorMessage.includes('content_filter') || errorData.error?.code === 'content_filter') {
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
