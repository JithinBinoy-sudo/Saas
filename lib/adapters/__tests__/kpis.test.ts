import { toKpis } from '@/lib/adapters/kpis';
import type { MonthlyPortfolioSummary } from '@/lib/analytics/types';

function summary(overrides: Partial<MonthlyPortfolioSummary> = {}): MonthlyPortfolioSummary {
  return {
    revenue_month: '2026-04-01',
    property_count: 7,
    total_nights: 100,
    total_revenue: 10000,
    portfolio_adr: 100,
    ...overrides,
  };
}

describe('toKpis', () => {
  it('zeros out values when summary is null', () => {
    const k = toKpis(null, null);
    expect(k.revenue.value).toBe(0);
    expect(k.adr.value).toBe(0);
    expect(k.nights.value).toBe(0);
    expect(k.propertyCount).toBe(0);
    expect(k.revenue.deltaPct).toBeNull();
  });

  it('computes percent deltas vs prior', () => {
    const k = toKpis(summary({ total_revenue: 12000 }), summary({ total_revenue: 10000 }));
    expect(k.revenue.deltaPct).toBeCloseTo(20);
  });

  it('returns null delta when prior is null or zero', () => {
    expect(toKpis(summary(), summary({ total_revenue: 0 })).revenue.deltaPct).toBeNull();
    expect(toKpis(summary(), null).revenue.deltaPct).toBeNull();
  });
});
