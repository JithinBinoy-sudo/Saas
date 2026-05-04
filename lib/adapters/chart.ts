import type {
  MonthlyPortfolioSummary,
  ForecastSeriesPoint,
} from '@/lib/analytics/types';

export type ChartPoint = {
  month: string;
  historical?: number | null;
  forecast?: number | null;
  lower?: number | null;
  upper?: number | null;
};

function shortMonthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export function toChartData(
  trend: MonthlyPortfolioSummary[],
  forecast: ForecastSeriesPoint[]
): ChartPoint[] {
  const historical: ChartPoint[] = trend.map((d) => ({
    month: shortMonthLabel(d.revenue_month),
    historical: d.total_revenue,
  }));

  if (forecast.length === 0) return historical;

  const last = trend[trend.length - 1];
  const lastValue = last?.total_revenue ?? null;
  const lastIso = last?.revenue_month ?? null;

  // Boundary point: connect history to forecast at the last actual month so the
  // ribbon and dashed line don't float disconnected. The forecast/historical
  // overlap on this month ensures recharts draws a continuous transition.
  const boundary: ChartPoint | null =
    lastValue != null && lastIso != null
      ? {
          month: shortMonthLabel(lastIso),
          historical: lastValue,
          forecast: lastValue,
          lower: lastValue,
          upper: lastValue,
        }
      : null;

  const tail: ChartPoint[] = forecast.map((p) => ({
    month: shortMonthLabel(p.month),
    forecast: p.predicted_revenue,
    lower: p.lower_bound,
    upper: p.upper_bound,
  }));

  if (boundary) {
    // Replace the last historical point with the boundary so the chart joins.
    return [...historical.slice(0, -1), boundary, ...tail];
  }

  return [...historical, ...tail];
}
