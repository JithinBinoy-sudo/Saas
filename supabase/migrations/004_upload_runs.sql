-- Phase 2 — upload_runs
-- Records every reservation-upload attempt per company. Status transitions:
-- running → complete | failed. Per-row errors aren't stored here; the API
-- response carries them. error_message captures any global failure (e.g. an
-- upsert rejection from the underlying data client).

CREATE TABLE IF NOT EXISTS upload_runs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filename       text        NOT NULL,
  total_rows     integer     NOT NULL DEFAULT 0,
  inserted       integer     NOT NULL DEFAULT 0,
  failed         integer     NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'complete', 'failed')),
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS upload_runs_company_started_idx
  ON upload_runs(company_id, started_at DESC);

ALTER TABLE upload_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upload_runs_company_isolation" ON upload_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
