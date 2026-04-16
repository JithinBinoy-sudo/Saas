/**
 * @jest-environment node
 */

type Profile = {
  user: { id: string } | null;
  company_id?: string;
  role?: 'admin' | 'member';
  schema_deployed?: boolean;
};

let profile: Profile;

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => {
    const usersSingle = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: profile.user
          ? { company_id: profile.company_id ?? 'c1', role: profile.role ?? 'member' }
          : null,
        error: profile.user ? null : { message: 'no row' },
      })
    );
    const companiesSingle = jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: profile.user
          ? { schema_deployed: profile.schema_deployed ?? false }
          : null,
        error: profile.user ? null : { message: 'no row' },
      })
    );

    const from = jest.fn((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: usersSingle })),
          })),
        };
      }
      if (table === 'companies') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: companiesSingle })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: profile.user },
          error: null,
        }),
      },
      from,
    };
  }),
}));

import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

function getRedirect(res: Response): string | null {
  if (res.status !== 307 && res.status !== 308) return null;
  const location = res.headers.get('location');
  if (!location) return null;
  try {
    return new URL(location).pathname;
  } catch {
    return location;
  }
}

describe('middleware route protection', () => {
  beforeEach(() => {
    profile = { user: null };
  });

  it('redirects to /auth when visiting /dashboard with no session', async () => {
    profile = { user: null };
    const res = await middleware(makeRequest('/dashboard'));
    expect(getRedirect(res)).toBe('/auth');
  });

  it('redirects /dashboard to /onboarding when schema_deployed is false', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'admin', schema_deployed: false };
    const res = await middleware(makeRequest('/dashboard'));
    expect(getRedirect(res)).toBe('/onboarding');
  });

  it('allows /dashboard when schema is deployed', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'admin', schema_deployed: true };
    const res = await middleware(makeRequest('/dashboard'));
    expect(getRedirect(res)).toBeNull();
  });

  it('redirects /admin to /dashboard when role is member', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'member', schema_deployed: true };
    const res = await middleware(makeRequest('/admin'));
    expect(getRedirect(res)).toBe('/dashboard');
  });

  it('allows /admin when role is admin', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'admin', schema_deployed: true };
    const res = await middleware(makeRequest('/admin'));
    expect(getRedirect(res)).toBeNull();
  });

  it('redirects /auth to /dashboard when logged in with schema deployed', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'admin', schema_deployed: true };
    const res = await middleware(makeRequest('/auth'));
    expect(getRedirect(res)).toBe('/dashboard');
  });

  it('allows /auth when not logged in', async () => {
    profile = { user: null };
    const res = await middleware(makeRequest('/auth'));
    expect(getRedirect(res)).toBeNull();
  });

  it('allows /onboarding when logged in but schema not yet deployed', async () => {
    profile = { user: { id: 'u1' }, company_id: 'c1', role: 'admin', schema_deployed: false };
    const res = await middleware(makeRequest('/onboarding'));
    expect(getRedirect(res)).toBeNull();
  });
});
