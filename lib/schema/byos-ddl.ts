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

-- Legacy tables (e.g. created before Portlio) may lack canonical columns; add without
-- breaking existing CREATE. Column mapping only renames Excel headers — Postgres still
-- needs physical listing_id (see sync/upload payloads).
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmation_code text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS listing_nickname text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS check_in_date date;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS check_out_date date;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS nights integer;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS net_accommodation_fare numeric(14,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS listing_id text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

DO $portlio_arca_listing$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'reservations' AND c.column_name = 'arca_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'reservations' AND c.column_name = 'listing_id'
  ) THEN
    EXECUTE $fill$
      UPDATE reservations r
      SET listing_id = trim(arca_id::text)
      WHERE (r.listing_id IS NULL OR trim(r.listing_id::text) = '')
        AND r.arca_id IS NOT NULL
        AND trim(r.arca_id::text) <> ''
    $fill$;
  END IF;
END $portlio_arca_listing$;

CREATE INDEX IF NOT EXISTS reservations_check_in_idx ON reservations(check_in_date);
CREATE INDEX IF NOT EXISTS reservations_listing_idx  ON reservations(listing_id);
`.trim(),
  },
];

/**
 * Bootstrap SQL used when deploying over PostgREST (`rpc('portlio_exec_sql')`)
 * without a database password. Companies can skip pasting this if they supply
 * the project **database password** on deploy: the API then runs bootstrap + DDL
 * over direct Postgres (`db.<ref>.supabase.co`) instead.
 *
 * Creates a SECURITY DEFINER helper; kept narrowly scoped (single text argument).
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

-- PostgREST caches the API schema; without this, RPC may fail until the next reload.
NOTIFY pgrst, 'reload schema';
`.trim();
