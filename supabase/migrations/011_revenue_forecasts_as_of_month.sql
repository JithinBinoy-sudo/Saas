-- Phase 9b — Anchor-aware forecasting
-- Add as_of_month to key forecast rows by training cutoff month.

ALTER TABLE revenue_forecasts
  ADD COLUMN IF NOT EXISTS as_of_month date;

-- Backfill for existing rows (best-effort): use forecast_month as anchor.
UPDATE revenue_forecasts
SET as_of_month = forecast_month
WHERE as_of_month IS NULL;

ALTER TABLE revenue_forecasts
  ALTER COLUMN as_of_month SET NOT NULL;

-- Replace primary key so we can store multiple anchors.
ALTER TABLE revenue_forecasts
  DROP CONSTRAINT IF EXISTS revenue_forecasts_pkey;

ALTER TABLE revenue_forecasts
  ADD CONSTRAINT revenue_forecasts_pkey
  PRIMARY KEY (company_id, listing_id, as_of_month, forecast_month);

