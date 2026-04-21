import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const parsedHeaders: { current: string[] } = { current: [] };

jest.mock('xlsx', () => ({
  read: jest.fn(() => {
    const headers = parsedHeaders.current;
    return {
      SheetNames: ['Reservations'],
      Sheets: {
        Reservations: (() => {
          const sheet: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            const col = String.fromCharCode(65 + i);
            sheet[`${col}1`] = { v: h, t: 's' };
          });
          const lastCol = String.fromCharCode(65 + headers.length - 1);
          sheet['!ref'] = headers.length > 0 ? `A1:${lastCol}1` : 'A1:A1';
          return sheet;
        })(),
      },
    };
  }),
  utils: {
    sheet_to_json: jest.fn(() => []),
    decode_range: jest.fn((ref: string) => {
      const match = /^A1:([A-Z]+)1$/.exec(ref);
      const lastCol = match ? match[1] : 'A';
      return { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol.charCodeAt(0) - 65 } };
    }),
    encode_cell: jest.fn(({ r, c }: { r: number; c: number }) => {
      return `${String.fromCharCode(65 + c)}${r + 1}`;
    }),
  },
}));

import { ColumnMappingStep } from '../ColumnMappingStep';

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  parsedHeaders.current = [];
});

afterAll(() => {
  global.fetch = originalFetch;
});

async function uploadFile(headers: string[]) {
  parsedHeaders.current = headers;
  const blob = new Blob(['fake'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const file = new File([blob], 'sample.xlsx', { type: blob.type });
  // Patch File.arrayBuffer which jsdom may not implement.
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new ArrayBuffer(0),
    configurable: true,
  });
  const input = screen.getByTestId('xlsx-file-input') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
  await waitFor(() => {
    expect(screen.queryAllByTestId(/^mapping-row-/).length).toBeGreaterThan(0);
  });
}

describe('ColumnMappingStep', () => {
  it('renders sample preview and Download Sample Excel link before upload', () => {
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={() => {}} />);
    expect(screen.getByText(/download sample excel/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmation code/i)).toBeInTheDocument();
  });

  it('renders a mapping row for each detected Excel header', async () => {
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={() => {}} />);
    await uploadFile(['Booking Ref', 'Property', 'Check In', 'Guest Name']);
    expect(screen.getByTestId('mapping-row-Booking Ref')).toBeInTheDocument();
    expect(screen.getByTestId('mapping-row-Property')).toBeInTheDocument();
    expect(screen.getByTestId('mapping-row-Check In')).toBeInTheDocument();
    expect(screen.getByTestId('mapping-row-Guest Name')).toBeInTheDocument();
  });

  it('removes a required field from other dropdowns once selected', async () => {
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={() => {}} />);
    await uploadFile(['Header A', 'Header B']);

    const rowA = screen.getByTestId('mapping-row-Header A');
    const rowB = screen.getByTestId('mapping-row-Header B');
    const selectA = within(rowA).getByRole('combobox');
    const selectB = within(rowB).getByRole('combobox');

    fireEvent.change(selectA, { target: { value: 'req:confirmation_code' } });

    const bOptions = Array.from(selectB.querySelectorAll('option')).map((o) =>
      (o as HTMLOptionElement).value
    );
    expect(bOptions).not.toContain('req:confirmation_code');
    expect(bOptions).toContain('req:listing_id');
  });

  it('disables Continue until all 7 required fields mapped', async () => {
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={() => {}} />);
    await uploadFile(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('shows per-field errors when attempting to continue with missing required fields', async () => {
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={() => {}} />);
    await uploadFile(['H1']);
    // Map H1 to one required field, leaving 6 unmapped.
    const row = screen.getByTestId('mapping-row-H1');
    fireEvent.change(within(row).getByRole('combobox'), {
      target: { value: 'req:confirmation_code' },
    });
    // The button should still be disabled; request a validation trigger via "show errors".
    fireEvent.click(screen.getByRole('button', { name: /show missing fields/i }));
    expect(
      screen.getAllByText(/unmapped|missing/i).length
    ).toBeGreaterThan(0);
  });

  it('calls onComplete after successful submission', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ schema_deployed: true }),
    });
    const onComplete = jest.fn();
    render(<ColumnMappingStep mode="hosted" onBack={() => {}} onComplete={onComplete} />);

    const headers = [
      'Confirmation Code',
      'Listing Nickname',
      'Check-In Date',
      'Check-Out Date',
      'Nights',
      'Net Accommodation Fare',
      'Listing ID',
      'Guest Name',
    ];
    await uploadFile(headers);

    // With exact header names, fuzzy match should already have assigned the 7 required fields.
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    await waitFor(() => expect(continueBtn).toBeEnabled());

    fireEvent.click(continueBtn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
