/**
 * @jest-environment node
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createAppServerClient: () => ({ auth: { getUser: mockGetUser }, from: mockFrom }),
  createAppAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET, PATCH } from '../route';

function makePatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/pipeline/prompt', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.upsert = jest.fn().mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/pipeline/prompt', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns defaults when no prompt_configs row exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    // user row
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    // prompt_configs — not found
    mockAdminFrom.mockReturnValueOnce(mockQuery({ data: null, error: { code: 'PGRST116' } }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.3);
    expect(body.max_tokens).toBe(2000);
    expect(body.system_prompt).toBeTruthy();
    expect(body.user_prompt_template).toBeTruthy();
  });

  it('returns existing prompt_configs when row exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    mockAdminFrom.mockReturnValueOnce(mockQuery({
      data: {
        system_prompt: 'Custom system',
        user_prompt_template: 'Custom template {{revenue_month}} {{data}}',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        max_tokens: 3000,
        updated_at: '2026-04-17T00:00:00Z',
      },
      error: null,
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.system_prompt).toBe('Custom system');
    expect(body.model).toBe('claude-3-5-sonnet-20241022');
    expect(body.temperature).toBe(0.7);
  });
});

describe('PATCH /api/pipeline/prompt', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatchRequest({ model: 'gpt-4o' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'member' }, error: null }));
    const res = await PATCH(makePatchRequest({ model: 'gpt-4o' }) as never);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    const res = await PATCH(makePatchRequest({ temperature: 5 }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported model', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    const res = await PATCH(makePatchRequest({ model: 'llama-3' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 for system_prompt shorter than 20 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));
    const res = await PATCH(makePatchRequest({ system_prompt: 'too short' }) as never);
    expect(res.status).toBe(400);
  });

  it('successfully patches valid fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(mockQuery({ data: { company_id: 'c1', role: 'admin' }, error: null }));

    const upsertChain = mockQuery({ data: null, error: null });
    mockAdminFrom.mockReturnValueOnce(upsertChain);

    const res = await PATCH(makePatchRequest({ temperature: 0.5, max_tokens: 1500 }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
