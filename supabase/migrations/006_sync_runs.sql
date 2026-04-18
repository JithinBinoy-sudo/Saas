-- 006_sync_runs.sql — Tracks on-demand BYOS → Portlio reservation syncs

CREATE TABLE IF NOT EXISTS sync_runs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status         text        NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
  rows_synced    integer,
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE INDEX sync_runs_company_idx ON sync_runs(company_id, started_at DESC);

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_runs_company_isolation" ON sync_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
