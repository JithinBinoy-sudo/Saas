import { render, screen } from '@testing-library/react';
import { RunPipelineButton } from '../RunPipelineButton';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

describe('RunPipelineButton', () => {
  const props = {
    currentModel: 'gpt-4o',
    revenueMonth: '2026-03-01',
    configuredProviders: ['openai' as const, 'anthropic' as const],
  };

  it('renders generate button', () => {
    render(<RunPipelineButton {...props} />);
    expect(screen.getByText('Generate Briefing')).toBeInTheDocument();
  });

  it('shows current model name', () => {
    render(<RunPipelineButton {...props} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });
});
