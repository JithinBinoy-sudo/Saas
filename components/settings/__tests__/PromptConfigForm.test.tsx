/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptConfigForm } from '../PromptConfigForm';
import type { PromptConfig } from '../PromptConfigForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/settings/prompt',
}));

const DEFAULT_CONFIG: PromptConfig = {
  system_prompt: 'A system prompt that is at least twenty characters long.',
  user_prompt_template: 'Template with {{revenue_month}} and {{data}} placeholders.',
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  updated_at: null,
};

describe('PromptConfigForm', () => {
  it('renders all form fields', () => {
    render(<PromptConfigForm initialConfig={DEFAULT_CONFIG} />);

    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('User Prompt Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Tokens')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
    expect(screen.getByText('Reset to defaults')).toBeInTheDocument();
  });

  it('shows character count for system prompt', () => {
    render(<PromptConfigForm initialConfig={DEFAULT_CONFIG} />);
    expect(screen.getByText(`${DEFAULT_CONFIG.system_prompt.length} / 4000`)).toBeInTheDocument();
  });

  it('shows missing placeholder warning when placeholders are absent', () => {
    const config: PromptConfig = {
      ...DEFAULT_CONFIG,
      user_prompt_template: 'No placeholders here at all in this template.',
    };
    render(<PromptConfigForm initialConfig={config} />);
    expect(screen.getByText('Missing placeholders:')).toBeInTheDocument();
    expect(screen.getByText('{{revenue_month}}')).toBeInTheDocument();
    expect(screen.getByText('{{data}}')).toBeInTheDocument();
  });

  it('does not show placeholder warning when all placeholders present', () => {
    render(<PromptConfigForm initialConfig={DEFAULT_CONFIG} />);
    expect(screen.queryByText('Missing placeholders:')).not.toBeInTheDocument();
  });

  it('displays selected model name', () => {
    render(<PromptConfigForm initialConfig={DEFAULT_CONFIG} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('shows temperature value', () => {
    render(<PromptConfigForm initialConfig={DEFAULT_CONFIG} />);
    expect(screen.getByText('0.30')).toBeInTheDocument();
  });
});
