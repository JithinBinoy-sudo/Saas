-- Portlio Phase X — Add briefing_name to briefings
ALTER TABLE IF EXISTS monthly_portfolio_briefings
  ADD COLUMN IF NOT EXISTS briefing_name text;

