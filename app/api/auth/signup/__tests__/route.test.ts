/**
 * @jest-environment node
 */

type AdminClient = {
  auth: { admin: { createUser: jest.Mock; deleteUser: jest.Mock } };
  from: jest.Mock;
};

let adminClient: AdminClient;

jest.mock('@/lib/supabase/server', () => ({
  createAppAdminClient: jest.fn(() => adminClient),
  createAppServerClient: jest.fn(),
}));

import { POST } from '../route';

function makeAdminClient(overrides: Partial<{
  createUserResult: unknown;
  companyInsert: unknown;
  userInsert: unknown;
}> = {}): AdminClient {
  const createUser = jest.fn().mockResolvedValue(
    overrides.createUserResult ?? { data: { user: { id: 'auth-user-1' } }, error: null }
  );
  const deleteUser = jest.fn().mockResolvedValue({ error: null });

  const companySingle = jest.fn().mockResolvedValue(
    overrides.companyInsert ?? { data: { id: 'company-1' }, error: null }
  );
  const userInsert = jest.fn().mockResolvedValue(overrides.userInsert ?? { error: null });

  const from = jest.fn((table: string) => {
    if (table === 'companies') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single: companySingle })),
        })),
      };
    }
    if (table === 'users') {
      return { insert: userInsert };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    auth: { admin: { createUser, deleteUser } },
    from,
  };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    adminClient = makeAdminClient();
  });

  it('returns 400 when payload is invalid', async () => {
    const res = await POST(makeRequest({ company_name: '', email: 'bad', password: 'x' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors).toBeDefined();
  });

  it('returns 201 and creates company + user on success', async () => {
    const res = await POST(
      makeRequest({
        company_name: 'Acme',
        email: 'admin@acme.com',
        password: 'supersecret',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.company_id).toBe('company-1');
    expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'admin@acme.com',
      password: 'supersecret',
      email_confirm: true,
    });
    expect(adminClient.from).toHaveBeenCalledWith('companies');
    expect(adminClient.from).toHaveBeenCalledWith('users');
  });

  it('returns 409 when email already exists', async () => {
    adminClient = makeAdminClient({
      createUserResult: {
        data: { user: null },
        error: { message: 'User already registered', status: 422 },
      },
    });
    const res = await POST(
      makeRequest({ company_name: 'Acme', email: 'dup@acme.com', password: 'supersecret' })
    );
    expect(res.status).toBe(409);
  });

  it('returns 500 on unexpected Supabase error', async () => {
    adminClient = makeAdminClient({
      createUserResult: {
        data: { user: null },
        error: { message: 'boom', status: 500 },
      },
    });
    const res = await POST(
      makeRequest({ company_name: 'Acme', email: 'x@acme.com', password: 'supersecret' })
    );
    expect(res.status).toBe(500);
  });
});
