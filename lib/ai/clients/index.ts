/**
 * AI Clients Index
 * 
 * Factory functions and exports for AI provider clients.
 */

export * from './types';
export { OpenAIClient } from './openai-client';
export { AzureOpenAIClient } from './azure-client';
export { AnthropicClient } from './anthropic-client';

import { AIClient, AIClientConfig, AIProvider, AIClientError } from './types';
import { OpenAIClient } from './openai-client';
import { AzureOpenAIClient } from './azure-client';
import { AnthropicClient } from './anthropic-client';
import { decryptApiKey } from '../security';

/**
 * Create an AI client based on configuration
 */
export function createAIClient(config: AIClientConfig): AIClient {
  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config);
    case 'azure_foundry':
      return new AzureOpenAIClient(config);
    case 'anthropic':
      return new AnthropicClient(config);
    default:
      throw new AIClientError(
        `Unsupported provider: ${config.provider}`,
        'UNSUPPORTED_PROVIDER',
        config.provider as AIProvider,
        false
      );
  }
}

/**
 * Create an AI client from database settings
 */
export function createAIClientFromSettings(settings: {
  provider: AIProvider;
  modelEndpoint?: string | null;
  modelName?: string | null;
  apiKeyEncrypted?: string | null;
  temperature?: number;
  maxTokens?: number;
}): AIClient {
  if (!settings.apiKeyEncrypted) {
    throw new AIClientError(
      'API key not configured',
      'NO_API_KEY',
      settings.provider,
      false
    );
  }

  if (!settings.modelName) {
    throw new AIClientError(
      'Model name not configured',
      'NO_MODEL',
      settings.provider,
      false
    );
  }

  // Decrypt the API key
  const apiKey = decryptApiKey(settings.apiKeyEncrypted);

  const config: AIClientConfig = {
    provider: settings.provider,
    apiKey,
    modelName: settings.modelName,
    endpoint: settings.modelEndpoint || undefined,
    defaultOptions: {
      temperature: settings.temperature ?? 0.7,
      maxTokens: settings.maxTokens ?? 2048,
    },
  };

  return createAIClient(config);
}

/**
 * Get recommended models for each provider
 */
export const RECOMMENDED_MODELS: Record<AIProvider, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  azure_foundry: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4',
    'gpt-35-turbo',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
};

/**
 * Get provider display name
 */
export const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  openai: 'OpenAI',
  azure_foundry: 'Azure AI Foundry',
  anthropic: 'Anthropic Claude',
};

/**
 * Get provider configuration requirements
 */
export const PROVIDER_REQUIREMENTS: Record<AIProvider, {
  needsEndpoint: boolean;
  endpointPlaceholder?: string;
  apiKeyPlaceholder: string;
}> = {
  openai: {
    needsEndpoint: false,
    apiKeyPlaceholder: 'sk-...',
  },
  azure_foundry: {
    needsEndpoint: true,
    endpointPlaceholder: 'https://your-resource.openai.azure.com',
    apiKeyPlaceholder: 'Your Azure API key',
  },
  anthropic: {
    needsEndpoint: false,
    apiKeyPlaceholder: 'sk-ant-...',
  },
};
