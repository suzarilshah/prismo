/**
 * Anthropic Client
 * 
 * Implementation of AIClient for Anthropic Claude models.
 * Supports Claude 3 Opus, Sonnet, Haiku.
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
} from './types';

const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
};

const ANTHROPIC_API_VERSION = '2023-06-01';

export class AnthropicClient implements AIClient {
  readonly provider = 'anthropic' as const;
  readonly modelName: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultOptions: ChatOptions;

  constructor(config: AIClientConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...config.defaultOptions };
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   */
  private convertMessages(messages: ChatMessage[]): { system?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Anthropic requires alternating user/assistant messages
    // and must start with a user message
    const normalizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (let i = 0; i < anthropicMessages.length; i++) {
      const msg = anthropicMessages[i];
      const prevMsg = normalizedMessages[normalizedMessages.length - 1];

      if (prevMsg && prevMsg.role === msg.role) {
        // Merge consecutive same-role messages
        prevMsg.content += '\n\n' + msg.content;
      } else {
        normalizedMessages.push(msg);
      }
    }

    return { system, messages: normalizedMessages };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: mergedOptions.maxTokens,
          ...(system && { system }),
          messages: anthropicMessages,
          temperature: mergedOptions.temperature,
          top_p: mergedOptions.topP,
          ...(mergedOptions.stop && { stop_sequences: mergedOptions.stop }),
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      // Extract text content from Anthropic response
      const content = data.content
        ?.filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n') || '';

      return {
        content,
        finishReason: this.mapStopReason(data.stop_reason),
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        model: data.model || this.modelName,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      throw new AIClientError(
        `Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: mergedOptions.maxTokens,
          ...(system && { system }),
          messages: anthropicMessages,
          temperature: mergedOptions.temperature,
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
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullContent += parsed.delta.text;
              if (onChunk) {
                onChunk({
                  content: parsed.delta.text,
                  isComplete: false,
                });
              }
            } else if (parsed.type === 'message_delta') {
              finishReason = this.mapStopReason(parsed.delta?.stop_reason);
              outputTokens = parsed.usage?.output_tokens || outputTokens;
            } else if (parsed.type === 'message_start') {
              inputTokens = parsed.message?.usage?.input_tokens || 0;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      if (onChunk) {
        onChunk({ content: '', isComplete: true, finishReason });
      }

      const latencyMs = Date.now() - startTime;

      return {
        content: fullContent,
        finishReason,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        model: this.modelName,
        latencyMs,
      };
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      throw new AIClientError(
        `Anthropic streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        content: `You must respond with ONLY valid JSON matching this schema. No other text or explanation:\n${JSON.stringify(schema.schema, null, 2)}`,
      },
      ...messages,
      {
        role: 'user',
        content: 'Respond with JSON only. No markdown, no explanation.',
      },
    ];

    const response = await this.chat(enhancedMessages, options);

    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      return schema.parse(jsonStr.trim());
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
    // Claude uses similar tokenization to GPT
    const totalChars = messages.reduce(
      (sum, m) => sum + m.content.length + (m.role.length * 2),
      0
    );
    return Math.ceil(totalChars / 4);
  }

  /**
   * Map Anthropic stop reasons to standard format
   */
  private mapStopReason(reason?: string): ChatResponse['finishReason'] {
    if (!reason) return null;

    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
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
        throw new AuthenticationError(this.provider);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError(
          this.provider,
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        );
      case 400:
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
