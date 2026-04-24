export type MonthlyPortfolioSummary = {
  revenue_month: string; // 'YYYY-MM-DD'
  property_count: number;
  total_nights: number;
  total_revenue: number;
  portfolio_adr: number;
};

export type PropertyMonthRow = {
  listing_id: string;
  listing_nickname: string;
  revenue_month: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
  nights_delta: number | null;
  adr_delta: number | null;
  portfolio_median_revenue: number | null;
  portfolio_median_adr: number | null;
  risk_score: number | null;
};

export type ChannelMixRow = {
  channel_label: string;
  total_nights: number;
  total_revenue: number;
  revenue_share: number;
};

export type ForecastPoint = {
  month: string;
  predicted_revenue: number;
  lower_bound: number | null;
  upper_bound: number | null;
  model_used: 'prophet' | 'arima';
};

export type DashboardData = {
  availableMonths: string[]; // sorted descending, 'YYYY-MM-DD'
  selectedMonth: string; // 'YYYY-MM-DD'
  summary: MonthlyPortfolioSummary | null;
  priorSummary: MonthlyPortfolioSummary | null;
  trendData: MonthlyPortfolioSummary[]; // last 12 months for chart
  properties: PropertyMonthRow[];
  channelMix: ChannelMixRow[];
  forecastPoint: ForecastPoint | null;
};
