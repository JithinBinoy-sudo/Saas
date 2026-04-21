/**
 * @jest-environment node
 */

import { parseSupabaseProjectRef } from '../runByosDeployViaPostgres';

describe('parseSupabaseProjectRef', () => {
  it('extracts project ref from Supabase URL', () => {
    expect(parseSupabaseProjectRef('https://abcd1234efgh.supabase.co')).toBe('abcd1234efgh');
    expect(parseSupabaseProjectRef('https://my-proj.supabase.co/')).toBe('my-proj');
  });

  it('returns null for invalid URLs', () => {
    expect(parseSupabaseProjectRef('https://example.com')).toBeNull();
    expect(parseSupabaseProjectRef('not-a-url')).toBeNull();
  });
});
