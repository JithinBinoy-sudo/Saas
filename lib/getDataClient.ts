import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createAppServerClient } from './supabase/server';
import { decrypt } from './encryption';

export type CompanyDataContext = {
  mode: string;
  supabase_url?: string | null;
  supabase_service_key?: string | null;
};

export function getDataClient(company: CompanyDataContext): SupabaseClient {
  if (company.mode === 'hosted') {
    return createAppServerClient() as unknown as SupabaseClient;
  }

  if (company.mode === 'byos') {
    if (!company.supabase_url || !company.supabase_service_key) {
      throw new Error('BYOS credentials not configured');
    }
    const url = decrypt(company.supabase_url);
    const key = decrypt(company.supabase_service_key);
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  throw new Error(`Unknown company mode: ${company.mode}`);
}
