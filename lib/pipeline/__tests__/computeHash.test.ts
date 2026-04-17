import { computeHash } from '../computeHash';
import type { PipelineInput } from '../types';

const INPUT: PipelineInput = {
  company_id: 'abc',
  revenue_month: '2026-03-01',
  property_count: 3,
  total_revenue: 5000,
  portfolio_adr: 250,
  total_nights: 20,
  properties: [],
};

describe('computeHash', () => {
  it('returns a 64-char hex string', () => {
    expect(computeHash(INPUT)).toHaveLength(64);
    expect(computeHash(INPUT)).toMatch(/^[0-9a-f]+$/);
  });
  it('is deterministic', () => {
    expect(computeHash(INPUT)).toBe(computeHash({ ...INPUT }));
  });
  it('changes when data changes', () => {
    expect(computeHash(INPUT)).not.toBe(computeHash({ ...INPUT, total_revenue: 9999 }));
  });
});
