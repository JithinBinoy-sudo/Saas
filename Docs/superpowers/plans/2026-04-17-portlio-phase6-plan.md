# Portlio Phase 6 — Implementation Plan
# Pipeline Run History & Multi-User Invite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Portlio MVP with two final capabilities:

1. **Pipeline Run History** — A dedicated history page that lists every AI pipeline run the company has ever triggered, with status, model, month, triggered-by user, duration, and any error messages. Allows direct navigation to the resulting briefing. Admins can re-trigger a failed run from the history view.

2. **Multi-User Invite** — Admin users can invite colleagues to their company by email. Invitees receive a Supabase Auth invitation email, complete their own signup, and land directly on the dashboard with `role = 'member'`. Admins can manage team members (view list, change role, revoke access) from a Team settings page.

**Architecture:**
- **Run History:** The `pipeline_runs` table (already exists, has `company_id`, `revenue_month`, `status`, `model`, `triggered_by`, `started_at`, `completed_at`, `error_message`) is queried server-side with pagination. No schema changes needed.
- **Invite:** Uses Supabase Auth's `admin.inviteUserByEmail()` (service-role only). A new `invitations` table tracks pending invites (email, role, invited_by, expires_at, accepted). The signup callback route (`/auth/callback`) is updated to detect invite tokens and link the new user to the correct company.
- Both features surface in the Sidebar under "Settings" (Team) and a new top-level "History" nav item.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Auth Admin SDK, Supabase, Tailwind CSS, shadcn/ui, Zod.

**Reference:**
- `supabase/migrations/001_app_schema.sql` — `users`, `companies`, `pipeline_runs` tables
- `supabase/migrations/005_multi_provider_keys.sql` — most recent migration (next will be `006_invitations.sql`)
- `app/api/auth/` — existing signup and callback routes
- `components/layout/Sidebar.tsx` — add History + Team nav items
- `lib/encryption.ts` — not needed here, but note invite tokens are managed by Supabase Auth

---

## Folder Structure (new & modified files)

```
app/
├── api/
│   ├── team/
│   │   ├── invite/
│   │   │   └── route.ts            ← NEW: POST — send invite email
│   │   ├── members/
│   │   │   └── route.ts            ← NEW: GET — list team members
│   │   └── members/[id]/
│   │       └── route.ts            ← NEW: PATCH (role change) + DELETE (revoke)
│   └── auth/
│       └── callback/
│           └── route.ts            ← MODIFY: handle invite token → link user to company
└── (protected)/
    └── dashboard/
        ├── history/
        │   └── page.tsx            ← NEW: pipeline run history page
        └── settings/
            └── team/
                └── page.tsx        ← NEW: team management page

components/
├── history/
│   ├── RunHistoryTable.tsx         ← NEW: paginated table of pipeline_runs
│   ├── RunStatusBadge.tsx          ← NEW: reuses PipelineStatusBadge style
│   └── __tests__/
│       └── RunHistoryTable.test.tsx
└── settings/
    ├── InviteForm.tsx              ← NEW: email + role selector, send invite
    ├── TeamMemberTable.tsx         ← NEW: list members, change role, revoke
    └── __tests__/
        ├── InviteForm.test.tsx
        └── TeamMemberTable.test.tsx

supabase/
└── migrations/
    └── 006_invitations.sql         ← NEW: invitations table
```

Files modified (not created):
- `app/auth/callback/route.ts` — detect `type=invite` in token, insert user row with correct `company_id` and `role`.
- `components/layout/Sidebar.tsx` — add "History" top-level item + "Team" under Settings.
- `tasks.md` — check off Tasks 41–46.

---

## Design Notes (read before starting)

### `invitations` table (new migration `006`)

```sql
CREATE TABLE invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by   uuid NOT NULL REFERENCES users(id),
  token        text NOT NULL UNIQUE,   -- Supabase Auth invite token (for matching on callback)
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

RLS: admins of the same company can SELECT/INSERT/DELETE. No RLS for the service-role caller.

### Invite flow (step by step)

```
Admin fills InviteForm (email + role)
  → POST /api/team/invite
    → supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { company_id, role } })
    → INSERT invitations row (store token from response for callback matching)
    → Supabase sends the email automatically
  
User clicks link in email → /auth/callback?token_hash=...&type=invite
  → exchange token for session (supabaseAdmin.auth.verifyOtp)
  → look up invitations row by token
  → INSERT users row { id: newUser.id, company_id, role, email }
  → UPDATE invitations SET accepted_at = now()
  → redirect to /onboarding (skip — already in a company) → redirect to /dashboard
