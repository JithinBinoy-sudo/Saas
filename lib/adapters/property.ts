import type { PropertyMonthRow } from '@/lib/analytics/types';
import { classifyRisk, type Risk } from '@/lib/adapters/risk';

export type Property = {
  id: string;
  revenue: number;
  vsMedian: number;
  nights: number;
  adr: number;
  vsPrev: number;
  risk: Risk;
};

function safePct(numerator: number | null, denominator: number | null): number {
  if (numerator == null || denominator == null || denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function toProperty(row: PropertyMonthRow): Property {
  const median = row.portfolio_median_revenue;
  const vsMedian =
    median != null && median !== 0 ? ((row.revenue - median) / median) * 100 : 0;

  const vsPrev =
    row.revenue_delta != null
      ? safePct(row.revenue_delta, row.revenue - row.revenue_delta)
      : 0;

  return {
    id: row.listing_nickname?.trim() || row.listing_id,
    revenue: row.revenue,
    vsMedian,
    nights: row.occupied_nights,
    adr: row.adr,
    vsPrev,
    risk: classifyRisk(row),
  };
}

export function toProperties(rows: PropertyMonthRow[]): Property[] {
  return rows.map(toProperty);
}
