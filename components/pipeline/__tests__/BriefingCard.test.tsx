import { render, screen } from '@testing-library/react';
import { BriefingCard } from '../BriefingCard';

describe('BriefingCard', () => {
  const props = {
    revenueMonth: '2026-03-01',
    briefingText: 'This is a test briefing with analysis.',
    generatedAt: '2026-03-15T10:00:00Z',
    model: 'claude-3-5-sonnet-20241022',
  };

  it('renders briefing text', () => {
    render(<BriefingCard {...props} />);
    expect(screen.getByText('This is a test briefing with analysis.')).toBeInTheDocument();
  });

  it('shows model display name', () => {
    render(<BriefingCard {...props} />);
    expect(screen.getByText(/Claude 3.5 Sonnet/)).toBeInTheDocument();
  });

  it('shows revenue month heading', () => {
    render(<BriefingCard {...props} />);
    expect(screen.getByText(/Portfolio Briefing — 2026-03-01/)).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<BriefingCard {...props} />);
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument();
  });
});
