import { toProperty, toProperties } from '@/lib/adapters/property';
import type { PropertyMonthRow } from '@/lib/analytics/types';

function row(overrides: Partial<PropertyMonthRow> = {}): PropertyMonthRow {
  return {
    listing_id: 'NYC-007',
    listing_nickname: 'NYC-007',
    revenue_month: '2026-04-01',
    revenue: 1000,
    occupied_nights: 5,
    adr: 200,
    revenue_delta: 0,
    nights_delta: 0,
    adr_delta: 0,
    portfolio_median_revenue: 1000,
    portfolio_median_adr: 200,
    risk_score: null,
    ...overrides,
  };
}

describe('toProperty', () => {
  it('uses nickname when present, otherwise listing_id', () => {
    expect(toProperty(row({ listing_nickname: 'Cozy Loft' })).id).toBe('Cozy Loft');
    expect(toProperty(row({ listing_nickname: '   ' })).id).toBe('NYC-007');
  });

  it('computes vsMedian as percent of median', () => {
    const p = toProperty(row({ revenue: 800, portfolio_median_revenue: 1000 }));
    expect(p.vsMedian).toBeCloseTo(-20);
  });

  it('returns 0 vsMedian when median is null or zero', () => {
    expect(toProperty(row({ portfolio_median_revenue: null })).vsMedian).toBe(0);
    expect(toProperty(row({ portfolio_median_revenue: 0 })).vsMedian).toBe(0);
  });

  it('computes vsPrev from revenue_delta', () => {
    const p = toProperty(row({ revenue: 1200, revenue_delta: 200 }));
    expect(p.vsPrev).toBeCloseTo(20);
  });

  it('returns 0 vsPrev when delta is null or prior is non-positive', () => {
    expect(toProperty(row({ revenue_delta: null })).vsPrev).toBe(0);
    expect(toProperty(row({ revenue: 100, revenue_delta: 100 })).vsPrev).toBe(0);
  });

  it('classifies high risk on extreme negative deltas', () => {
    expect(toProperty(row({ revenue: 400, portfolio_median_revenue: 1000 })).risk).toBe('High');
  });

  it('classifies medium risk on moderate negative deltas', () => {
    expect(toProperty(row({ revenue: 850, portfolio_median_revenue: 1000 })).risk).toBe('Medium');
  });

  it('classifies low risk when within threshold', () => {
    expect(toProperty(row({ revenue: 1000, portfolio_median_revenue: 1000 })).risk).toBe('Low');
  });
});

describe('toProperties', () => {
  it('maps a list', () => {
    const rows = [row(), row({ listing_id: 'NYC-008', listing_nickname: 'Other' })];
    const out = toProperties(rows);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('NYC-007');
    expect(out[1].id).toBe('Other');
  });
});
