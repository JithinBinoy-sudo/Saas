import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MonthlyPortfolioSummary,
  PropertyMonthRow,
  ChannelMixRow,
  ForecastPoint,
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

/** Fetch the latest forecast point (portfolio-level sum of predicted revenues). */
export async function fetchForecastPoint(
  client: SupabaseClient,
  companyId: string
): Promise<ForecastPoint | null> {
  // Get the most recent forecast month for this company
  const { data, error } = await client
    .from('revenue_forecasts')
    .select('forecast_month, predicted_revenue, lower_bound, upper_bound, model_used')
    .eq('company_id', companyId)
    .order('forecast_month', { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Find the latest forecast_month
  const latestMonth = data[0].forecast_month;

  // Sum across all listings for that month (portfolio-level forecast)
  const monthRows = data.filter(
    (r: { forecast_month: string }) => r.forecast_month === latestMonth
  );

  let totalPredicted = 0;
  let totalLower = 0;
  let totalUpper = 0;
  let hasLower = true;
  let hasUpper = true;
  let modelUsed: 'prophet' | 'arima' = 'prophet';

  for (const r of monthRows) {
    totalPredicted += Number(r.predicted_revenue);
    if (r.lower_bound != null) {
      totalLower += Number(r.lower_bound);
    } else {
      hasLower = false;
    }
    if (r.upper_bound != null) {
      totalUpper += Number(r.upper_bound);
    } else {
      hasUpper = false;
    }
    // Use the model from the majority — simplified to use the first row's model
    modelUsed = r.model_used as 'prophet' | 'arima';
  }

  return {
    month: latestMonth,
    predicted_revenue: totalPredicted,
    lower_bound: hasLower ? totalLower : null,
    upper_bound: hasUpper ? totalUpper : null,
    model_used: modelUsed,
  };
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
      forecastPoint: null,
    };
  }

  const selectedMonth =
    requestedMonth && availableMonths.includes(requestedMonth)
      ? requestedMonth
      : availableMonths[0];

  const priorIdx = availableMonths.indexOf(selectedMonth) + 1;
  const priorMonth =
    priorIdx < availableMonths.length ? availableMonths[priorIdx] : null;

  const [summary, priorSummary, trendData, properties, channelMix, forecastPoint] =
    await Promise.all([
      fetchMonthlySummary(client, selectedMonth, companyId),
      priorMonth
        ? fetchMonthlySummary(client, priorMonth, companyId)
        : Promise.resolve(null),
      fetchTrendData(client, availableMonths, companyId),
      fetchPropertyRows(client, selectedMonth, companyId),
      fetchChannelMix(client, companyId),
      fetchForecastPoint(client, companyId),
    ]);

  return {
    availableMonths,
    selectedMonth,
    summary,
    priorSummary,
    trendData,
    properties,
    channelMix,
    forecastPoint,
  };
}
