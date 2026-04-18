/**
 * @jest-environment node
 */

/**
 * Pipeline run route tests.
 * Mocks: Supabase clients, provider adapters, encryption.
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createAppServerClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
  createAppAdminClient: () => ({ from: mockAdminFrom }),
}));

jest.mock('@/lib/encryption', () => ({
  decrypt: (val: string) => `decrypted-${val}`,
}));

const mockChat = jest.fn();
jest.mock('@/lib/pipeline/providers', () => ({
  createProvider: () => ({ chat: mockChat }),
}));

import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/pipeline/run', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

// Helper to build chained Supabase query mocks
function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.in = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.upsert = jest.fn().mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/pipeline/run', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ revenue_month: '2026-03-01', model: 'gpt-4o' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 for unsupported model', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    const res = await POST(makeRequest({ revenue_month: '2026-03-01', model: 'llama-3' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'member' }, error: null }));
    const res = await POST(makeRequest({ revenue_month: '2026-03-01', model: 'gpt-4o' }) as never);
    expect(res.status).toBe(403);
  });

  it('returns 402 when provider key is not configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    // user row with admin role
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    // company row — no anthropic key
    mockAdminFrom.mockReturnValueOnce(mockQuery({
      data: {
        id: 'c1', mode: 'hosted',
        openai_api_key: 'enc-oai',
        anthropic_api_key: null,
        google_api_key: null,
      },
      error: null,
    }));
    const res = await POST(makeRequest({ revenue_month: '2026-03-01', model: 'claude-3-5-sonnet-20241022' }) as never);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.provider).toBe('anthropic');
  });
});
