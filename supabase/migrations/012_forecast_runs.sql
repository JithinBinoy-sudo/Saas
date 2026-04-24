-- Phase 9c — Forecast run deduplication
-- Prevent repeated forecast compute for same company + as_of_month.

CREATE TABLE IF NOT EXISTS forecast_runs (
  company_id   uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  as_of_month  date        NOT NULL,
  status       text        NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error        text,
  PRIMARY KEY (company_id, as_of_month)
);

ALTER TABLE forecast_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forecast_runs_company_isolation" ON forecast_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

