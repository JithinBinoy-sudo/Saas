jest.mock('../supabase/server', () => ({
  createAppServerClient: jest.fn(() => ({ __kind: 'app-server' })),
  createAppAdminClient: jest.fn(),
}));

jest.mock('../encryption', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn((v: string) => `dec(${v})`),
}));

const createClientMock: jest.Mock = jest.fn(() => ({ __kind: 'byos' }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, opts?: unknown) => createClientMock(url, key, opts),
}));

import { getDataClient } from '../getDataClient';
import { createAppServerClient } from '../supabase/server';
import { decrypt } from '../encryption';

describe('getDataClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the app server client when mode is hosted', () => {
    const client = getDataClient({ mode: 'hosted' });
    expect(createAppServerClient).toHaveBeenCalled();
    expect((client as unknown as { __kind: string }).__kind).toBe('app-server');
  });

  it('decrypts credentials and builds a byos client when mode is byos', () => {
    const client = getDataClient({
      mode: 'byos',
      supabase_url: 'enc-url',
      supabase_service_key: 'enc-key',
    });
    expect(decrypt).toHaveBeenCalledWith('enc-url');
    expect(decrypt).toHaveBeenCalledWith('enc-key');
    expect(createClientMock).toHaveBeenCalledWith('dec(enc-url)', 'dec(enc-key)', expect.any(Object));
    expect((client as unknown as { __kind: string }).__kind).toBe('byos');
  });

  it('throws when byos credentials are missing', () => {
    expect(() =>
      getDataClient({ mode: 'byos', supabase_url: null, supabase_service_key: null })
    ).toThrow('BYOS credentials not configured');
  });
});
