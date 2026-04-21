-- Persist onboarding wizard position so users resume after login / refresh.
-- onboarding_wizard_mode is the user's chosen path (hosted vs byos) before BYOS
-- deploy flips companies.mode — do not use companies.mode alone mid-wizard.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS onboarding_wizard_step smallint NOT NULL DEFAULT 1
    CHECK (onboarding_wizard_step >= 1 AND onboarding_wizard_step <= 4);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS onboarding_wizard_mode text
    CHECK (onboarding_wizard_mode IS NULL OR onboarding_wizard_mode IN ('hosted', 'byos'));

-- Companies that already finished setup (pre-migration)
UPDATE companies
SET onboarding_wizard_step = 3
WHERE schema_deployed = true AND mode = 'hosted';

UPDATE companies
SET onboarding_wizard_step = 4
WHERE schema_deployed = true AND mode = 'byos';

-- BYOS in progress: mapping saved locally but external schema not deployed yet
UPDATE companies c
SET
  onboarding_wizard_mode = 'byos',
  onboarding_wizard_step = 4
WHERE c.schema_deployed = false
  AND c.mode = 'hosted'
  AND EXISTS (SELECT 1 FROM column_mappings m WHERE m.company_id = c.id);
