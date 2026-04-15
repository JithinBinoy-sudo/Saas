# Portlio — Phase 1 Design Spec
# Foundation, Auth & Onboarding

**Date**: 2026-04-14  
**Status**: Approved  
**Phase**: 1 of 6  
**Project**: Portlio (ARCA SaaS)

---

## Table of Contents

1. [Phase Scope](#1-phase-scope)
2. [Architecture Overview](#2-architecture-overview)
3. [App Database Schema](#3-app-database-schema)
4. [Auth & Company Registration](#4-auth--company-registration)
5. [Onboarding Wizard](#5-onboarding-wizard)
6. [Route Protection](#6-route-protection)
7. [Tech Stack](#7-tech-stack)
8. [Out of Scope for Phase 1](#8-out-of-scope-for-phase-1)
9. [Future Phases](#9-future-phases)

---

## 1. Phase Scope

Phase 1 delivers the foundational infrastructure that every subsequent phase builds on:

- Next.js 14 project scaffold
- Supabase Auth (email/password)
- Company registration
- App database schema (all tables + views for hosted mode)
- Dual-mode onboarding wizard (Hosted vs BYOS)
- Per-company column mapping with sample Excel preview
- Route protection middleware

At the end of Phase 1, a user can sign up, configure their data mode, map their Excel columns, and land on an empty dashboard — ready for Phase 2 (Excel Upload & Data Ingestion).

---

## 2. Architecture Overview

### Dual Data Mode

Every company is either **hosted** or **byos** (Bring Your Own Supabase):

| | Hosted Mode | BYOS Mode |
|---|---|---|
| Data location | App Supabase (scoped by `company_id`) | Company's own Supabase project |
| Schema deployment | Pre-deployed once in app DB | Deployed during onboarding |
| `reservations` table | App Supabase + `company_id` column | User's Supabase (no `company_id`) |
| Briefings table | App Supabase + `company_id` column | User's Supabase |
| 8 SQL views | Shared in app DB, filtered via RLS | Deployed to user's Supabase |

### The Routing Abstraction

A single server-side helper `lib/getDataClient.ts` is the only place data-mode branching lives:

```ts
// Returns the correct Supabase client based on company mode
async function getDataClient(companyId: string): Promise<SupabaseClient>
```

- `mode === 'hosted'` → returns app Supabase client (RLS auto-scopes to company)
- `mode === 'byos'` → decrypts stored credentials, returns client for company's Supabase

Every API route calls `getDataClient()`. No route contains mode-branching logic directly.

### Project Structure

```
portlio/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                  # Landing page
│   │   └── auth/
│   │       ├── page.tsx              # Login / Signup
│   │       └── callback/route.ts     # Supabase OAuth callback
│   ├── (protected)/
│   │   ├── onboarding/page.tsx
│   │   └── dashboard/
│   │       └── page.tsx              # Empty shell (Phase 1)
│   └── api/
│       ├── auth/signup/route.ts
│       ├── connection/test/route.ts
│       ├── schema/deploy/route.ts
│       └── onboarding/column-mapping/route.ts
├── lib/
│   ├── getDataClient.ts              # Routing abstraction
│   ├── supabase/
│   │   ├── appClient.ts              # App Supabase client (server)
│   │   └── browserClient.ts          # App Supabase client (browser)
│   └── encryption.ts                 # AES-256-GCM encrypt/decrypt
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── onboarding/
│   │   ├── StepIndicator.tsx
│   │   ├── ModeSelector.tsx
│   │   ├── OpenAIKeyStep.tsx
│   │   ├── ColumnMappingStep.tsx
│   │   └── DeploySchemaStep.tsx      # BYOS only
│   └── layout/
│       └── Sidebar.tsx               # Shell (no nav items yet)
├── supabase/
│   └── migrations/
│       ├── 001_app_schema.sql        # All app DB tables
│       └── 002_hosted_views.sql      # 8 views for hosted mode
└── middleware.ts                     # Route protection
```

---

## 3. App Database Schema

All tables live in the app Supabase project. Deviations from the original PRD are marked *.

### `companies`

```sql
CREATE TABLE companies (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  text NOT NULL,
  mode                  text NOT NULL DEFAULT 'hosted',   -- * 'hosted' | 'byos'
  supabase_url          text,                             -- byos only, AES-256-GCM encrypted
  supabase_service_key  text,                             -- byos only, AES-256-GCM encrypted
  openai_api_key        text,                             -- AES-256-GCM encrypted
  schema_deployed       boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);
```

### `users`

```sql
CREATE TABLE users (
  id          uuid REFERENCES auth.users(id) PRIMARY KEY,
  company_id  uuid REFERENCES companies(id) NOT NULL,
  role        text NOT NULL DEFAULT 'member',             -- 'admin' | 'member'
  name        text,
  email       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

### `prompt_configs`

```sql
CREATE TABLE prompt_configs (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id            uuid REFERENCES companies(id) NOT NULL,
  name                  text NOT NULL DEFAULT 'portfolio_analysis',
  system_prompt         text NOT NULL,
  user_prompt_template  text NOT NULL,
  model                 text NOT NULL DEFAULT 'gpt-4o',
  temperature           float NOT NULL DEFAULT 0.3,
  max_tokens            integer NOT NULL DEFAULT 2000,
  updated_at            timestamptz DEFAULT now(),
  updated_by            uuid REFERENCES users(id)
);
```

### `pipeline_runs`

```sql
CREATE TABLE pipeline_runs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid REFERENCES companies(id) NOT NULL,
  revenue_month   date NOT NULL,
  status          text NOT NULL DEFAULT 'pending',        -- pending | running | complete | failed
  triggered_by    uuid REFERENCES users(id),
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  error_message   text
);
```

### `column_mappings` *

```sql
CREATE TABLE column_mappings (
  company_id       uuid REFERENCES companies(id) PRIMARY KEY,
  mappings         jsonb NOT NULL,   -- { "confirmation_code": "Booking Ref", "arca_id": "Property ID", ... }
  sample_headers   jsonb NOT NULL,   -- original headers detected from their Excel file
  updated_at       timestamptz DEFAULT now()
);
```

### `reservations` (hosted mode — lives in app Supabase) *

All 32 columns from `schema_readme.md`, plus:

```sql
company_id  uuid REFERENCES companies(id) NOT NULL
```

Primary key: `(company_id, confirmation_code)`

RLS policy:
```sql
CREATE POLICY "company_isolation" ON reservations
  USING (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

### `monthly_portfolio_briefings` (hosted mode — lives in app Supabase) *

```sql
CREATE TABLE monthly_portfolio_briefings (
  company_id         uuid REFERENCES companies(id) NOT NULL,
  revenue_month      date NOT NULL,
  portfolio_summary  text,
  property_count     integer,
  data_hash          text,
  generated_at       timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, revenue_month)
);
```

RLS policy mirrors `reservations`.

### 8 SQL Views (hosted mode — deployed once into app Supabase)

Identical to `schema_readme.md` with `security_invoker = on`. Because all views query `reservations` and RLS is enforced via `security_invoker`, they automatically scope to the authenticated user's company. No view modifications needed.

---

## 4. Auth & Company Registration

### Signup (`POST /api/auth/signup`)

**Request:**
```json
{
  "company_name": "Acme Property Group",
  "email": "admin@acme.com",
  "password": "..."
}
```

**Server logic:**
1. Create Supabase Auth user via admin client
2. Insert into `companies` (`name`, `mode = 'hosted'`)
3. Insert into `users` (`role = 'admin'`, linked to new company)
4. Return session token

**Validation (Zod):**
- `company_name`: required, 2–100 chars
- `email`: valid email format
- `password`: min 8 chars

### Login

Handled entirely by Supabase Auth client-side SDK. On success:
- Session stored in cookie via `@supabase/ssr`
- Middleware reads session on every request

### Auth Page UI (`/auth`)

Two tabs: **Log in** | **Sign up**

Sign up tab fields: Company Name, Email, Password, [Create Account] button  
Log in tab fields: Email, Password, [Log in] button  
First registered user per company is automatically `role = 'admin'`.

---

## 5. Onboarding Wizard

4-step wizard at `/onboarding`. Progress tracked via URL param `?step=1`.  
`schema_deployed = false` gates access — middleware redirects here until complete.

### Step Indicator

```
① Choose Mode  ──  ② OpenAI Key  ──  ③ Column Mapping  ──  ④ Deploy Schema
```

Step 4 is only rendered for BYOS mode. Hosted mode completes at Step 3.

---

### Step 1: Choose Data Mode

```
┌─────────────────────────┐   ┌─────────────────────────┐
│  📊 Upload Excel Only   │   │  🔗 Bring Your Supabase  │
│                         │   │                         │
│  We store your data     │   │  Your data stays in     │
│  securely on Portlio.   │   │  your own Supabase      │
│  No setup required.     │   │  project. Full control. │
│                         │   │                         │
│  Best for: teams new    │   │  Best for: teams with   │
│  to Supabase            │   │  existing Supabase      │
└─────────────────────────┘   └─────────────────────────┘
```

Selection updates `companies.mode` immediately.

---

### Step 2: OpenAI API Key

- Single text input (password-masked)
- [Test Connection] button — calls OpenAI `/models` endpoint with the key
- On success: key encrypted with AES-256-GCM, saved to `companies.openai_api_key`
- Info note: *"Your key is stored encrypted and never exposed to the browser after saving."*
- Key is never returned to the frontend after this point — UI shows masked `sk-...****` indicator

---

### Step 3: Column Mapping

**Part A — Sample Preview**

Before the upload zone, show a visual preview table:

```
┌──────────────────────────────────────────────────────────────────┐
│  Here's what your Excel file should contain:                     │
│                                                                  │
│  ┌────────────┬──────────────┬───────────┬──────────┬─────────┐  │
│  │ Confirm.   │ Property     │ Check In  │ Check Out│ Nights  │  │
│  │ Code       │ Name         │ Date      │ Date     │         │  │
│  ├────────────┼──────────────┼───────────┼──────────┼─────────┤  │
│  │ ABC-001    │ Beach Villa  │2025-01-01 │2025-01-05│  4      │  │
│  │ ABC-002    │ City Apt     │2025-01-03 │2025-01-07│  4      │  │
│  └────────────┴──────────────┴───────────┴──────────┴─────────┘  │
│  (table scrolls to show all columns including optional ones)      │
│                                                                  │
│  Column names in your file don't need to match — you'll map them │
│  in the next step.                                               │
│                                                                  │
│  [↓ Download Sample Excel]                                       │
└──────────────────────────────────────────────────────────────────┘
```

The downloadable sample Excel contains all required + optional columns with 3 rows of realistic dummy data. Generated server-side using the `xlsx` library.

**Part B — Upload & Map**

After uploading their Excel:
1. Server reads headers from row 1 (first sheet only)
2. Attempt auto-match: if a detected header fuzzy-matches a required field name, pre-populate the dropdown
3. Show mapping UI:

```
Your Column            →   Required Field
─────────────────────────────────────────────────────
"Booking Reference"    →   [ Confirmation Code ▼ ] ✓ Required
"Property"             →   [ Listing Nickname  ▼ ] ✓ Required
"Arrival"              →   [ Check-in Date     ▼ ] ✓ Required
"Departure"            →   [ Check-out Date    ▼ ] ✓ Required
"Duration"             →   [ Nights            ▼ ] ✓ Required
"Net Fare"             →   [ Net Acc. Fare      ▼ ] ✓ Required
"Property ID"          →   [ ARCA ID            ▼ ] ✓ Required
"Platform"             →   [ Source             ▼ ] ○ Optional
"Fee"                  →   [ Commission         ▼ ] ○ Optional
"Other columns..."     →   [ — Skip —           ▼ ]
```

**Validation on save:**
- All required fields must be mapped — hard block with per-field error if missing
- Optional unmapped fields show soft warning (e.g., "Commission not mapped — will default to $0")

**Required fields:**
`confirmation_code`, `listing_nickname`, `check_in_date`, `check_out_date`, `nights`, `net_accommodation_fare`, `arca_id`

**Optional fields (defaulted if unmapped):**
- `commission` → defaults to `0`
- `source` → defaults to `'Unknown'`
- All remaining 23 columns → stored as `null`

Mapping saved to `column_mappings` table. Hosted mode: `schema_deployed = true` set here, a default `prompt_configs` row is seeded for the company, then redirect to `/dashboard`.

---

### Step 4: Connect Supabase + Deploy Schema (BYOS only)

**Sub-step A — Connect:**
- Supabase Project URL input
- Service Role Key input (password-masked)
- [Test Connection] button → `POST /api/connection/test` (runs `SELECT 1` against their Supabase)
- On success: credentials encrypted + saved to `companies`

**Sub-step B — Deploy Schema:**

Pre-deploy checklist shown:
```
The following will be created in your Supabase project:

Tables:
  • reservations (32 columns)
  • monthly_portfolio_briefings

Views (8):
  • nights_exploded_silver
  • monthly_metrics_silver
  • mom_trends_silver
  • monthly_channel_mix_silver
  • channel_mix_summary
  • portfolio_benchmarking_silver
  • final_reporting_gold
  • monthly_portfolio_summary

All operations are idempotent. Existing data will not be modified.
```

[Deploy Schema Now →] → `POST /api/schema/deploy`

During deployment, live progress shown per object:
```
✓ Creating reservations table
✓ Creating monthly_portfolio_briefings table
✓ Creating nights_exploded_silver
⟳ Creating monthly_metrics_silver...
```

On completion: `companies.schema_deployed = true`, a default `prompt_configs` row is seeded for the company, then redirect to `/dashboard`.

**API: `POST /api/schema/deploy`**

1. Authenticate + get `company_id`
2. Fetch + decrypt BYOS credentials
3. Create Supabase client with service role key
4. Execute DDL statements in dependency order (identical to `schema_readme.md`)
5. Each statement wrapped in try/catch — partial failure reported per object
6. Update `companies.schema_deployed = true` only if all required objects succeed
7. Return per-object result array

Rate limit: max 3 deploy attempts per company per day.

---

## 6. Route Protection

`middleware.ts` intercepts all requests:

```
Request → Has session?
  No  → redirect /auth
  Yes → Is route /admin?
          Yes → user.role === 'admin'?
                  No  → redirect /dashboard
                  Yes → allow
        Is route /dashboard/* or /onboarding?
          Yes → schema_deployed?
                  No  → redirect /onboarding
                  Yes → allow
```

Session read via `@supabase/ssr` (cookie-based, works in Next.js middleware).

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| App Database | Supabase (PostgreSQL + Auth) |
| Auth | Supabase Auth (email/password) |
| Credential Encryption | AES-256-GCM (`ENCRYPTION_SECRET` env var) |
| Excel Parsing | `xlsx` npm package |
| Input Validation | Zod |
| Hosting | Vercel |

---

## 8. Out of Scope for Phase 1

- Excel upload & data ingestion (Phase 2)
- Analytics dashboard data (Phase 3)
- AI pipeline & briefings (Phase 4)
- Admin prompt management (Phase 5)
- Excel report export (Phase 5)
- Multi-user invite (Phase 6)
- Pipeline run history (Phase 6)

The `/dashboard` page in Phase 1 is an empty shell with the sidebar layout — no data displayed.

---

## 9. Future Phases

| Phase | Scope |
|-------|-------|
| 2 | Excel upload, column mapping application, data ingestion into Supabase |
| 3 | Analytics dashboard: KPI cards, revenue trend chart, property table |
| 4 | AI pipeline runner (GPT-4o, capped at 10 properties), briefing viewer |
| 5 | Admin prompt management, Excel report export |
| 6 | Pipeline run history, multi-user invite |
