import { render, screen } from '@testing-library/react';

const mockPathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/supabase/browser', () => ({
  createAppBrowserClient: jest.fn(() => ({
    auth: { signOut: jest.fn() },
  })),
}));

import { Sidebar } from '../Sidebar';

const adminUser = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
};

const memberUser = {
  name: 'Member User',
  email: 'member@example.com',
  role: 'member' as const,
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  it('shows Upload section with Upload Data and Upload History when on upload routes', () => {
    mockPathname.mockReturnValue('/dashboard/upload');
    render(<Sidebar user={adminUser} companyMode="hosted" />);
    expect(screen.getByRole('button', { name: /^upload$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload data/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload history/i })).toBeInTheDocument();
  });

  it('shows Upload toggle for hosted when collapsed off upload routes', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar user={adminUser} companyMode="hosted" />);
    expect(screen.getByRole('button', { name: /^upload$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /upload data/i })).not.toBeInTheDocument();
  });

  it('hides Upload section for BYOS', () => {
    render(<Sidebar user={adminUser} companyMode="byos" />);
    expect(screen.queryByRole('button', { name: /^upload$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /upload data/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /upload history/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('hides Admin nav entry for admins', () => {
    render(<Sidebar user={adminUser} companyMode="hosted" />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('hides Admin nav entry for members once a workspace admin exists', () => {
    render(<Sidebar user={memberUser} companyMode="hosted" workspaceHasAdmin />);
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows Admin nav entry for members when no workspace admin exists yet', () => {
    render(<Sidebar user={memberUser} companyMode="hosted" workspaceHasAdmin={false} />);
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });
});
