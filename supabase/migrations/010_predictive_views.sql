-- Phase 9 — Predictive Analytics
-- Risk scoring view + revenue forecast results table.

-- 1. property_risk_score_silver
-- Computes a 0–100 composite risk score per property per month:
--   - Momentum: # negative MoM months in last 3 months (×20 pts each, up to 60)
--   - Relative underperformance: revenue < 70% of portfolio median (30 pts)
--   - Acceleration: MoM drop > 20% of revenue (30 pts)
-- Score is clamped to [0, 100].
CREATE OR REPLACE VIEW property_risk_score_silver
  WITH (security_invoker = on) AS
SELECT
  m.company_id,
  m.listing_id,
  m.listing_nickname,
  m.revenue_month,
  SUM(CASE WHEN t.revenue_delta < 0 THEN 1 ELSE 0 END)
    OVER (PARTITION BY m.company_id, m.listing_id
          ORDER BY m.revenue_month
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS negative_months_in_3m,
  CASE WHEN b.portfolio_median_revenue > 0
       THEN (m.revenue - b.portfolio_median_revenue) / b.portfolio_median_revenue
       ELSE NULL END AS revenue_vs_median_pct,
  LEAST(100, GREATEST(0,
    (SUM(CASE WHEN t.revenue_delta < 0 THEN 1 ELSE 0 END)
       OVER (PARTITION BY m.company_id, m.listing_id
             ORDER BY m.revenue_month
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) * 20)
    + CASE WHEN m.revenue < b.portfolio_median_revenue * 0.7 THEN 30 ELSE 0 END
    + CASE WHEN t.revenue_delta < -0.2 * m.revenue    THEN 30 ELSE 0 END
  )) AS risk_score
FROM monthly_metrics_silver m
LEFT JOIN mom_trends_silver t
  USING (company_id, listing_id, revenue_month)
LEFT JOIN portfolio_benchmarking_silver b
  USING (company_id, listing_id, revenue_month);

-- 2. revenue_forecasts table
-- Stores ML forecast results written by the Railway forecast service.
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  company_id         uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  listing_id         text        NOT NULL,
  forecast_month     date        NOT NULL,  -- the month being predicted
  predicted_revenue  numeric(14,2) NOT NULL,
  lower_bound        numeric(14,2),         -- 80% confidence lower
  upper_bound        numeric(14,2),         -- 80% confidence upper
  model_used         text        NOT NULL,  -- 'prophet' or 'arima'
  generated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, listing_id, forecast_month)
);

ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecasts_company_isolation" ON revenue_forecasts
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
