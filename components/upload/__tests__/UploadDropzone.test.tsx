import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UploadDropzone } from '../UploadDropzone';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

function mockFetchSuccess() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      filename: 'test.xlsx',
      total_rows: 3,
      inserted: 3,
      failed: 0,
      errors: [],
    }),
  });
}

describe('UploadDropzone', () => {
  it('shows the default state', () => {
    render(<UploadDropzone />);
    expect(screen.getByText(/Drop your Excel file here/i)).toBeInTheDocument();
  });

  it('uploads via fetch when a file is selected and shows the result summary', async () => {
    mockFetchSuccess();
    render(<UploadDropzone />);
    const input = screen.getByTestId('upload-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/reservations',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await screen.findByText(/3 of 3 rows uploaded/i)).toBeInTheDocument();
  });

  it('shows an error when the server returns non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    });
    render(<UploadDropzone />);
    const input = screen.getByTestId('upload-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([1])], 'bad.xlsx');
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/Upload failed: boom/i)).toBeInTheDocument();
  });
});
