import { buildPrompt } from '../buildPrompt';
import type { PipelineInput } from '../types';

const INPUT: PipelineInput = {
  company_id: 'abc',
  revenue_month: '2026-03-01',
  property_count: 5,
  total_revenue: 12500,
  portfolio_adr: 250,
  total_nights: 50,
  properties: [
    { listing_id: 'p1', listing_nickname: 'Beach House', revenue: 5000, occupied_nights: 20, adr: 250, revenue_delta: 0.15 },
    { listing_id: 'p2', listing_nickname: 'Mountain Cabin', revenue: 4000, occupied_nights: 15, adr: 267, revenue_delta: -0.05 },
    { listing_id: 'p3', listing_nickname: 'City Loft', revenue: 3500, occupied_nights: 15, adr: 233, revenue_delta: null },
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
