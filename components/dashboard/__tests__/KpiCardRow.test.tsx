import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCardRow } from '../KpiCardRow';
import type { MonthlyPortfolioSummary } from '@/lib/analytics/types';

const summary: MonthlyPortfolioSummary = {
  revenue_month: '2026-03-01',
  property_count: 5,
  total_nights: 120,
  total_revenue: 48000,
  portfolio_adr: 400,
};

const priorSummary: MonthlyPortfolioSummary = {
  revenue_month: '2026-02-01',
  property_count: 5,
  total_nights: 100,
  total_revenue: 40000,
  portfolio_adr: 400,
};

describe('KpiCardRow', () => {
  it('renders all 4 KPI cards', () => {
    render(<KpiCardRow summary={summary} priorSummary={priorSummary} />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Occupied Nights')).toBeInTheDocument();
    expect(screen.getByText('Portfolio ADR')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('renders nothing when summary is null', () => {
    const { container } = render(<KpiCardRow summary={null} priorSummary={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows deltas when prior summary is provided', () => {
    const { container } = render(<KpiCardRow summary={summary} priorSummary={priorSummary} />);
    // Revenue delta: 48000 - 40000 = 8000 — rendered as "8,000" inside a badge
    const badges = container.querySelectorAll('.rounded-full');
    // 3 badges (revenue, nights, adr) — properties has no delta
    expect(badges.length).toBe(3);
    // Check that the revenue badge contains the delta value
    expect(badges[0].textContent).toContain('8,000');
    // Nights delta: 120 - 100 = 20
    expect(badges[1].textContent).toContain('20');
  });

  it('does not show deltas when prior summary is null', () => {
    const { container } = render(<KpiCardRow summary={summary} priorSummary={null} />);
    const badges = container.querySelectorAll('.rounded-full');
    expect(badges.length).toBe(0);
  });
});
