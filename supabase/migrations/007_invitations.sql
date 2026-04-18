-- Portlio Phase 6 — Invitations table
-- Tracks pending email invites sent by admins to new team members.

CREATE TABLE IF NOT EXISTS invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  role             text        NOT NULL DEFAULT 'member'
                     CHECK (role IN ('admin', 'member')),
  invited_by       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id  uuid,  -- set immediately after inviteUserByEmail; used on callback to match
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_company_id_idx ON invitations(company_id);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);
CREATE INDEX IF NOT EXISTS invitations_invited_user_id_idx ON invitations(invited_user_id);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admins of the same company can see and manage invitations
CREATE POLICY "invitations_company_isolation" ON invitations
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
