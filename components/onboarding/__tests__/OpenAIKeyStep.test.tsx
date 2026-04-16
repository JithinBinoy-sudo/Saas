import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenAIKeyStep } from '../OpenAIKeyStep';

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('OpenAIKeyStep', () => {
  it('renders password-masked input and Test Connection button', () => {
    render(<OpenAIKeyStep onComplete={() => {}} />);
    const input = screen.getByLabelText(/openai api key/i) as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
  });

  it('disables Continue button before successful test', () => {
    render(<OpenAIKeyStep onComplete={() => {}} />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('shows success state and enables Continue after test passes', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    render(<OpenAIKeyStep onComplete={() => {}} />);
    fireEvent.change(screen.getByLabelText(/openai api key/i), {
      target: { value: 'sk-abcdefghijklmnopqrstuv' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/connection successful/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('shows error when test fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid API key' }),
    });
    render(<OpenAIKeyStep onComplete={() => {}} />);
    fireEvent.change(screen.getByLabelText(/openai api key/i), {
      target: { value: 'sk-badkeybadkeybadkeybad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/invalid api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('shows loading indicator while testing', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((res) => (resolveFn = res)));
    render(<OpenAIKeyStep onComplete={() => {}} />);
    fireEvent.change(screen.getByLabelText(/openai api key/i), {
      target: { value: 'sk-slowslowslowslowslow' },
    });
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/testing/i)).toBeInTheDocument();
    resolveFn({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await waitFor(() => expect(screen.queryByText(/testing/i)).not.toBeInTheDocument());
  });
});