```

> **Important:** Invited users skip the onboarding wizard entirely. The middleware must check for the invite acceptance condition (user exists in `users` table and `schema_deployed = true` on their company) and route directly to `/dashboard`.

### Invite token strategy

`supabase.auth.admin.inviteUserByEmail()` returns the user object but **not** the raw OTP token. To match the callback back to the invitation, store the invited user's `auth.users.id` in the `invitations` table instead of the token string. On callback, the new session's `user.id` is used for the lookup.

Update schema accordingly:

```sql
-- 006_invitations.sql (revised)
invited_user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE  -- set on invite, used on callback
```

### Pipeline run history page

- **Route:** `/dashboard/history`
- **Data source:** `pipeline_runs` table, scoped by `company_id` via RLS.
- **Pagination:** 20 runs per page. Page number via URL param `?page=1`.
- **Columns:** Status badge | Month | Model | Triggered by (user name) | Started | Duration | Actions.
- **Duration:** `completed_at - started_at`, shown as `"12s"` or `"1m 3s"`. Null if still running/failed before completion.
- **Actions column:**
  - `complete` runs → "View Briefing" link to `/dashboard/briefings/[month]`.
  - `failed` runs → "Re-run" button (admin only) — triggers `POST /api/pipeline/run` for that month.
  - `running` / `pending` → no action, auto-refresh every 5 s (client polling).
- **Empty state:** "No pipeline runs yet. Go to the dashboard to generate your first briefing."

### Team management page

- **Route:** `/dashboard/settings/team` (admin only — middleware redirect for members).
- Shows a table of all users in the company: Name | Email | Role | Joined | Actions.
- Actions:
  - Change role (admin ↔ member) via `PATCH /api/team/members/[id]`.
  - Revoke access (DELETE from `users` + disable in Supabase Auth) via `DELETE /api/team/members/[id]`. Admins cannot revoke themselves.
- Shows pending invites (not yet accepted) with a "Resend" and "Cancel" option.
- `InviteForm` appears at the top of the page.
- **Guard:** At least one admin must remain — prevent the last admin from being demoted.

---

## Task 41: DB Migration — `invitations` Table

**Files:**
- Create: `supabase/migrations/006_invitations.sql`

- [ ] **Step 1: Write and apply migration**

```sql
-- Portlio Phase 6 — Invitations table
-- Tracks pending email invites sent by admins to new team members.

CREATE TABLE IF NOT EXISTS invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  role             text        NOT NULL DEFAULT 'member'
                     CHECK (role IN ('admin', 'member')),
  invited_by       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,  -- set immediately after inviteUserByEmail
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
```

- [ ] **Step 2: Apply via Supabase MCP / SQL Editor**
- [ ] **Step 3: Commit**
```
git add supabase/migrations/006_invitations.sql
git commit -m "chore(db): invitations table for multi-user invite"
```

---

## Task 42: Invite API Routes

**Files:**
- Create: `app/api/team/invite/route.ts`
- Create: `app/api/team/members/route.ts`
- Create: `app/api/team/members/[id]/route.ts`

### `POST /api/team/invite`

Admin-only.

**Request:**
```json
{ "email": "jane@example.com", "role": "member" }
```

**Logic:**
```
1. Auth → verify admin
2. Validate email (Zod), role ∈ ['admin', 'member']
3. Check no existing active invite for this email in this company
4. Check email not already a user in this company
5. supabaseAdmin.auth.admin.inviteUserByEmail(email, {
     redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
     data: { company_id, role }
   })
6. INSERT invitations { company_id, email, role, invited_by, invited_user_id: newUser.id, expires_at }
7. Return 200 { success: true }
```

**Errors:** `400` invalid input | `409` already invited/member | `403` not admin | `500` Supabase Auth error.

### `GET /api/team/members`

Returns all users + pending invitations for the company.

```json
{
  "members": [{ "id", "name", "email", "role", "created_at" }],
  "pendingInvites": [{ "id", "email", "role", "invited_by_name", "expires_at", "created_at" }]
}
```

### `PATCH /api/team/members/[id]`

Admin-only. Change role:
```json
{ "role": "admin" }
```
Guard: cannot demote if this user is the last admin in the company.

### `DELETE /api/team/members/[id]`

Admin-only. Cannot delete self.
- DELETE from `users` table (cascades via FK to auth).
- `supabaseAdmin.auth.admin.deleteUser(id)` to revoke session.

- [ ] **Step 1: Write tests** for all 5 endpoints (mock Supabase admin)
- [ ] **Step 2: Implement `POST /api/team/invite`**
- [ ] **Step 3: Implement `GET /api/team/members`**
- [ ] **Step 4: Implement `PATCH /api/team/members/[id]`** (with last-admin guard)
- [ ] **Step 5: Implement `DELETE /api/team/members/[id]`** (with self-delete guard)
- [ ] **Step 6: Run tests — verify pass**
- [ ] **Step 7: Commit**
```
git add app/api/team/
git commit -m "feat(team): invite + member management API routes"
```

---

## Task 43: Auth Callback — Invite Handling

**Files:**
- Modify: `app/auth/callback/route.ts`

The existing callback handles standard OAuth/magic-link flows. Add a branch for `type=invite`:

```ts
// app/auth/callback/route.ts (additions)

