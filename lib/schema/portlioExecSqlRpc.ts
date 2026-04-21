import type { SupabaseClient } from '@supabase/supabase-js';

/** PostgREST errors when `portlio_exec_sql` is missing or not yet visible in the schema cache. */
export function isPortlioExecSqlMissingError(message: string): boolean {
  return (
    /portlio_exec_sql/i.test(message) &&
    /does not exist|could not find the function|schema cache|unknown.*function|PGRST\d+/i.test(
      message
    )
  );
}

/**
 * Calls `portlio_exec_sql` with retries. Supabase-hosted PostgREST often lags
 * after `CREATE FUNCTION`; NOTIFY is unreliable (see supabase/supabase#42183).
 */
export async function rpcPortlioExecSqlWithRetries(
  companyDb: SupabaseClient,
  stmt: string,
  opts?: { maxAttempts?: number; delayMs?: number }
): Promise<{ error: { message: string; code?: string } | null }> {
  const maxAttempts = opts?.maxAttempts ?? 8;
  const delayMs = opts?.delayMs ?? 4000;
  let last: { message: string; code?: string } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { error } = await companyDb.rpc('portlio_exec_sql', { stmt });
    if (!error) {
      return { error: null };
    }
    last = { message: error.message, code: error.code };
    if (!isPortlioExecSqlMissingError(error.message)) {
      break;
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { error: last };
}
