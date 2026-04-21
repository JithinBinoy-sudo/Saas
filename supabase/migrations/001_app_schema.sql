-- Portlio Phase 1 — App Schema
-- Tables: companies, users, prompt_configs, pipeline_runs, column_mappings
-- RLS is enabled on every table. Policies scope rows to the caller's company via auth.uid().

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  mode                  text        NOT NULL DEFAULT 'hosted'
                          CHECK (mode IN ('hosted', 'byos')),
  supabase_url          text,
  supabase_service_key  text,
  openai_api_key        text,
  schema_deployed       boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member')),
  name        text,
  email       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Companies policy depends on the users table, so it is created after users.
CREATE POLICY "company_self_read" ON companies
  FOR SELECT
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "company_self_update" ON companies
  FOR UPDATE
  USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_self_read" ON users
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "users_self_update" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- prompt_configs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompt_configs (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                  text        NOT NULL DEFAULT 'portfolio_analysis',
  system_prompt         text        NOT NULL,
  user_prompt_template  text        NOT NULL,
  model                 text        NOT NULL DEFAULT 'gpt-4o',
  temperature           real        NOT NULL DEFAULT 0.3,
  max_tokens            integer     NOT NULL DEFAULT 2000,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid        REFERENCES users(id),
  CONSTRAINT prompt_configs_company_id_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS prompt_configs_company_id_idx ON prompt_configs(company_id);

ALTER TABLE prompt_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompt_configs_company_isolation" ON prompt_configs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- pipeline_runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  revenue_month  date        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  triggered_by   uuid        REFERENCES users(id),
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  error_message  text
);

CREATE INDEX IF NOT EXISTS pipeline_runs_company_month_idx
  ON pipeline_runs(company_id, revenue_month);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_runs_company_isolation" ON pipeline_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- column_mappings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS column_mappings (
  company_id      uuid        PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  mappings        jsonb       NOT NULL,
  sample_headers  jsonb       NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "column_mappings_company_isolation" ON column_mappings
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
