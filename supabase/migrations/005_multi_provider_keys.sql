-- Portlio Phase 4 — Multi-provider AI key columns
-- Add Anthropic and Google key columns to companies.
-- Add model column to pipeline_runs and monthly_portfolio_briefings.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS anthropic_api_key text,
  ADD COLUMN IF NOT EXISTS google_api_key    text;

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS model text;

ALTER TABLE monthly_portfolio_briefings
  ADD COLUMN IF NOT EXISTS model text;
