import { classifyRisk } from '@/lib/adapters/risk';
import type { PropertyMonthRow } from '@/lib/analytics/types';

function row(overrides: Partial<PropertyMonthRow> = {}): PropertyMonthRow {
  return {
    listing_id: 'L1',
    listing_nickname: 'L1',
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

describe('classifyRisk', () => {
  it('high when revenue is 60% below median', () => {
    expect(classifyRisk(row({ revenue: 400 }))).toBe('High');
  });

  it('high when M/M drop exceeds 40%', () => {
    expect(classifyRisk(row({ revenue: 500, revenue_delta: -500 }))).toBe('High');
  });

  it('medium for 15-50% below median', () => {
    expect(classifyRisk(row({ revenue: 800 }))).toBe('Medium');
  });

  it('low when within thresholds', () => {
    expect(classifyRisk(row({ revenue: 950 }))).toBe('Low');
  });
});
