import type { MonthlyPortfolioSummary } from '@/lib/analytics/types';

export type KpiData = {
  revenue: { value: number; deltaPct: number | null };
  adr: { value: number; deltaPct: number | null };
  nights: { value: number; deltaPct: number | null };
  propertyCount: number;
};

function pctDelta(current: number, prior: number | null | undefined): number | null {
  if (prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function toKpis(
  summary: MonthlyPortfolioSummary | null,
  prior: MonthlyPortfolioSummary | null
): KpiData {
  const revenue = summary?.total_revenue ?? 0;
  const adr = summary?.portfolio_adr ?? 0;
  const nights = summary?.total_nights ?? 0;
  const propertyCount = summary?.property_count ?? 0;

  return {
    revenue: { value: revenue, deltaPct: pctDelta(revenue, prior?.total_revenue) },
    adr: { value: adr, deltaPct: pctDelta(adr, prior?.portfolio_adr) },
    nights: { value: nights, deltaPct: pctDelta(nights, prior?.total_nights) },
    propertyCount,
  };
}
