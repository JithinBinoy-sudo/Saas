/**
 * @jest-environment node
 */

import { adminSetupTestState } from '../mock-test-state';

const mockGetUser = jest.fn();
const updateUserById = jest.fn();

jest.mock('@/lib/supabase/server', () => {
  const { adminSetupTestState: s } = jest.requireActual<typeof import('../mock-test-state')>('../mock-test-state');
  return {
    createAppServerClient: () => ({
      auth: {
        getUser: () => mockGetUser(),
      },
    }),
    createAppAdminClient: () => {
      let usersFromCall = 0;
      return {
        from: jest.fn((table: string) => {
          if (table !== 'users') throw new Error(`unexpected table ${table}`);
          usersFromCall += 1;
          if (usersFromCall === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: s.userRow, error: null }),
                }),
              }),
            };
          }
          if (usersFromCall === 2) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    count: s.adminCount,
                    error: s.countError,
                  }),
                }),
              }),
            };
          }
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: s.roleUpdateError }),
            }),
          };
        }),
        auth: {
          admin: {
            updateUserById,
          },
        },
      };
    },
  };
});

import { POST } from '../route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/initial-setup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  adminSetupTestState.userRow = { id: 'u1', company_id: 'c1', role: 'member' };
  adminSetupTestState.adminCount = 0;
  adminSetupTestState.countError = null;
  adminSetupTestState.roleUpdateError = null;
  updateUserById.mockResolvedValue({ error: null });
});

describe('POST /api/admin/initial-setup', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when passwords do not match', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(
      makeRequest({ keepCurrentPassword: false, password: 'abcdefgh', confirmPassword: 'abcdefg1' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when caller is already admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    adminSetupTestState.userRow = { id: 'u1', company_id: 'c1', role: 'admin' };
    const res = await POST(makeRequest({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when company already has an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    adminSetupTestState.adminCount = 1;
    const res = await POST(makeRequest({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }));
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates password and role when eligible', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(
      makeRequest({ keepCurrentPassword: false, password: 'abcdefgh', confirmPassword: 'abcdefgh' })
    );
    expect(res.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith('u1', { password: 'abcdefgh' });
  });

  it('returns 200 and skips password update when keepCurrentPassword is true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(makeRequest({ keepCurrentPassword: true }));
    expect(res.status).toBe(200);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('defaults to keepCurrentPassword=true when omitted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
