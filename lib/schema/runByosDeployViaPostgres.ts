import { Client } from 'pg';
import { BYOS_BOOTSTRAP_SQL, type DdlEntry } from '@/lib/schema/byos-ddl';

export function parseSupabaseProjectRef(supabaseUrl: string): string | null {
  try {
    const u = new URL(supabaseUrl);
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(u.hostname);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export type ByosPostgresDeployResult =
  | { ok: true }
  | { ok: false; phase: 'connect' | 'bootstrap'; message: string }
  | { ok: false; phase: 'ddl'; entryName: string; message: string };

/**
 * Runs BYOS bootstrap + DDL using direct Postgres (db.{ref}.supabase.co).
 * Avoids needing a pre-existing `portlio_exec_sql` RPC on a fresh project.
 * Password is only used in-memory for this request and must not be persisted.
 */
export async function runByosDeployViaPostgres(opts: {
  supabaseUrl: string;
  databasePassword: string;
  ddl: DdlEntry[];
}): Promise<ByosPostgresDeployResult> {
  const ref = parseSupabaseProjectRef(opts.supabaseUrl);
  if (!ref) {
    return { ok: false, phase: 'connect', message: 'Invalid Supabase project URL' };
  }

  const client = new Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: opts.databasePassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });

  try {
    await client.connect();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Postgres connection failed';
    return { ok: false, phase: 'connect', message };
  }

  try {
    await client.query(BYOS_BOOTSTRAP_SQL);
  } catch (e) {
    await client.end().catch(() => {});
    const message = e instanceof Error ? e.message : 'Bootstrap SQL failed';
    return { ok: false, phase: 'bootstrap', message };
  }

  for (const entry of opts.ddl) {
    try {
      await client.query(entry.sql);
    } catch (e) {
      await client.end().catch(() => {});
      const message = e instanceof Error ? e.message : 'DDL failed';
      return { ok: false, phase: 'ddl', entryName: entry.name, message };
    }
  }

  await client.end();
  return { ok: true };
}
