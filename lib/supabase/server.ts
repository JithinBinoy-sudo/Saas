import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Cookie-aware Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Respects RLS via the user's session.
 */
export function createAppServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where set() isn't allowed.
            // Safe to ignore when middleware is refreshing the session.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client. Bypasses RLS. Use ONLY on trusted server
 * paths (e.g. signup) — never expose to the browser.
 */
export function createAppAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
