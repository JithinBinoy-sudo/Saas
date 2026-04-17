import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Total Revenue" value="$48,200" />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$48,200')).toBeInTheDocument();
  });

  it('shows green badge for positive delta', () => {
    render(<KpiCard label="Revenue" value="$10,000" delta={500} deltaLabel="vs last month" />);
    // The arrow and value are separate text nodes in a span
    const badge = screen.getByText((_content, element) => {
      return element?.tagName === 'SPAN' && element.textContent?.includes('↑') === true;
    });
    expect(badge).toHaveClass('text-green-700');
  });

  it('shows red badge for negative delta', () => {
    render(<KpiCard label="Revenue" value="$10,000" delta={-200} />);
    const badge = screen.getByText((_content, element) => {
      return element?.tagName === 'SPAN' && element.textContent?.includes('↓') === true;
    });
    expect(badge).toHaveClass('text-red-700');
  });

  it('shows grey badge for zero delta', () => {
    render(<KpiCard label="Revenue" value="$10,000" delta={0} />);
    const badge = screen.getByText((_content, element) => {
      return element?.tagName === 'SPAN' && element.textContent?.includes('–') === true && element.classList.contains('text-slate-500');
    });
    expect(badge).toHaveClass('text-slate-500');
  });

  it('does not render delta badge when delta is null', () => {
    const { container } = render(<KpiCard label="Properties" value="5" />);
    const badges = container.querySelectorAll('.rounded-full');
    expect(badges).toHaveLength(0);
  });
});
