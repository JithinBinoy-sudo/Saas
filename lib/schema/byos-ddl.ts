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
  {
    name: 'monthly_portfolio_briefings',
    type: 'table',
    sql: `
CREATE TABLE IF NOT EXISTS monthly_portfolio_briefings (
  revenue_month      date        NOT NULL,
  portfolio_summary  text,
  property_count     integer,
  data_hash          text,
  generated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (revenue_month)
);
`.trim(),
  },
  {
    name: 'nights_exploded_silver',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW nights_exploded_silver AS
SELECT
  r.confirmation_code,
  r.listing_id,
  r.listing_nickname,
  (r.data->>'source')   AS source,
  (r.data->>'channel')  AS channel,
  (r.data->>'currency') AS currency,
  (r.check_in_date + gs)::date                             AS night_date,
  date_trunc('month', (r.check_in_date + gs))::date        AS revenue_month,
  CASE WHEN r.nights > 0
       THEN r.net_accommodation_fare / r.nights
       ELSE 0
  END                                                      AS nightly_fare
FROM reservations r
CROSS JOIN LATERAL generate_series(0, GREATEST(r.nights - 1, 0)) AS gs
WHERE r.nights > 0;
`.trim(),
  },
  {
    name: 'monthly_metrics_silver',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW monthly_metrics_silver AS
SELECT
  listing_id,
  listing_nickname,
  revenue_month,
  COUNT(*)::integer                AS occupied_nights,
  SUM(nightly_fare)::numeric(14,2) AS revenue,
  CASE WHEN COUNT(*) > 0
       THEN (SUM(nightly_fare) / COUNT(*))::numeric(14,2)
       ELSE 0
  END                              AS adr
FROM nights_exploded_silver
GROUP BY listing_id, listing_nickname, revenue_month;
`.trim(),
  },
  {
    name: 'mom_trends_silver',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW mom_trends_silver AS
SELECT
  m.listing_id,
  m.listing_nickname,
  m.revenue_month,
  m.revenue,
  m.occupied_nights,
  m.adr,
  LAG(m.revenue)         OVER w AS prev_revenue,
  LAG(m.occupied_nights) OVER w AS prev_occupied_nights,
  LAG(m.adr)             OVER w AS prev_adr,
  (m.revenue - LAG(m.revenue) OVER w)                 AS revenue_delta,
  (m.occupied_nights - LAG(m.occupied_nights) OVER w) AS nights_delta,
  (m.adr - LAG(m.adr) OVER w)                         AS adr_delta
FROM monthly_metrics_silver m
WINDOW w AS (PARTITION BY m.listing_id ORDER BY m.revenue_month);
`.trim(),
  },
  {
    name: 'monthly_channel_mix_silver',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW monthly_channel_mix_silver AS
SELECT
  listing_id,
  listing_nickname,
  revenue_month,
  COALESCE(channel, source, 'unknown') AS channel_label,
  COUNT(*)::integer                    AS nights,
  SUM(nightly_fare)::numeric(14,2)     AS revenue
FROM nights_exploded_silver
GROUP BY listing_id, listing_nickname, revenue_month,
         COALESCE(channel, source, 'unknown');
`.trim(),
  },
  {
    name: 'channel_mix_summary',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW channel_mix_summary AS
SELECT
  channel_label,
  SUM(nights)::integer        AS total_nights,
  SUM(revenue)::numeric(14,2) AS total_revenue,
  (SUM(revenue) / NULLIF(SUM(SUM(revenue)) OVER (), 0))::numeric(10,4) AS revenue_share
FROM monthly_channel_mix_silver
GROUP BY channel_label;
`.trim(),
  },
  {
    name: 'portfolio_benchmarking_silver',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW portfolio_benchmarking_silver AS
SELECT
  m.listing_id,
  m.listing_nickname,
  m.revenue_month,
  m.revenue,
  m.adr,
  m.occupied_nights,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.revenue)
    OVER (PARTITION BY m.revenue_month) AS portfolio_median_revenue,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.adr)
    OVER (PARTITION BY m.revenue_month) AS portfolio_median_adr
FROM monthly_metrics_silver m;
`.trim(),
  },
  {
    name: 'final_reporting_gold',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW final_reporting_gold AS
SELECT
  m.listing_id,
  m.listing_nickname,
  m.revenue_month,
  m.revenue,
  m.occupied_nights,
  m.adr,
  t.revenue_delta,
  t.nights_delta,
  t.adr_delta,
  b.portfolio_median_revenue,
  b.portfolio_median_adr
FROM monthly_metrics_silver m
LEFT JOIN mom_trends_silver            t
  ON t.listing_id    = m.listing_id
 AND t.revenue_month = m.revenue_month
LEFT JOIN portfolio_benchmarking_silver b
  ON b.listing_id    = m.listing_id
 AND b.revenue_month = m.revenue_month;
`.trim(),
  },
  {
    name: 'monthly_portfolio_summary',
    type: 'view',
    sql: `
CREATE OR REPLACE VIEW monthly_portfolio_summary AS
SELECT
  revenue_month,
  COUNT(DISTINCT listing_id)::integer    AS property_count,
  SUM(occupied_nights)::integer          AS total_nights,
  SUM(revenue)::numeric(14,2)            AS total_revenue,
  CASE WHEN SUM(occupied_nights) > 0
       THEN (SUM(revenue) / SUM(occupied_nights))::numeric(14,2)
       ELSE 0
  END                                    AS portfolio_adr
FROM monthly_metrics_silver
GROUP BY revenue_month;
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
