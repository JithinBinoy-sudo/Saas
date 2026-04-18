import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeploySchemaStep } from '../DeploySchemaStep';

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

function fillCredentials() {
  fireEvent.change(screen.getByLabelText(/supabase project url/i), {
    target: { value: 'https://abcdef.supabase.co' },
  });
  fireEvent.change(screen.getByLabelText(/service role key/i), {
    target: { value: 'eyJhbGciOiJIUzI1NiJ9xxxxxxxxxxxx' },
  });
}

describe('DeploySchemaStep', () => {
  it('shows Supabase URL, service key inputs and Test Connection button', () => {
    render(<DeploySchemaStep onComplete={() => {}} />);
    expect(screen.getByLabelText(/supabase project url/i)).toBeInTheDocument();
    const keyInput = screen.getByLabelText(/service role key/i) as HTMLInputElement;
    expect(keyInput.type).toBe('password');
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
  });

  it('reveals pre-deploy checklist after successful connection test', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    render(<DeploySchemaStep onComplete={() => {}} />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));

    expect(await screen.findByText(/tables to create/i)).toBeInTheDocument();
    expect(screen.getByText(/reservations/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deploy schema now/i })).toBeInTheDocument();
  });

  it('shows per-object success after deployment', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/connection/test') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        });
      }
      if (url === '/api/schema/deploy') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schema_deployed: true,
            results: [
              { object: 'reservations', status: 'created' },
            ],
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    const onComplete = jest.fn();
    render(<DeploySchemaStep onComplete={onComplete} />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    await screen.findByRole('button', { name: /deploy schema now/i });
    fireEvent.click(screen.getByRole('button', { name: /deploy schema now/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getAllByText(/created/i).length).toBeGreaterThan(0);
  });

  it('shows failure details when deployment has errors', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/connection/test') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        });
      }
      if (url === '/api/schema/deploy') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schema_deployed: false,
            bootstrap_missing: false,
            results: [
              {
                object: 'reservations',
                status: 'failed',
                error: 'permission denied',
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    const onComplete = jest.fn();
    render(<DeploySchemaStep onComplete={onComplete} />);
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    await screen.findByRole('button', { name: /deploy schema now/i });
    fireEvent.click(screen.getByRole('button', { name: /deploy schema now/i }));

    expect(await screen.findByText(/permission denied/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
