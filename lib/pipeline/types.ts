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
  yield_mom_pct: number | null;
};

export type PropertyDetailRow = {
  listing_id: string;
  listing_nickname: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  prev_revenue: number | null;
  yield_mom_pct: number | null;
};

export type ChannelMixRow = {
  channel_label: string;
  total_revenue: number;
  revenue_share: number;
};

export type RiskScoreRow = {
  listing_id: string;
  listing_nickname: string;
  risk_score: number;
  negative_months_in_3m: number;
  revenue_vs_median_pct: number | null;
};

export type ForecastData = {
  predicted_revenue: number;
  lower_bound: number | null;
  upper_bound: number | null;
  model_used: string;
};

export type PipelineInput = {
  company_id: string;
  revenue_month: string;             // 'YYYY-MM-DD'
  property_count: number;            // total, before 10-property cap
  total_revenue: number;
  avg_revenue: number;
  min_revenue: number;
  max_revenue: number;
  portfolio_adr: number;
  total_nights: number;
  properties: PropertySummaryRow[];  // up to 10, sorted by revenue desc
  properties_data: PropertyDetailRow[]; // full list (or truncated) sorted by revenue asc
  channel_mix: ChannelMixRow[]; // portfolio-wide channel share for this month
  forecastMode?: boolean;            // when true, use predictive system prompt
  forecast?: ForecastData;           // ML forecast results (present when forecastMode=true)
  risk_data?: RiskScoreRow[];        // risk scores per property
  trend_data?: { revenue_month: string; total_revenue: number }[]; // last 12 months
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
