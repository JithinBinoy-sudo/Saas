import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MonthlyPortfolioSummary,
  PropertyMonthRow,
  ChannelMixRow,
  DashboardData,
} from './types';

export async function fetchAvailableMonths(
  client: SupabaseClient,
  companyId?: string
): Promise<string[]> {
  let query = client
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .order('revenue_month', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data.map((r: { revenue_month: string }) => r.revenue_month);
}

export async function fetchMonthlySummary(
  client: SupabaseClient,
  month: string,
  companyId?: string
): Promise<MonthlyPortfolioSummary | null> {
  let query = client
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('revenue_month', month);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data as MonthlyPortfolioSummary;
}

export async function fetchTrendData(
  client: SupabaseClient,
  months: string[],
  companyId?: string
): Promise<MonthlyPortfolioSummary[]> {
  const last12 = months.slice(0, 12);
  if (last12.length === 0) return [];

  let query = client
    .from('monthly_portfolio_summary')
    .select('*')
    .in('revenue_month', last12)
    .order('revenue_month', { ascending: true });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data as MonthlyPortfolioSummary[];
}

export async function fetchPropertyRows(
  client: SupabaseClient,
  month: string,
  companyId?: string
): Promise<PropertyMonthRow[]> {
  let query = client
    .from('final_reporting_gold')
    .select('*')
    .eq('revenue_month', month)
    .order('revenue', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data as PropertyMonthRow[];
}

export async function fetchChannelMix(
  client: SupabaseClient,
  companyId?: string
): Promise<ChannelMixRow[]> {
  let query = client
    .from('channel_mix_summary')
    .select('*')
    .order('total_revenue', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data as ChannelMixRow[];
}

/** Convenience: fetch everything the dashboard needs in parallel. */
export async function fetchDashboardData(
  client: SupabaseClient,
  companyId?: string,
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
    };
  }

  const selectedMonth =
    requestedMonth && availableMonths.includes(requestedMonth)
      ? requestedMonth
      : availableMonths[0];

  const priorIdx = availableMonths.indexOf(selectedMonth) + 1;
  const priorMonth =
    priorIdx < availableMonths.length ? availableMonths[priorIdx] : null;

  const [summary, priorSummary, trendData, properties, channelMix] =
    await Promise.all([
      fetchMonthlySummary(client, selectedMonth, companyId),
      priorMonth
        ? fetchMonthlySummary(client, priorMonth, companyId)
        : Promise.resolve(null),
      fetchTrendData(client, availableMonths, companyId),
      fetchPropertyRows(client, selectedMonth, companyId),
      fetchChannelMix(client, companyId),
    ]);

  return {
    availableMonths,
    selectedMonth,
    summary,
    priorSummary,
    trendData,
    properties,
    channelMix,
  };
}
