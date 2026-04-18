# Portlio Phase 1 — Foundation Tasks

- [x] Git init the workspace
- [x] Task 1: Project Scaffold (Next.js, Tailwind, shadcn, Jest)
- [x] Task 2: Database Migrations (001-003)
- [x] Task 3: Encryption Utility (AES-256-GCM)
- [x] Task 4: Supabase Client Helpers
- [x] Task 5: getDataClient Routing Abstraction
- [x] Task 6: Zod Validation Schemas
- [x] Task 7: Signup API Route
- [x] Final code review for foundation
- [x] Architecture refresh: reservations use JSONB `data` column; rename `arca_id` → `listing_id`

## Phase 1 — Auth & Onboarding (next steps)

- [x] Task 8: Route Protection Middleware
- [x] Task 9: Auth Page UI (Login + Signup forms, callback route)
- [x] Task 10: Onboarding — StepIndicator & Mode Selector (Step 1)
- [x] Task 11: Onboarding — OpenAI Key Step (Step 2)
- [x] Task 12: Sample Excel Generator (refreshed: 7 required + example optionals + readme sheet)
- [x] Task 13: Column Mapping Step (refreshed: required / custom-field / skip dropdown; customs land in `data` jsonb)
- [x] Task 14: Deploy Schema Step — BYOS Only (refreshed: single-source `lib/schema/byos-ddl.ts`)
- [x] Task 15: Onboarding Wizard Container
- [x] Task 16: Dashboard Shell & Sidebar
- [x] Task 17: Landing Page
- [x] Task 18: Full End-to-End Verification (63 tests passing, clean typecheck, production build)

Plan reference: `Docs/superpowers/plans/2026-04-14-portlio-phase1-plan.md`

## Phase 2 — Excel Upload & Data Ingestion

- [x] Task 19: Excel Upload API Route (Parse Excel, map columns, upsert to reservations)
- [x] Task 20: Upload Page UI (Drag-and-drop, UI preview, progress feedback)
- [x] Task 21: Data Validation Layer (Row-level validation checks)
- [x] Task 22: Upload History (upload_runs table and history page)

Plan reference: `Docs/superpowers/plans/2026-04-16-portlio-phase2-plan.md`

## Phase 3 — Analytics Dashboard

- [x] Task 23: Analytics Query Layer (`lib/analytics/queries.ts` + types + tests)
- [x] Task 24: KPI Card Components (`KpiCard`, `KpiCardRow`)
- [x] Task 25: Revenue Trend Chart (Recharts `ComposedChart` — bar + line)
- [x] Task 26: Property Breakdown Table (sortable, delta-coloured)
- [x] Task 27: Channel Mix Chart (Recharts `PieChart`)
- [x] Task 28: Wire Up Dashboard Page (MonthPicker, empty state, server component data fetch)

Plan reference: `Docs/superpowers/plans/2026-04-17-portlio-phase3-plan.md`

## Phase 4 — AI Pipeline Runner (Multi-Provider) & Briefing Viewer

- [x] Task 29: DB Migration — add `anthropic_api_key`, `google_api_key` to companies; `model` to pipeline_runs + briefings
- [x] Task 30: Pipeline Library — Types, `computeHash`, `getProvider` (infer provider from model ID)
- [x] Task 31: Provider Adapters — `AIProvider` interface + OpenAI, Anthropic, Google implementations
      - Google models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview` (Preview), `gemini-3.1-flash-lite-preview` (Preview)
- [x] Task 32: `buildPrompt` — provider-agnostic prompt assembly from monthly data
- [x] Task 33: `POST /api/pipeline/run` (multi-provider route) + `PATCH /api/pipeline/config` (save preferred model)
- [x] Task 34: Onboarding — update AI Keys step to multi-tab (OpenAI | Claude | Gemini) with per-provider validation
- [x] Task 35: Run Pipeline UI — model selector dropdown with "Preview" badge on Gemini 3.x models, Briefing Viewer page, Dashboard & Sidebar integration

Plan reference: `Docs/superpowers/plans/2026-04-17-portlio-phase4-plan.md`

## Phase 5 — Admin Prompt Management & Excel Report Export

- [x] Task 36: Prompt Config API (`GET + PATCH /api/pipeline/prompt`) + `preview: true` mode on pipeline run route
- [x] Task 37: Prompt Management UI (`/dashboard/settings/prompt`) — form with all `prompt_configs` fields, placeholder warnings, test-run panel
- [x] Task 38: Excel Export Library (`lib/export/buildReservationReport.ts`) — two-sheet workbook with Summary + Raw Reservations (JSONB expansion)
- [x] Task 39: Export API Route (`GET /api/export/reservations`) + Export UI (`ExportButton`, `/dashboard/settings/export` page)
- [x] Task 40: Sidebar Settings group + full end-to-end verification

Plan reference: `Docs/superpowers/plans/2026-04-17-portlio-phase5-plan.md`

## Phase 6 — Pipeline Run History & Multi-User Invite

- [x] Task 41: DB Migration — `invitations` table (`006_invitations.sql`)
- [x] Task 42: Team API Routes — `POST /api/team/invite`, `GET /api/team/members`, `PATCH + DELETE /api/team/members/[id]`
- [x] Task 43: Auth Callback — invite token branch (link new user to company, skip onboarding)
- [x] Task 44: Pipeline Run History Page (`/dashboard/history`) — paginated table, duration, re-run, auto-poll
- [x] Task 45: Team Management UI (`/dashboard/settings/team`) — `InviteForm`, `TeamMemberTable` (role change, revoke, resend/cancel invite)
- [x] Task 46: Sidebar (History + Team nav items), middleware admin guard, full end-to-end verification

Plan reference: `Docs/superpowers/plans/2026-04-17-portlio-phase6-plan.md`

## Phase 7 — BYOS View Migration

- [x] Task 1: DB Migration — `006_sync_runs.sql`
- [x] Task 2: Trim byos-ddl.ts
- [x] Task 3: Make companyId required in queries.ts
- [x] Task 4: Update Dashboard page to use app client
- [x] Task 5: Update Briefing page to use app client
- [x] Task 6: Update Export Settings to use app client
- [x] Task 7: Update Prompt Settings to use app client
- [x] Task 8: Update Pipeline route to use app client
- [x] Task 9: Update Export route to use app client
- [x] Task 10: Create Sync API route
- [x] Task 11: Add dual-write to Upload route
- [x] Task 12: Create SyncCard component
- [x] Task 13: Add SyncCard to Settings page

Plan reference: `Docs/superpowers/specs/2026-04-18-byos-view-migration-design.md`
