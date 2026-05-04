import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardEmptyState } from '../DashboardEmptyState';

describe('DashboardEmptyState', () => {
  it('renders the empty state message', () => {
    render(<DashboardEmptyState />);
    expect(screen.getByText('No reservation data yet.')).toBeInTheDocument();
  });

  it('renders a link to the upload page', () => {
    render(<DashboardEmptyState />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/upload');
  });
});
