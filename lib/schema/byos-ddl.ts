/**
 * BYOS (Bring Your Own Supabase) schema — single source of truth.
 *
 * Each entry is a DDL statement the deploy API executes in order against the
 * company's own Supabase project. Mirrors the hosted-mode migrations but with
 * `company_id` columns, partitions, and RLS stripped — the whole database
 * belongs to one tenant.
 */
export type DdlEntry = {
  name: string;
  type: 'table' | 'view';
  sql: string;
};

export const BYOS_DDL: DdlEntry[] = [
  {
    name: 'reservations',
    type: 'table',
    sql: `
CREATE TABLE IF NOT EXISTS reservations (
  confirmation_code         text          NOT NULL,
  listing_nickname          text          NOT NULL,
  check_in_date             date          NOT NULL,
  check_out_date            date          NOT NULL,
  nights                    integer       NOT NULL,
  net_accommodation_fare    numeric(14,2) NOT NULL,
  listing_id                text          NOT NULL,
  data                      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (confirmation_code)
);
CREATE INDEX IF NOT EXISTS reservations_check_in_idx ON reservations(check_in_date);
CREATE INDEX IF NOT EXISTS reservations_listing_idx  ON reservations(listing_id);
`.trim(),
  },
];

/**
 * Bootstrap SQL the user pastes once into Supabase's SQL editor to enable
 * remote DDL execution. Creates a SECURITY DEFINER helper that the deploy API
 * calls via `supabase.rpc('portlio_exec_sql', { stmt })`. Kept narrowly scoped
 * (owner-only; takes a single string).
 */
export const BYOS_BOOTSTRAP_SQL = `
CREATE OR REPLACE FUNCTION portlio_exec_sql(stmt text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE stmt;
END;
$$;

REVOKE ALL ON FUNCTION portlio_exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portlio_exec_sql(text) TO service_role;
`.trim();
