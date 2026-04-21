import { buildPrompt } from '../buildPrompt';
import type { PipelineInput } from '../types';

const INPUT: PipelineInput = {
  company_id: 'abc',
  revenue_month: '2026-03-01',
  property_count: 5,
  total_revenue: 12500,
  avg_revenue: 2500,
  min_revenue: 1000,
  max_revenue: 5000,
  portfolio_adr: 250,
  total_nights: 50,
  properties: [
    { listing_id: 'p1', listing_nickname: 'Beach House', revenue: 5000, occupied_nights: 20, adr: 250, yield_mom_pct: 0.15 },
    { listing_id: 'p2', listing_nickname: 'Mountain Cabin', revenue: 4000, occupied_nights: 15, adr: 267, yield_mom_pct: -0.05 },
    { listing_id: 'p3', listing_nickname: 'City Loft', revenue: 3500, occupied_nights: 15, adr: 233, yield_mom_pct: null },
  ],
  properties_data: [
    { listing_id: 'p4', listing_nickname: 'Lake Cottage', revenue: 1000, occupied_nights: 5, adr: 200, prev_revenue: 1200, yield_mom_pct: -0.1667 },
    { listing_id: 'p3', listing_nickname: 'City Loft', revenue: 3500, occupied_nights: 15, adr: 233, prev_revenue: null, yield_mom_pct: null },
    { listing_id: 'p1', listing_nickname: 'Beach House', revenue: 5000, occupied_nights: 20, adr: 250, prev_revenue: 4348, yield_mom_pct: 0.15 },
  ],
  channel_mix: [
    { channel_label: 'Airbnb', total_revenue: 7000, revenue_share: 0.56 },
    { channel_label: 'Booking.com', total_revenue: 5500, revenue_share: 0.44 },
  ],
};

const SYSTEM_PROMPT = 'You are a short-term rental portfolio analyst.';
const USER_TEMPLATE = 'Analyze the following portfolio data for {{revenue_month}}:\n\n{{data}}';

describe('buildPrompt', () => {
  it('returns system and user strings', () => {
    const result = buildPrompt(INPUT, SYSTEM_PROMPT, USER_TEMPLATE);
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('user');
    expect(typeof result.system).toBe('string');
    expect(typeof result.user).toBe('string');
  });

  it('interpolates revenue_month into user prompt', () => {
    const result = buildPrompt(INPUT, SYSTEM_PROMPT, USER_TEMPLATE);
    expect(result.user).toContain('2026-03-01');
  });

  it('includes property data in user prompt', () => {
    const result = buildPrompt(INPUT, SYSTEM_PROMPT, USER_TEMPLATE);
    expect(result.user).toContain('Beach House');
    expect(result.user).toContain('Mountain Cabin');
    expect(result.user).toContain('City Loft');
  });

  it('includes portfolio-level KPIs', () => {
    const result = buildPrompt(INPUT, SYSTEM_PROMPT, USER_TEMPLATE);
    expect(result.user).toContain('$12,500.00');
    expect(result.user).toContain('$250.00');
    expect(result.user).toContain('Occupied Nights: 50');
  });

  it('passes through system prompt as-is', () => {
    const result = buildPrompt(INPUT, SYSTEM_PROMPT, USER_TEMPLATE);
    expect(result.system).toBe(SYSTEM_PROMPT);
  });

  it('uses default prompts when none provided', () => {
    const result = buildPrompt(INPUT);
    expect(result.system.length).toBeGreaterThan(0);
    expect(result.user.length).toBeGreaterThan(0);
    expect(result.user).toContain('Beach House');
  });
});
