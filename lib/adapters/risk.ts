import type { PropertyMonthRow } from '@/lib/analytics/types';

export type Risk = 'High' | 'Medium' | 'Low';

function vsMedianPct(row: PropertyMonthRow): number | null {
  const median = row.portfolio_median_revenue;
  if (median == null || median === 0) return null;
  return ((row.revenue - median) / median) * 100;
}

function vsPrevPct(row: PropertyMonthRow): number | null {
  if (row.revenue_delta == null) return null;
  const prior = row.revenue - row.revenue_delta;
  if (prior <= 0) return null;
  return (row.revenue_delta / prior) * 100;
}

export function classifyRisk(row: PropertyMonthRow): Risk {
  const median = vsMedianPct(row);
  const prev = vsPrevPct(row);
  if ((median != null && median < -50) || (prev != null && prev < -40)) return 'High';
  if ((median != null && median < -10) || (prev != null && prev < -15)) return 'Medium';
  return 'Low';
}