const type = requestUrl.searchParams.get('type');

if (type === 'invite') {
  // Exchange token
  const { data: { session }, error } = await supabaseAdmin.auth.verifyOtp({
    token_hash: requestUrl.searchParams.get('token_hash')!,
    type: 'invite',
  });
  if (error || !session) return redirect('/auth?error=invalid_invite');

  const newUserId = session.user.id;
  const email = session.user.email!;

  // Look up invitation by invited_user_id
  const { data: invite } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('invited_user_id', newUserId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invite) return redirect('/auth?error=invite_expired');

  // Create user row
  await supabaseAdmin.from('users').insert({
    id: newUserId,
    company_id: invite.company_id,
    role: invite.role,
    email,
    name: session.user.user_metadata?.full_name ?? null,
  });

  // Mark invite accepted
  await supabaseAdmin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return redirect('/dashboard');
}
```

Middleware update: the existing `schema_deployed` guard must also check that the invited user has a `users` row (they won't have gone through onboarding). Since they're joining an existing company, `schema_deployed` will already be `true` on the company. The existing flow handles this correctly — no middleware changes needed.

- [ ] **Step 1: Implement invite branch in `app/auth/callback/route.ts`**
- [ ] **Step 2: Test manually** — send a real invite, accept, verify user row created with correct company and role
- [ ] **Step 3: Commit**
```
git add app/auth/callback/route.ts
git commit -m "feat(auth): invite token handling in auth callback"
```

---

## Task 44: Pipeline Run History Page

**Files:**
- Create: `app/(protected)/dashboard/history/page.tsx`
- Create: `components/history/RunHistoryTable.tsx`
- Create: `components/history/RunStatusBadge.tsx`
- Create: `components/history/__tests__/RunHistoryTable.test.tsx`

### `RunStatusBadge`

Thin wrapper around the `PipelineStatusBadge` from Phase 4, styled consistently with the history table rows.

### `RunHistoryTable`

Client component. Props:
```ts
type Props = {
  runs: PipelineRunRow[];
  totalCount: number;
  page: number;
  isAdmin: boolean;
};

type PipelineRunRow = {
  id: string;
  revenue_month: string;
  status: PipelineRunStatus;
  model: string | null;
  triggered_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};
```

Features:
- Renders as a shadcn/ui `<Table>`.
- **Pagination:** Previous/Next buttons update `?page=` URL param.
- **Duration column:** `completed_at - started_at` formatted as `"12s"` or `"1m 3s"`. Shows `—` for incomplete runs.
- **Actions column:**
  - `complete` → `<Link href="/dashboard/briefings/[month]">View Briefing</Link>`
  - `failed` + isAdmin → "Re-run" button — calls `POST /api/pipeline/run` with that month's last-used model. Shows inline spinner during re-run.
  - `running` / `pending` → spinner icon. Page auto-polls every 5 s if any run has `running`/`pending` status (client-side `setInterval` cleared on unmount).
- **Error accordion:** `failed` rows show a collapsible error message cell.

### History page (server component)

```tsx
// /dashboard/history — Server Component
// Fetches pipeline_runs with JOIN to users for triggered_by_name
// Passes page, runs (20 per page), totalCount, isAdmin to RunHistoryTable
```

Query:
```sql
SELECT
  pr.*,
  u.name AS triggered_by_name
FROM pipeline_runs pr
LEFT JOIN users u ON u.id = pr.triggered_by
WHERE pr.company_id = $company_id
ORDER BY pr.started_at DESC
LIMIT 20 OFFSET ($page - 1) * 20;
```

- [ ] **Step 1: Implement `RunStatusBadge.tsx`**
- [ ] **Step 2: Implement `RunHistoryTable.tsx`** with pagination, duration, actions, auto-poll
- [ ] **Step 3: Implement history page** (server component, JOIN query, page param)
- [ ] **Step 4: Write tests** — table renders all status variants, pagination buttons, error accordion
- [ ] **Step 5: Run tests — verify pass**
- [ ] **Step 6: Commit**
```
git add app/(protected)/dashboard/history/ components/history/
git commit -m "feat(history): pipeline run history page"
```

---

## Task 45: Team Management UI

**Files:**
- Create: `app/(protected)/dashboard/settings/team/page.tsx`
- Create: `components/settings/InviteForm.tsx`
- Create: `components/settings/TeamMemberTable.tsx`
- Create: `components/settings/__tests__/InviteForm.test.tsx`
- Create: `components/settings/__tests__/TeamMemberTable.test.tsx`

### `InviteForm`

Client component. Props: `companyId: string`.

```
Email address: [________________________]
Role:          [Member ▼]  (Member | Admin)
               [Send Invite]
