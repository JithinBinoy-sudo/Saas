-- Portlio Phase 1 — Hosted-mode SQL views
-- All views use security_invoker = on so that RLS on the underlying
-- reservations table transparently scopes results to the caller's company.

-- 1. nights_exploded_silver
-- One row per occupied night. Supports nightly metrics and channel mix.
CREATE OR REPLACE VIEW nights_exploded_silver
  WITH (security_invoker = on) AS
SELECT
  r.company_id,
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

-- 2. monthly_metrics_silver
-- Per property per month: nights, revenue, ADR, occupancy basics.
CREATE OR REPLACE VIEW monthly_metrics_silver
  WITH (security_invoker = on) AS
SELECT
  company_id,
  listing_id,
  listing_nickname,
  revenue_month,
  COUNT(*)::integer               AS occupied_nights,
  SUM(nightly_fare)::numeric(14,2) AS revenue,
  CASE WHEN COUNT(*) > 0
       THEN (SUM(nightly_fare) / COUNT(*))::numeric(14,2)
       ELSE 0
  END                              AS adr
FROM nights_exploded_silver
GROUP BY company_id, listing_id, listing_nickname, revenue_month;

-- 3. mom_trends_silver
-- Month-over-month deltas by property.
CREATE OR REPLACE VIEW mom_trends_silver
  WITH (security_invoker = on) AS
SELECT
  m.company_id,
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
WINDOW w AS (PARTITION BY m.company_id, m.listing_id ORDER BY m.revenue_month);

-- 4. monthly_channel_mix_silver
-- Channel share by property by month.
CREATE OR REPLACE VIEW monthly_channel_mix_silver
  WITH (security_invoker = on) AS
SELECT
  company_id,
  listing_id,
  listing_nickname,
  revenue_month,
  COALESCE(channel, source, 'unknown') AS channel_label,
  COUNT(*)::integer                    AS nights,
  SUM(nightly_fare)::numeric(14,2)     AS revenue
FROM nights_exploded_silver
GROUP BY company_id, listing_id, listing_nickname, revenue_month,
         COALESCE(channel, source, 'unknown');

-- 5. channel_mix_summary
-- Portfolio-wide channel share across all months.
CREATE OR REPLACE VIEW channel_mix_summary
  WITH (security_invoker = on) AS
SELECT
  company_id,
  channel_label,
  SUM(nights)::integer             AS total_nights,
  SUM(revenue)::numeric(14,2)      AS total_revenue,
  (SUM(revenue) / NULLIF(SUM(SUM(revenue)) OVER (PARTITION BY company_id), 0))
    ::numeric(10,4)                AS revenue_share
FROM monthly_channel_mix_silver
GROUP BY company_id, channel_label;

-- 6. portfolio_benchmarking_silver
-- Per property vs. portfolio median for the same month.
CREATE OR REPLACE VIEW portfolio_benchmarking_silver
  WITH (security_invoker = on) AS
SELECT
  m.company_id,
  m.listing_id,
  m.listing_nickname,
  m.revenue_month,
  m.revenue,
  m.adr,
  m.occupied_nights,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.revenue)
    OVER (PARTITION BY m.company_id, m.revenue_month) AS portfolio_median_revenue,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.adr)
    OVER (PARTITION BY m.company_id, m.revenue_month) AS portfolio_median_adr
FROM monthly_metrics_silver m;

-- 7. final_reporting_gold
-- Denormalized, ready-for-report row per property per month.
CREATE OR REPLACE VIEW final_reporting_gold
  WITH (security_invoker = on) AS
SELECT
  m.company_id,
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
  ON t.company_id = m.company_id
 AND t.listing_id = m.listing_id
 AND t.revenue_month = m.revenue_month
LEFT JOIN portfolio_benchmarking_silver b
  ON b.company_id = m.company_id
 AND b.listing_id = m.listing_id
 AND b.revenue_month = m.revenue_month;

-- 8. monthly_portfolio_summary
-- One row per company per month — input for GPT-4o briefings.
CREATE OR REPLACE VIEW monthly_portfolio_summary
  WITH (security_invoker = on) AS
SELECT
  company_id,
  revenue_month,
  COUNT(DISTINCT listing_id)::integer       AS property_count,
  SUM(occupied_nights)::integer          AS total_nights,
  SUM(revenue)::numeric(14,2)            AS total_revenue,
  CASE WHEN SUM(occupied_nights) > 0
       THEN (SUM(revenue) / SUM(occupied_nights))::numeric(14,2)
       ELSE 0
  END                                    AS portfolio_adr
FROM monthly_metrics_silver
GROUP BY company_id, revenue_month;
