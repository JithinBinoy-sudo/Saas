import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const signInWithPassword = jest.fn();
const push = jest.fn();

jest.mock('@/lib/supabase/browser', () => ({
  createAppBrowserClient: jest.fn(() => ({
    auth: { signInWithPassword },
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    push.mockReset();
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation error when email is empty', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'supersecret' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('shows validation error when password is empty', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('calls signInWithPassword and redirects on success', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'supersecret' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'supersecret',
      });
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('displays error message when Supabase returns an error', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
