/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '../ExportButton';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/settings/export',
}));

const MONTHS = ['2026-03-01', '2026-02-01', '2026-01-01'];

describe('ExportButton', () => {
  it('renders month selectors and export button', () => {
    render(<ExportButton availableMonths={MONTHS} />);

    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('Export to Excel')).toBeInTheDocument();
  });

  it('shows empty state when no months available', () => {
    render(<ExportButton availableMonths={[]} />);

    expect(screen.getByText(/No data available/)).toBeInTheDocument();
    expect(screen.getByText('Export to Excel')).toBeDisabled();
  });

  it('handles 413 error gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: () => Promise.resolve({ error: 'Export exceeds 50,000 rows.' }),
    });

    render(<ExportButton availableMonths={MONTHS} />);
    fireEvent.click(screen.getByText('Export to Excel'));

    await waitFor(() => {
      expect(screen.getByText('Export exceeds 50,000 rows.')).toBeInTheDocument();
    });
  });
});
