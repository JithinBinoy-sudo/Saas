import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MonthlyPortfolioSummary,
  PropertyMonthRow,
  ChannelMixRow,
  ForecastSeriesPoint,
  DashboardData,
} from './types';

export async function fetchAvailableMonths(
  client: SupabaseClient,
  companyId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', companyId)
    .order('revenue_month', { ascending: false });

  if (error || !data) return [];
  return data.map((r: { revenue_month: string }) => r.revenue_month);
}

export async function fetchMonthlySummary(
  client: SupabaseClient,
  month: string,
  companyId: string
): Promise<MonthlyPortfolioSummary | null> {
  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('revenue_month', month)
    .eq('company_id', companyId)
    .single();

  if (error || !data) return null;
  return data as MonthlyPortfolioSummary;
}

export async function fetchTrendData(
  client: SupabaseClient,
  months: string[],
  companyId: string
): Promise<MonthlyPortfolioSummary[]> {
  const last12 = months.slice(0, 12);
  if (last12.length === 0) return [];

  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('*')
    .in('revenue_month', last12)
    .eq('company_id', companyId)
    .order('revenue_month', { ascending: true });

  if (error || !data) return [];
  return data as MonthlyPortfolioSummary[];
}

export async function fetchPropertyRows(
  client: SupabaseClient,
  month: string,
  companyId: string
): Promise<PropertyMonthRow[]> {
  // Fetch base property data from final_reporting_gold
  const { data: goldData, error: goldError } = await client
    .from('final_reporting_gold')
    .select('*')
    .eq('revenue_month', month)
    .eq('company_id', companyId)
    .order('revenue', { ascending: false });

  if (goldError || !goldData) return [];

  // Fetch risk scores for the same month
  const { data: riskData } = await client
    .from('property_risk_score_silver')
    .select('listing_id, risk_score')
    .eq('revenue_month', month)
    .eq('company_id', companyId);

  // Build a lookup map for risk scores
  const riskMap = new Map<string, number>();
  if (riskData) {
    for (const r of riskData) {
      riskMap.set(r.listing_id, r.risk_score);
    }
  }

  // Merge risk_score into property rows
  return goldData.map((row: Record<string, unknown>) => ({
    ...row,
    risk_score: riskMap.get(row.listing_id as string) ?? null,
  })) as PropertyMonthRow[];
}

export async function fetchChannelMix(
  client: SupabaseClient,
  companyId: string
): Promise<ChannelMixRow[]> {
  const { data, error } = await client
    .from('channel_mix_summary')
    .select('*')
    .eq('company_id', companyId)
    .order('total_revenue', { ascending: false });

  if (error || !data) return [];
  return data as ChannelMixRow[];
}

/** Fetch month-by-month forecast series (portfolio-level sum of predicted revenues). */
export async function fetchForecastSeries(
  client: SupabaseClient,
  companyId: string,
  afterMonth: string,
  limitMonths = 12
): Promise<ForecastSeriesPoint[]> {
  type RevenueForecastRow = {
    forecast_month: string;
    predicted_revenue: number | string;
    lower_bound: number | string | null;
    upper_bound: number | string | null;
    model_used: 'prophet' | 'arima' | string;
  };

  const { data, error } = await client
    .from('revenue_forecasts')
    .select('forecast_month, predicted_revenue, lower_bound, upper_bound, model_used')
    .eq('company_id', companyId)
    .gt('forecast_month', afterMonth)
    .order('forecast_month', { ascending: true })
    .limit(Math.max(1, limitMonths) * 500); // defensive: many listings per month

  if (error || !data || data.length === 0) return [];

  // Group by month, sum across listings for a portfolio-level forecast series
  const byMonth = new Map<
    string,
    {
      totalPredicted: number;
      totalLower: number;
      totalUpper: number;
      hasLower: boolean;
      hasUpper: boolean;
      modelUsed: 'prophet' | 'arima';
    }
  >();

  for (const r of data as RevenueForecastRow[]) {
    const m = String(r.forecast_month);
    const cur =
      byMonth.get(m) ??
      ({
        totalPredicted: 0,
        totalLower: 0,
        totalUpper: 0,
        hasLower: true,
        hasUpper: true,
        modelUsed: (r.model_used as 'prophet' | 'arima') ?? 'prophet',
      } as const);

    const next = {
      totalPredicted: cur.totalPredicted + Number(r.predicted_revenue ?? 0),
      totalLower:
        r.lower_bound != null ? cur.totalLower + Number(r.lower_bound) : cur.totalLower,
      totalUpper:
        r.upper_bound != null ? cur.totalUpper + Number(r.upper_bound) : cur.totalUpper,
      hasLower: cur.hasLower && r.lower_bound != null,
      hasUpper: cur.hasUpper && r.upper_bound != null,
      modelUsed: cur.modelUsed ?? ((r.model_used as 'prophet' | 'arima') ?? 'prophet'),
    };
    byMonth.set(m, next);
  }

  const series = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, limitMonths))
    .map(([month, agg]) => ({
      month,
      predicted_revenue: agg.totalPredicted,
      lower_bound: agg.hasLower ? agg.totalLower : null,
      upper_bound: agg.hasUpper ? agg.totalUpper : null,
      model_used: agg.modelUsed,
    }));

  return series;
}

/** Convenience: fetch everything the dashboard needs in parallel. */
export async function fetchDashboardData(
  client: SupabaseClient,
  companyId: string,
  requestedMonth?: string
): Promise<DashboardData> {
  const availableMonths = await fetchAvailableMonths(client, companyId);

  if (availableMonths.length === 0) {
    return {
      availableMonths: [],
      selectedMonth: '',
      summary: null,
      priorSummary: null,
      trendData: [],
      properties: [],
      channelMix: [],
      forecastSeries: [],
    };
  }

  const selectedMonth =
    requestedMonth && availableMonths.includes(requestedMonth)
      ? requestedMonth
      : availableMonths[0];

  const priorIdx = availableMonths.indexOf(selectedMonth) + 1;
  const priorMonth =
    priorIdx < availableMonths.length ? availableMonths[priorIdx] : null;

  const [summary, priorSummary, trendData, properties, channelMix, forecastSeries] =
    await Promise.all([
      fetchMonthlySummary(client, selectedMonth, companyId),
      priorMonth
        ? fetchMonthlySummary(client, priorMonth, companyId)
        : Promise.resolve(null),
      fetchTrendData(client, availableMonths, companyId),
      fetchPropertyRows(client, selectedMonth, companyId),
      fetchChannelMix(client, companyId),
      fetchForecastSeries(client, companyId, selectedMonth, 3),
    ]);

  return {
    availableMonths,
    selectedMonth,
    summary,
    priorSummary,
    trendData,
    properties,
    channelMix,
    forecastSeries,
  };
}
