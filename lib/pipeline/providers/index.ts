import type { AIProvider } from './interface';
import type { AIProviderName } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';

export function createProvider(provider: AIProviderName, apiKey: string): AIProvider {
  switch (provider) {
    case 'openai':    return new OpenAIProvider(apiKey);
    case 'anthropic': return new AnthropicProvider(apiKey);
    case 'google':    return new GoogleProvider(apiKey);
  }
}
