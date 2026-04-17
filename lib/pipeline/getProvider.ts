import type { AIProviderName } from './types';
import { SUPPORTED_MODELS } from './types';

export function inferProvider(model: string): AIProviderName {
  const entry = SUPPORTED_MODELS[model];
  if (!entry) throw new Error(`Unsupported model: ${model}`);
  return entry.provider;
}

export function getApiKeyForProvider(
  provider: AIProviderName,
  company: { openai_api_key?: string | null; anthropic_api_key?: string | null; google_api_key?: string | null }
): string | null {
  const map: Record<AIProviderName, string | null | undefined> = {
    openai:    company.openai_api_key,
    anthropic: company.anthropic_api_key,
    google:    company.google_api_key,
  };
  return map[provider] ?? null;
}
