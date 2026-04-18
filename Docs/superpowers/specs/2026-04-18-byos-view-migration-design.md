# BYOS View Migration Design

**Date:** 2026-04-18
**Status:** Approved
**Goal:** Move analytics views from the company's Supabase (BYOS) into Portlio's own database. Introduce an on-demand sync mechanism so reservation data added directly to the company's Supabase is pulled into Portlio for querying.

---

## Background

In the current BYOS flow, the deploy step creates both tables and all 8 analytics views inside the company's own Supabase. This means any change to view logic (new metric, formula fix) requires re-deploying SQL to every BYOS customer's database. It also makes the company's Supabase more complex than necessary.

The hosted mode already has views centralized in Portlio's DB with `company_id` + RLS for isolation. The goal is for BYOS companies to use those same views — no separate code path for analytics.

---

## Chosen Approach: Sync & Copy

When triggered on demand, Portlio pulls all rows from the company's `reservations` table, maps any extra columns into the `data` jsonb field, and upserts them into Portlio's hosted `reservations` table with `company_id`. Views in Portlio's DB then work identically for hosted and BYOS companies — no branching needed.

---

## Section 1: Onboarding Deploy Step Changes

**Current:** Deploys 2 tables + 8 views + bootstrap function to the company's Supabase.

**New:** Deploys only the `reservations` table + bootstrap function. No views, no `monthly_portfolio_briefings`.

`lib/schema/byos-ddl.ts` is trimmed to:
- `BYOS_DDL` array containing only the `reservations` table DDL
- `BYOS_BOOTSTRAP_SQL` unchanged (still needed for the deploy mechanism)

The `monthly_portfolio_briefings` table is removed from the BYOS deploy — it already exists in Portlio's app schema (`002_hosted_reservations.sql`) with `company_id` and is used from there for all companies.

The company's Supabase ends up with exactly one Portlio-owned table: `reservations`. Nothing else.

---

## Section 2: Sync Flow

**Trigger:** On-demand via a "Sync Now" button in the dashboard. No background polling.

**API route:** `POST /api/sync/reservations`

**Steps:**
1. Authenticate the calling user; resolve `company_id`
2. Fetch company row from `companies` table; assert `mode = 'byos'`
3. Check rate limit: max 10 syncs per company per day (tracked via `sync_runs`)
4. Insert a `sync_runs` row with `status = 'running'`
5. Connect to company's Supabase via `getDataClient()`
6. `SELECT *` all rows from their `reservations` table
7. For each row:
   - Extract the 7 required fields as typed columns
   - Merge remaining columns + any existing `data` jsonb contents into a single `data` object
   - Add `company_id`
8. Upsert batch into Portlio's `reservations` table with `onConflict: 'company_id,confirmation_code'`
9. Update `sync_runs` row: `status = 'complete'`, `rows_synced`, `completed_at`

**Error handling:** Any failure updates the `sync_runs` row to `status = 'failed'` with `error_message`. Returns a clear error to the UI.

**Excel upload dual-write (BYOS):** When a BYOS company uploads Excel through `/api/upload/reservations`, it continues to write to the company's Supabase (source of truth) and now also upserts into Portlio's hosted `reservations` table. This avoids the need to manually sync after every Excel upload.

---

## Section 3: Dashboard & Query Layer Changes

**Current:** `getDataClient()` returns the company's Supabase client for BYOS. All analytics queries (views, pipeline, export) use this client — so BYOS queries hit the company's DB.

**New:** All analytics queries always use Portlio's app client regardless of company mode. The hosted views (`003_hosted_views.sql`) already include `company_id` and use `security_invoker = on` with RLS — they work for BYOS companies once data is synced in.

`getDataClient()` is retained but narrowed to two uses only:
- **Sync route** — reads raw data from the company's Supabase
- **Upload route** — dual-writes to the company's Supabase

All other routes (`lib/analytics/queries.ts`, `/api/pipeline/run`, `/api/export/reservations`, settings pages) switch from `getDataClient()` to the standard app Supabase client. The `mode` check for analytics is removed entirely.

---

## Section 4: Sync Tracking & UI

**New migration:** `006_sync_runs.sql`

```sql
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
```

**UI:** New "Data Sync" card in the Settings page, visible only to BYOS companies. Displays:
- Last sync: timestamp + row count (or "Never synced")
- "Sync Now" button — disabled while a sync is running
- Inline status: syncing spinner / success / error message

Hosted companies do not see this section.

---

## Section 5: Extra Column Handling

When syncing, the company's `reservations` table may have columns beyond the 7 required ones (added directly via SQL after onboarding).

**Discovery:** The sync route queries `information_schema.columns` where `table_name = 'reservations'` to get the full column list before fetching data. This works even if the table is empty. It does not rely on the saved column mapping — that mapping is only for Excel uploads.

**Packing strategy:**
- 7 required fields → typed columns in Portlio's `reservations` table
- All other columns + the existing `data` jsonb contents → merged into a single `data` jsonb object in Portlio

**Example:**
```
Company's DB row:
  confirmation_code: "HM-100"
  listing_nickname:  "Sunset Loft"
  guest_name:        "John"           ← extra column
  phone:             "+1234"          ← extra column
  data:              { "channel": "Airbnb" }

Synced to Portlio as:
  company_id:               "abc-123"
  confirmation_code:        "HM-100"
  listing_nickname:         "Sunset Loft"
  data: { "channel": "Airbnb", "guest_name": "John", "phone": "+1234" }
```

---

## Section 6: Migration Path for Existing BYOS Companies

**Existing BYOS companies** (already onboarded with views in their DB):
- No action required on their Supabase — the old views sit there harmlessly
- Their first "Sync Now" pull seeds Portlio's DB with their data
- Analytics start working immediately after first sync

**New BYOS companies** (onboarded after this change):
- Deploy step creates `reservations` table only — clean from the start

**Hosted companies:** Completely unaffected. No code or schema changes touch the hosted path.

---

## Files Changed

| File | Change |
|---|---|
| `lib/schema/byos-ddl.ts` | Remove all views and `monthly_portfolio_briefings` from `BYOS_DDL` |
| `supabase/migrations/006_sync_runs.sql` | New table for sync tracking |
| `app/api/sync/reservations/route.ts` | New sync API route |
| `app/api/upload/reservations/route.ts` | Add dual-write for BYOS: also upsert into Portlio's DB |
| `lib/analytics/queries.ts` | Remove `getDataClient()` usage; always use app client |
| `app/api/pipeline/run/route.ts` | Same — remove BYOS client branching for reads |
| `app/api/export/reservations/route.ts` | Same |
| `app/(protected)/dashboard/settings/page.tsx` | Add "Data Sync" card for BYOS companies |
| `components/settings/SyncCard.tsx` | New component: sync status + button |

---

## What Does NOT Change

- `getDataClient()` itself — still used for sync (read) and upload (write) to company's Supabase
- The column mapping / Excel upload flow — unchanged except for the dual-write addition
- The hosted `reservations` table and views — unchanged
- All other settings, pipeline, export functionality — same behavior, just using app client instead of BYOS client for reads
