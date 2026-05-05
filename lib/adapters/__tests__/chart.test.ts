import { toChartData } from '@/lib/adapters/chart';
import type { MonthlyPortfolioSummary, ForecastSeriesPoint } from '@/lib/analytics/types';

function summary(month: string, revenue: number): MonthlyPortfolioSummary {
  return {
    revenue_month: month,
    property_count: 5,
    total_nights: 100,
    total_revenue: revenue,
    portfolio_adr: 200,
  };
}

function fc(month: string, predicted: number, lower: number, upper: number): ForecastSeriesPoint {
  return {
    month,
    predicted_revenue: predicted,
    lower_bound: lower,
    upper_bound: upper,
    model_used: 'arima',
  };
}

describe('toChartData', () => {
  it('returns historical-only when forecast is empty', () => {
    const out = toChartData(
      [summary('2026-01-01', 1000), summary('2026-02-01', 1200)],
      []
    );
    expect(out).toEqual([
      { month: 'Jan', historical: 1000 },
      { month: 'Feb', historical: 1200 },
    ]);
  });

  it('includes a boundary point that bridges history and forecast', () => {
    const out = toChartData(
      [summary('2026-01-01', 1000), summary('2026-02-01', 1500)],
      [fc('2026-03-01', 1700, 1400, 2000)]
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ month: 'Jan', historical: 1000 });
    expect(out[1]).toEqual({
      month: 'Feb',
      historical: 1500,
      forecast: 1500,
      lower: 1500,
      upper: 1500,
      band: [1500, 1500],
    });
    expect(out[2]).toEqual({
      month: 'Mar',
      forecast: 1700,
      lower: 1400,
      upper: 2000,
      band: [1400, 2000],
    });
  });

  it('appends forecast tail when history is empty', () => {
    const out = toChartData([], [fc('2026-03-01', 1700, 1400, 2000)]);
    expect(out).toEqual([
      { month: 'Mar', forecast: 1700, lower: 1400, upper: 2000, band: [1400, 2000] },
    ]);
  });
});
