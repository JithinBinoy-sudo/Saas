import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const signInWithPassword = jest.fn();
const push = jest.fn();
const fetchMock = jest.fn();

jest.mock('@/lib/supabase/browser', () => ({
  createAppBrowserClient: jest.fn(() => ({
    auth: { signInWithPassword },
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { SignupForm } from '../SignupForm';

describe('SignupForm', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    signInWithPassword.mockReset();
    push.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders company name, email and password fields', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors for all required fields when empty', async () => {
    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(await screen.findByText(/company name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls POST /api/auth/signup with correct payload on valid submit', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ company_id: 'c1' }),
    });
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'supersecret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            company_name: 'Acme',
            email: 'a@b.com',
            password: 'supersecret',
          }),
        })
      )
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding'));
  });

  it('shows server error message when API returns an error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Email already registered' }),
    });
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'dup@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'supersecret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