```

Calls `POST /api/team/invite`. States:
- `idle` — form ready.
- `loading` — spinner, inputs disabled.
- `success` — "Invite sent to jane@example.com" green message. Form resets.
- `error` — inline message (duplicate invite, already a member, etc.).

### `TeamMemberTable`

Client component. Props: `members: MemberRow[], pendingInvites: InviteRow[], isAdmin: boolean`.

**Members section** — table: Avatar | Name | Email | Role | Joined | Actions.
- Role cell: if admin, shows a `<Select>` to toggle between `admin`/`member`. Disabled for self.
- Actions: "Remove" button (red, confirm dialog). Disabled for self.

**Pending Invites section** — table: Email | Role | Invited by | Expires | Actions.
- Actions: "Resend" (re-calls `POST /api/team/invite`) + "Cancel" (DELETE the invitation row — add `DELETE /api/team/invites/[id]/route.ts`).

### Team settings page (server component)

```tsx
// /dashboard/settings/team — admin-only (middleware redirects members)
// Fetches members + pending invites from GET /api/team/members
// Renders InviteForm + TeamMemberTable
```

- [ ] **Step 1: Implement `InviteForm.tsx`**
- [ ] **Step 2: Implement `TeamMemberTable.tsx`** with role change, revoke, resend/cancel invite
- [ ] **Step 3: Implement team settings page**
- [ ] **Step 4: Add `DELETE /api/team/invites/[id]/route.ts`** (cancel a pending invite)
- [ ] **Step 5: Write tests** — form states, table renders, role selector, confirm dialog
- [ ] **Step 6: Run tests — verify pass**
- [ ] **Step 7: Commit**
```
git add app/(protected)/dashboard/settings/team/ components/settings/InviteForm.tsx
git add components/settings/TeamMemberTable.tsx app/api/team/
git commit -m "feat(team): team management UI + invite form"
```

---

## Task 46: Sidebar Update, Middleware & Final Verification

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `middleware.ts`

### Sidebar additions

```
Dashboard
Upload
Briefings
History              ← NEW top-level item

Settings
  AI Prompt          (admin only)
  Export Data
  Team               ← NEW (admin only)
```

### Middleware update

Add admin-only guard for `/dashboard/settings/team` (redirect members to `/dashboard`).
The existing `schema_deployed` guard already handles invited users correctly since their company has `schema_deployed = true`.

- [ ] **Step 1: Update `Sidebar.tsx`** — add History + Team nav items with correct role visibility
- [ ] **Step 2: Update `middleware.ts`** — add `/dashboard/settings/team` admin guard
- [ ] **Step 3: Full manual verification**
  - Admin sends invite to a new email → invite email arrives.
  - New user accepts invite → lands on dashboard (skips onboarding).
  - New user appears in Team page with correct role.
  - Admin changes member role → next page load reflects new role.
  - Admin revokes a member → they can no longer log in.
  - Last admin cannot be demoted (UI shows disabled role selector; API returns 409).
  - History page shows all pipeline runs with correct status, model, duration.
  - Failed run → "Re-run" button triggers new run; history auto-updates.
  - Running run → spinner; page auto-polls until status changes.
  - Non-admin cannot access Team page (middleware redirects).
  - BYOS company: invite/team management works (users table is always in app Supabase).
- [ ] **Step 4: Run all tests**
```
npm test
```
- [ ] **Step 5: Commit**
```
git add components/layout/Sidebar.tsx middleware.ts
git commit -m "feat(phase6): sidebar + middleware + Phase 6 complete"
```

---

## Verification Plan

### Automated Tests
- `app/api/team/__tests__/` — 403 for non-admin, 409 for duplicate invite, last-admin guard, self-delete guard.
- `components/history/__tests__/RunHistoryTable.test.tsx` — all status variants, pagination, error accordion, auto-poll setup.
- `components/settings/__tests__/InviteForm.test.tsx` — form states (idle, loading, success, error).
- `components/settings/__tests__/TeamMemberTable.test.tsx` — renders members + pending, role selector, confirm dialog.
- Full suite: `npm test` should remain green and test count should be higher than Phase 5.

### Manual Verification
1. Send invite → email received → accept → user on dashboard with correct role.
2. Re-send invite for same email before acceptance → 409.
3. Cancel invite before acceptance → invite removed; invite link now shows expired error.
4. Demote last admin → blocked with error message.
5. Revoke member → their session is invalidated immediately.
6. History page: complete, failed, running, pending all render correctly.
7. Failed run re-triggered from history → status flips to `running` then `complete`.
8. Auto-poll stops once no `running`/`pending` runs remain (verify no interval leak).
