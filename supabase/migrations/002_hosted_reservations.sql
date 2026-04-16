-- Portlio Phase 1 — Hosted-mode reservations + briefings
-- This migration is for the APP Supabase (hosted mode). BYOS databases receive
-- a variant without company_id, deployed via lib/schema/byos-ddl.ts.
--
-- Schema shape: the 7 required fields are typed columns. Every other column a
-- company maps during onboarding (from Excel or a connected Supabase) lands in
-- the `data` jsonb payload. This keeps the APP schema static across companies
-- while letting each tenant carry their own optional columns end-to-end.
-- Primary key is (company_id, confirmation_code) to prevent cross-company
-- collisions on the external confirmation code namespace.

CREATE TABLE IF NOT EXISTS reservations (
  company_id                uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Required (7)
  confirmation_code         text        NOT NULL,
  listing_nickname          text        NOT NULL,
  check_in_date             date        NOT NULL,
  check_out_date            date        NOT NULL,
  nights                    integer     NOT NULL,
  net_accommodation_fare    numeric(14,2) NOT NULL,
  listing_id                text        NOT NULL,

  -- Company-specific columns mapped during onboarding.
  data                      jsonb       NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (company_id, confirmation_code)
);

CREATE INDEX IF NOT EXISTS reservations_company_check_in_idx
  ON reservations(company_id, check_in_date);
CREATE INDEX IF NOT EXISTS reservations_company_listing_idx
  ON reservations(company_id, listing_id);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_company_isolation" ON reservations
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- monthly_portfolio_briefings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_portfolio_briefings (
  company_id         uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  revenue_month      date        NOT NULL,
  portfolio_summary  text,
  property_count     integer,
  data_hash          text,
  generated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, revenue_month)
);

ALTER TABLE monthly_portfolio_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefings_company_isolation" ON monthly_portfolio_briefings
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
