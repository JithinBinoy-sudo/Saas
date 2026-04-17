import { render, screen } from '@testing-library/react';
import { UploadResultSummary } from '../UploadResultSummary';

describe('UploadResultSummary', () => {
  it('renders success state', () => {
    render(
      <UploadResultSummary
        result={{
          filename: 'q1.xlsx',
          total_rows: 10,
          inserted: 10,
          failed: 0,
          errors: [],
        }}
      />
    );
    expect(screen.getByText(/10 of 10 rows uploaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Errors/i)).not.toBeInTheDocument();
  });

  it('renders partial failure with up to 10 errors listed', () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      row: i + 2,
      field: 'nights',
      message: 'Must be at least 1',
    }));
    render(
      <UploadResultSummary
        result={{
          filename: 'q1.xlsx',
          total_rows: 15,
          inserted: 0,
          failed: 15,
          errors,
        }}
      />
    );
    expect(screen.getByText(/0 of 15 rows uploaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Row 2/)).toBeInTheDocument();
    expect(screen.getByText(/\+ 5 more errors/i)).toBeInTheDocument();
  });
});
