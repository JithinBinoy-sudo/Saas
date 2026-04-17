export type AIProviderName = 'openai' | 'anthropic' | 'google';

export const SUPPORTED_MODELS: Record<string, { provider: AIProviderName; displayName: string; preview?: boolean }> = {
  // OpenAI
  'gpt-4o':                          { provider: 'openai',    displayName: 'GPT-4o' },
  'gpt-4o-mini':                     { provider: 'openai',    displayName: 'GPT-4o mini' },
  // Anthropic
  'claude-3-5-sonnet-20241022':      { provider: 'anthropic', displayName: 'Claude 3.5 Sonnet' },
  'claude-3-haiku-20240307':         { provider: 'anthropic', displayName: 'Claude 3 Haiku' },
  // Google Gemini — 2.5 stable + 3.x preview
  'gemini-2.5-flash':                { provider: 'google',    displayName: 'Gemini 2.5 Flash' },
  'gemini-2.5-flash-lite':           { provider: 'google',    displayName: 'Gemini 2.5 Flash-Lite' },
  'gemini-3-flash-preview':          { provider: 'google',    displayName: 'Gemini 3 Flash',       preview: true },
  'gemini-3.1-flash-lite-preview':   { provider: 'google',    displayName: 'Gemini 3.1 Flash-Lite', preview: true },
};

export type PropertySummaryRow = {
  listing_id: string;
  listing_nickname: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
};

export type PipelineInput = {
  company_id: string;
  revenue_month: string;             // 'YYYY-MM-DD'
  property_count: number;            // total, before 10-property cap
  total_revenue: number;
  portfolio_adr: number;
  total_nights: number;
  properties: PropertySummaryRow[];  // up to 10, sorted by revenue desc
};

export type PipelineResult = {
  briefing_text: string;
  data_hash: string;
  model: string;
  provider: AIProviderName;
  prompt_tokens: number;
  completion_tokens: number;
};

export type PipelineRunStatus = 'pending' | 'running' | 'complete' | 'failed';
