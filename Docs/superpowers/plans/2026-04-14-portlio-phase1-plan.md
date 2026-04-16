# Portlio Phase 1 — Implementation Plan
# Foundation, Auth & Onboarding

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational Next.js 14 project with Supabase Auth, company registration, dual-mode onboarding wizard (Hosted vs BYOS), per-company Excel column mapping, and route protection — resulting in a working app where a user can sign up and reach an empty dashboard.

**Architecture:** Dual data mode controlled by `companies.mode` ('hosted' | 'byos'). A server-side `getDataClient()` helper routes all data queries to either the app Supabase (hosted) or the company's own Supabase (BYOS). Hosted-mode data is isolated per company via RLS using `company_id`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL), @supabase/ssr, xlsx, Zod, Vercel

**Reference:** `Docs/superpowers/specs/2026-04-14-portlio-phase1-design.md`

---

## Folder Structure

All code lives **outside** the `Docs/` folder. The project root is the workspace root.

```
/                                   ← workspace root
├── Docs/                           ← all documentation (DO NOT put code here)
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── schema_readme.md
│   ├── sql_readme.md
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-04-14-portlio-phase1-design.md
│       └── plans/
│           └── 2026-04-14-portlio-phase1-plan.md
│
├── app/                            ← Next.js App Router
│   ├── (public)/
│   │   ├── page.tsx                ← Landing page (minimal)
│   │   └── auth/
│   │       ├── page.tsx            ← Login / Signup tabs
│   │       └── callback/
│   │           └── route.ts        ← Supabase Auth callback
│   ├── (protected)/
│   │   ├── layout.tsx              ← Wraps all protected pages
│   │   ├── onboarding/
│   │   │   └── page.tsx            ← Onboarding wizard container
│   │   └── dashboard/
│   │       └── page.tsx            ← Empty shell (Phase 1)
│   └── api/
│       ├── auth/
│       │   └── signup/
│       │       └── route.ts        ← POST: create user + company
│       ├── connection/
│       │   └── test/
│       │       └── route.ts        ← POST: test Supabase credentials
│       ├── onboarding/
│       │   ├── column-mapping/
│       │   │   └── route.ts        ← POST: save column mapping
│       │   └── sample-excel/
│       │       └── route.ts        ← GET: download sample Excel file
│       └── schema/
│           └── deploy/
│               └── route.ts        ← POST: deploy schema to BYOS Supabase
│
├── components/
│   ├── ui/                         ← shadcn/ui auto-generated components
│   ├── auth/
│   │   ├── LoginForm.tsx           ← Login form (email + password)
│   │   └── SignupForm.tsx          ← Signup form (company + email + password)
│   ├── onboarding/
│   │   ├── OnboardingWizard.tsx    ← Step container + step routing logic
│   │   ├── StepIndicator.tsx       ← Progress bar (Steps 1–4)
│   │   ├── ModeSelector.tsx        ← Step 1: Hosted vs BYOS card selector
│   │   ├── OpenAIKeyStep.tsx       ← Step 2: OpenAI key input + test
│   │   ├── ColumnMappingStep.tsx   ← Step 3: Excel upload + column mapper
│   │   └── DeploySchemaStep.tsx    ← Step 4: BYOS connect + schema deploy
│   └── layout/
│       ├── Sidebar.tsx             ← Navigation sidebar (shell, no data yet)
│       └── DashboardLayout.tsx     ← Sidebar + main content wrapper
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts               ← App Supabase client (server, cookie-based)
│   │   └── browser.ts              ← App Supabase client (browser)
│   ├── getDataClient.ts            ← Routing abstraction (hosted vs BYOS)
│   ├── encryption.ts               ← AES-256-GCM encrypt/decrypt for credentials
│   └── validations/
│       ├── auth.ts                 ← Zod schemas for auth routes
│       └── onboarding.ts           ← Zod schemas for onboarding routes
│
├── supabase/
│   └── migrations/
│       ├── 001_app_schema.sql      ← companies, users, prompt_configs, pipeline_runs, column_mappings
│       ├── 002_hosted_reservations.sql ← reservations + briefings with company_id + RLS
│       └── 003_hosted_views.sql    ← 8 SQL views for hosted mode
│
├── middleware.ts                   ← Route protection (session + schema_deployed check)
├── .env.local.example              ← Environment variable template
├── jest.config.ts                  ← Jest configuration
├── jest.setup.ts                   ← Testing Library setup
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via CLI)
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local.example`

- [x] **Step 1: Bootstrap Next.js 14 project**

  Run in the workspace root:
  ```
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
  ```
  When prompted: choose **not** to use Turbopack (use default Webpack for broader compatibility).

- [x] **Step 2: Install core dependencies**

  ```
  npm install @supabase/supabase-js @supabase/ssr zod xlsx
  npm install --save-dev jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest
  ```

- [x] **Step 3: Install shadcn/ui**

  ```
  npx shadcn@latest init
  ```
  Choose: Default style, Slate base color, CSS variables: yes.

  Then add required components:
  ```
  npx shadcn@latest add button input label card tabs badge toast progress
  ```

- [x] **Step 4: Configure Jest**

  Create `jest.config.ts` — configure for Next.js using `next/jest`, set `testEnvironment: 'jsdom'`, and point `setupFilesAfterFramework` to `jest.setup.ts`.

  Create `jest.setup.ts` — import `@testing-library/jest-dom`.

- [x] **Step 5: Create `.env.local.example`**

  Document all required environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ENCRYPTION_SECRET=          # 64 hex chars (32 bytes for AES-256)
  ```

  Developer note: generate `ENCRYPTION_SECRET` with `openssl rand -hex 32`.

- [x] **Step 6: Verify scaffold compiles**

  ```
  npm run dev
  ```
  Expected: Next.js dev server starts on `http://localhost:3000` with no errors.

- [x] **Step 7: Commit**

  ```
  git add .
  git commit -m "chore: initialize Next.js 14 project with Tailwind, shadcn/ui, and Jest"
  ```

---

## Task 2: Database Migrations

**Files:**
- Create: `supabase/migrations/001_app_schema.sql`
- Create: `supabase/migrations/002_hosted_reservations.sql`
- Create: `supabase/migrations/003_hosted_views.sql`

- [x] **Step 1: Write migration 001 — App schema tables**

  `supabase/migrations/001_app_schema.sql` must create these tables in order:
  1. `companies` — id, name, mode ('hosted'|'byos'), supabase_url (encrypted), supabase_service_key (encrypted), openai_api_key (encrypted), schema_deployed (bool, default false), created_at
  2. `users` — id (references auth.users), company_id (references companies), role ('admin'|'member', default 'member'), name, email, created_at
  3. `prompt_configs` — id, company_id, name (default 'portfolio_analysis'), system_prompt, user_prompt_template, model (default 'gpt-4o'), temperature (default 0.3), max_tokens (default 2000), updated_at, updated_by (references users)
  4. `pipeline_runs` — id, company_id, revenue_month (date), status ('pending'|'running'|'complete'|'failed'), triggered_by (references users), started_at, completed_at, error_message
  5. `column_mappings` — company_id (PK, references companies), mappings (jsonb), sample_headers (jsonb), updated_at

  Enable RLS on all tables. Add policy: authenticated users can only read/write rows where `company_id` matches their own company.

- [x] **Step 2: Write migration 002 — Hosted reservations**

  `supabase/migrations/002_hosted_reservations.sql` must create:
  1. `reservations` — all 32 columns from `Docs/schema_readme.md`, **plus** `company_id uuid REFERENCES companies(id) NOT NULL`. Primary key: `(company_id, confirmation_code)`.
  2. `monthly_portfolio_briefings` — company_id, revenue_month, portfolio_summary, property_count, data_hash, generated_at. Primary key: `(company_id, revenue_month)`.

  RLS on both tables: authenticated users access only rows where `company_id` matches their company.

- [x] **Step 3: Write migration 003 — Hosted views**

  `supabase/migrations/003_hosted_views.sql` must create all 8 views from `Docs/schema_readme.md` in dependency order:
  1. `nights_exploded_silver`
  2. `monthly_metrics_silver`
  3. `mom_trends_silver`
  4. `monthly_channel_mix_silver`
  5. `channel_mix_summary`
  6. `portfolio_benchmarking_silver`
  7. `final_reporting_gold`
  8. `monthly_portfolio_summary`

  All views must use `WITH (security_invoker = on)` — this ensures RLS on `reservations` filters automatically by company, so no view changes are needed.

- [x] **Step 4: Run migrations in Supabase**

  1. Go to your Supabase project dashboard → SQL Editor
  2. Run `001_app_schema.sql` first, verify no errors
  3. Run `002_hosted_reservations.sql`, verify no errors
  4. Run `003_hosted_views.sql`, verify no errors
  5. Confirm all tables appear under Table Editor

- [x] **Step 5: Commit**

  ```
  git add supabase/
  git commit -m "chore: add database migration scripts for app schema and hosted mode views"
  ```

---

## Task 3: Encryption Utility

**Files:**
- Create: `lib/encryption.ts`
- Create: `lib/__tests__/encryption.test.ts`

- [x] **Step 1: Write failing tests**

  `lib/__tests__/encryption.test.ts` — write tests for:
  - `encrypt(text)` then `decrypt(result)` returns the original text
  - Encrypting the same string twice produces different outputs (IV randomness)
  - `decrypt` throws on tampered ciphertext

- [x] **Step 2: Run tests to confirm they fail**

  ```
  npx jest lib/__tests__/encryption.test.ts
  ```
  Expected: FAIL — `encrypt` not defined.

- [x] **Step 3: Implement encryption**

  `lib/encryption.ts` — implement using Node.js built-in `crypto`:
  - Algorithm: `aes-256-gcm`
  - IV: 12 random bytes prepended to output
  - Auth tag: 16 bytes appended after IV
  - Key source: `process.env.ENCRYPTION_SECRET` (64 hex chars → 32 bytes via `Buffer.from(key, 'hex')`)
  - Output format: base64 string of `[iv (12 bytes) + authTag (16 bytes) + ciphertext]`
  - Export: `encrypt(text: string): string` and `decrypt(encoded: string): string`

- [x] **Step 4: Run tests to confirm they pass**

  ```
  npx jest lib/__tests__/encryption.test.ts
  ```
  Expected: PASS — 3 tests passing.

- [x] **Step 5: Commit**

  ```
  git add lib/encryption.ts lib/__tests__/encryption.test.ts
  git commit -m "feat: add AES-256-GCM encryption utility for credential storage"
  ```

---

## Task 4: Supabase Client Helpers

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/browser.ts`

- [x] **Step 1: Create server-side Supabase client**

  `lib/supabase/server.ts` — export `createAppServerClient()` using `createServerClient` from `@supabase/ssr`. Must read/write cookies from Next.js `cookies()` (from `next/headers`). Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

  Also export `createAppAdminClient()` using the service role key (`SUPABASE_SERVICE_ROLE_KEY`) for operations that need to bypass RLS (e.g., creating a user record after signup).

- [x] **Step 2: Create browser-side Supabase client**

  `lib/supabase/browser.ts` — export `createAppBrowserClient()` using `createBrowserClient` from `@supabase/ssr`. Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe to call in Client Components.

- [x] **Step 3: Commit**

  ```
  git add lib/supabase/
  git commit -m "feat: add Supabase server and browser client helpers"
  ```

---

## Task 5: getDataClient Routing Abstraction

**Files:**
- Create: `lib/getDataClient.ts`
- Create: `lib/__tests__/getDataClient.test.ts`

- [x] **Step 1: Write failing tests**

  `lib/__tests__/getDataClient.test.ts` — mock `lib/supabase/server.ts` and `lib/encryption.ts`. Write tests for:
  - When `company.mode === 'hosted'`, returns the app Supabase client
  - When `company.mode === 'byos'`, calls `decrypt` on both credentials and creates a client pointed at the company's Supabase URL
  - When `company.mode === 'byos'` and credentials are null, throws an error

- [x] **Step 2: Run tests to confirm they fail**

  ```
  npx jest lib/__tests__/getDataClient.test.ts
  ```
  Expected: FAIL — `getDataClient` not defined.

- [x] **Step 3: Implement getDataClient**

  `lib/getDataClient.ts` — export `getDataClient(company)` where `company` has shape `{ mode: string; supabase_url?: string | null; supabase_service_key?: string | null }`.

  - `mode === 'hosted'` → return `createAppServerClient()`
  - `mode === 'byos'` → decrypt both credentials, return `createClient(url, key)` from `@supabase/supabase-js`
  - If `byos` credentials are missing → throw `Error('BYOS credentials not configured')`

- [x] **Step 4: Run tests to confirm they pass**

  ```
  npx jest lib/__tests__/getDataClient.test.ts
  ```
  Expected: PASS — 3 tests passing.

- [x] **Step 5: Commit**

  ```
  git add lib/getDataClient.ts lib/__tests__/getDataClient.test.ts
  git commit -m "feat: add getDataClient routing abstraction for hosted/BYOS modes"
  ```

---

## Task 6: Zod Validation Schemas

**Files:**
- Create: `lib/validations/auth.ts`
- Create: `lib/validations/onboarding.ts`
- Create: `lib/validations/__tests__/auth.test.ts`
- Create: `lib/validations/__tests__/onboarding.test.ts`

- [x] **Step 1: Write failing tests for auth schemas**

  `lib/validations/__tests__/auth.test.ts` — test the signup schema:
  - Accepts valid `{ company_name, email, password }`
  - Rejects missing company_name
  - Rejects invalid email format
  - Rejects password shorter than 8 characters
  - Rejects company_name longer than 100 characters

- [x] **Step 2: Write failing tests for onboarding schemas**

  `lib/validations/__tests__/onboarding.test.ts` — test:
  - OpenAI key schema: accepts `sk-` prefixed strings, rejects empty
  - Column mapping schema: accepts valid jsonb mappings object, rejects when required fields missing from mappings
  - BYOS credentials schema: accepts valid URL + key pair, rejects malformed Supabase URL

- [x] **Step 3: Run to confirm they fail**

  ```
  npx jest lib/validations/__tests__/
  ```
  Expected: FAIL — schemas not defined.

- [x] **Step 4: Implement auth schemas**

  `lib/validations/auth.ts` — export `signupSchema` (Zod object) with:
  - `company_name`: string, min 2, max 100
  - `email`: string email
  - `password`: string, min 8

- [x] **Step 5: Implement onboarding schemas**

  `lib/validations/onboarding.ts` — export:
  - `openaiKeySchema`: string starting with `sk-`, min length 20
  - `columnMappingSchema`: object with `mappings` (record of string to string) and `sample_headers` (array of strings). Validate that all 7 required field keys are present in `mappings`: `confirmation_code`, `listing_nickname`, `check_in_date`, `check_out_date`, `nights`, `net_accommodation_fare`, `listing_id`.
  - `byosCredentialsSchema`: object with `supabase_url` (string URL matching `*.supabase.co`) and `supabase_service_key` (string, min 20 chars)

- [x] **Step 6: Run tests to confirm they pass**

  ```
  npx jest lib/validations/__tests__/
  ```
  Expected: PASS — all tests passing.

- [x] **Step 7: Commit**

  ```
  git add lib/validations/
  git commit -m "feat: add Zod validation schemas for auth and onboarding routes"
  ```

---

## Task 7: Signup API Route

**Files:**
- Create: `app/api/auth/signup/route.ts`
- Create: `app/api/auth/signup/__tests__/route.test.ts`

- [x] **Step 1: Write failing tests**

  `app/api/auth/signup/__tests__/route.test.ts` — mock `createAppAdminClient`. Test the POST handler:
  - Returns 400 with field errors when payload is invalid (missing email, short password)
  - Returns 201 and creates company + user records when payload is valid
  - Returns 409 when email already exists (Supabase returns `User already registered`)
  - Returns 500 when Supabase admin call fails unexpectedly

- [x] **Step 2: Run tests to confirm they fail**

  ```
  npx jest app/api/auth/signup/__tests__/route.test.ts
  ```
  Expected: FAIL — route handler not defined.

- [x] **Step 3: Implement the route**

  `app/api/auth/signup/route.ts` — export `POST` handler:
  1. Parse and validate body with `signupSchema` — return 400 with Zod errors if invalid
  2. Use `createAppAdminClient()` to call `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
  3. On Supabase error: return 409 if duplicate email, else 500
  4. Insert into `companies` table: `{ name: company_name, mode: 'hosted' }`
  5. Insert into `users` table: `{ id: authUser.id, company_id, role: 'admin', email }`
  6. Return 201 with `{ company_id }`

  Note: do NOT seed `prompt_configs` here. It is seeded at onboarding completion — in the column-mapping route (hosted mode) and the schema-deploy route (BYOS mode).

- [x] **Step 4: Run tests to confirm they pass**

  ```
  npx jest app/api/auth/signup/__tests__/route.test.ts
  ```
  Expected: PASS.

- [x] **Step 5: Commit**

  ```
  git add app/api/auth/signup/
  git commit -m "feat: add POST /api/auth/signup route for company registration"
  ```

---

## Task 8: Route Protection Middleware

**Files:**
- Create: `middleware.ts`
- Create: `middleware.test.ts`

- [ ] **Step 1: Write failing tests**

  `middleware.test.ts` — mock `@supabase/ssr` and the app Supabase client. Test:
  - No session + any protected route → redirect to `/auth`
  - Valid session + `schema_deployed = false` + `/dashboard` → redirect to `/onboarding`
  - Valid session + `schema_deployed = true` + `/dashboard` → allow through
  - Valid session + `role = 'member'` + `/admin` → redirect to `/dashboard`
  - Valid session + `role = 'admin'` + `/admin` → allow through
  - Any `/auth` route + valid session + `schema_deployed = true` → redirect to `/dashboard`

- [ ] **Step 2: Run tests to confirm they fail**

  ```
  npx jest middleware.test.ts
  ```
  Expected: FAIL — middleware not defined.

- [ ] **Step 3: Implement middleware**

  `middleware.ts` — using `@supabase/ssr` `createServerClient` with cookie passthrough:
  1. Create Supabase client from request cookies
  2. Call `supabase.auth.getUser()` — if no user, redirect to `/auth` (for protected routes)
  3. If user exists, query `users` table for `company_id` and `role`, then `companies` table for `schema_deployed` and `mode`
  4. Apply routing rules:
     - `/auth` + logged in + `schema_deployed = true` → redirect `/dashboard`
     - Protected routes + not logged in → redirect `/auth`
     - Protected routes + logged in + `schema_deployed = false` → redirect `/onboarding`
     - `/admin` + `role !== 'admin'` → redirect `/dashboard`
  5. Always forward cookie mutations in the response (required by `@supabase/ssr`)

  Export `config.matcher` to exclude `_next/static`, `_next/image`, `favicon.ico`, and `api/` routes.

- [ ] **Step 4: Run tests to confirm they pass**

  ```
  npx jest middleware.test.ts
  ```
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```
  git add middleware.ts middleware.test.ts
  git commit -m "feat: add route protection middleware with session and role checks"
  ```

---

## Task 9: Auth Page UI

**Files:**
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/SignupForm.tsx`
- Create: `components/auth/__tests__/LoginForm.test.tsx`
- Create: `components/auth/__tests__/SignupForm.test.tsx`
- Create: `app/(public)/auth/page.tsx`
- Create: `app/(public)/auth/callback/route.ts`

- [ ] **Step 1: Write failing tests for LoginForm**

  `components/auth/__tests__/LoginForm.test.tsx`:
  - Renders email and password fields
  - Shows validation error if email is empty on submit
  - Shows validation error if password is empty on submit
  - Calls Supabase `signInWithPassword` when form is valid
  - Shows error message when Supabase returns an error

- [ ] **Step 2: Write failing tests for SignupForm**

  `components/auth/__tests__/SignupForm.test.tsx`:
  - Renders company name, email, and password fields
  - Shows validation errors for all required fields when empty
  - Calls `POST /api/auth/signup` with correct payload on valid submit
  - Shows server error message on API failure

- [ ] **Step 3: Run to confirm they fail**

  ```
  npx jest components/auth/__tests__/
  ```
  Expected: FAIL.

- [ ] **Step 4: Implement LoginForm**

  `components/auth/LoginForm.tsx` — client component using `createAppBrowserClient()`:
  - Fields: Email, Password
  - On submit: call `supabase.auth.signInWithPassword({ email, password })`
  - On success: `router.push('/dashboard')`
  - On error: display error message below the form
  - Loading state: disable button and show spinner during request

- [ ] **Step 5: Implement SignupForm**

  `components/auth/SignupForm.tsx` — client component:
  - Fields: Company Name, Email, Password
  - On submit: `POST /api/auth/signup` with `{ company_name, email, password }`
  - On 201: call `supabase.auth.signInWithPassword` then `router.push('/onboarding')`
  - On 400/409/500: display specific error message
  - Loading state: disable button and show spinner

- [ ] **Step 6: Implement Auth Page**

  `app/(public)/auth/page.tsx`:
  - Centered card with ARCA/Portlio logo wordmark
  - shadcn Tabs component: "Log in" | "Sign up"
  - Login tab renders `<LoginForm />`
  - Signup tab renders `<SignupForm />`

- [ ] **Step 7: Implement Auth Callback Route**

  `app/(public)/auth/callback/route.ts` — GET handler:
  - Exchange `code` query param for session via `supabase.auth.exchangeCodeForSession(code)`
  - Redirect to `/dashboard` on success, `/auth?error=callback_failed` on failure

- [ ] **Step 8: Run tests to confirm they pass**

  ```
  npx jest components/auth/__tests__/
  ```
  Expected: PASS.

- [ ] **Step 9: Smoke test in browser**

  Start dev server (`npm run dev`), navigate to `http://localhost:3000/auth`, verify both tabs render and forms submit correctly. Confirm redirect to `/onboarding` after signup.

- [ ] **Step 10: Commit**

  ```
  git add components/auth/ app/(public)/auth/
  git commit -m "feat: add auth page with login and signup forms"
  ```

---

## Task 10: Onboarding — StepIndicator & Mode Selector (Step 1)

**Files:**
- Create: `components/onboarding/StepIndicator.tsx`
- Create: `components/onboarding/ModeSelector.tsx`
- Create: `components/onboarding/__tests__/StepIndicator.test.tsx`
- Create: `components/onboarding/__tests__/ModeSelector.test.tsx`

- [ ] **Step 1: Write failing tests for StepIndicator**

  `components/onboarding/__tests__/StepIndicator.test.tsx`:
  - Renders 4 steps when `totalSteps=4`
  - Renders 3 steps when `totalSteps=3` (hosted mode skips step 4)
  - Marks steps before `currentStep` as complete (filled blue with checkmark)
  - Marks `currentStep` as active (filled blue with number)
  - Marks steps after `currentStep` as pending (gray hollow with number)

- [ ] **Step 2: Write failing tests for ModeSelector**

  `components/onboarding/__tests__/ModeSelector.test.tsx`:
  - Renders two option cards: "Upload Excel Only" and "Bring Your Supabase"
  - Clicking a card calls `onSelect` with the correct mode string ('hosted' or 'byos')
  - Selected card has visual highlight (different border/background)

- [ ] **Step 3: Run to confirm they fail**

  ```
  npx jest components/onboarding/__tests__/StepIndicator.test.tsx components/onboarding/__tests__/ModeSelector.test.tsx
  ```
  Expected: FAIL.

- [ ] **Step 4: Implement StepIndicator**

  `components/onboarding/StepIndicator.tsx` — props: `currentStep: number`, `totalSteps: number`, `labels: string[]`.

  Renders a horizontal row of numbered circles connected by lines. Step states:
  - complete (step < currentStep): filled blue circle + checkmark icon
  - active (step === currentStep): filled blue circle + step number
  - pending (step > currentStep): gray hollow circle + step number

  Connector line between steps: blue if both connected steps are complete, gray otherwise.

- [ ] **Step 5: Implement ModeSelector**

  `components/onboarding/ModeSelector.tsx` — props: `selected: 'hosted' | 'byos' | null`, `onSelect: (mode: 'hosted' | 'byos') => void`.

  Two card options side-by-side:
  - **"Upload Excel Only"** (mode: 'hosted'): icon, description "We store your data securely on Portlio. No setup required.", best-for note
  - **"Bring Your Supabase"** (mode: 'byos'): icon, description "Your data stays in your own Supabase project. Full control.", best-for note

  Selected card: `border-blue-500 bg-blue-50`. Unselected: `border-slate-200 hover:border-slate-300`.

- [ ] **Step 6: Run tests to confirm they pass**

  ```
  npx jest components/onboarding/__tests__/StepIndicator.test.tsx components/onboarding/__tests__/ModeSelector.test.tsx
  ```
  Expected: PASS.

- [ ] **Step 7: Commit**

  ```
  git add components/onboarding/StepIndicator.tsx components/onboarding/ModeSelector.tsx components/onboarding/__tests__/
  git commit -m "feat: add onboarding StepIndicator and ModeSelector components"
  ```

---

## Task 11: Onboarding — OpenAI Key Step (Step 2)

**Files:**
- Create: `app/api/connection/test/route.ts`
- Create: `components/onboarding/OpenAIKeyStep.tsx`
- Create: `components/onboarding/__tests__/OpenAIKeyStep.test.tsx`

- [ ] **Step 1: Write failing tests for OpenAIKeyStep**

  `components/onboarding/__tests__/OpenAIKeyStep.test.tsx`:
  - Renders a password-masked text input and "Test Connection" button
  - Disables "Continue" button until connection test succeeds
  - Shows success state ("Connection successful") after test passes
  - Shows error message when test fails
  - Shows loading spinner during test request

- [ ] **Step 2: Run to confirm they fail**

  ```
  npx jest components/onboarding/__tests__/OpenAIKeyStep.test.tsx
  ```
  Expected: FAIL.

- [ ] **Step 3: Implement connection test API route**

  `app/api/connection/test/route.ts` — POST handler:
  - Body: `{ type: 'openai', key: string }` or `{ type: 'supabase', url: string, service_key: string }`
  - For `type: 'openai'`: make a GET request to `https://api.openai.com/v1/models` with the key as Bearer token. Return 200 if response is 200, 400 with message if 401/403, 500 otherwise.
  - For `type: 'supabase'`: create a Supabase client with the provided credentials, run `SELECT 1`. Return 200 on success, 400 on auth failure.
  - Do **not** save credentials in this route — test only.

- [ ] **Step 4: Implement OpenAIKeyStep**

  `components/onboarding/OpenAIKeyStep.tsx` — props: `onComplete: (key: string) => void`.

  - Password-masked input for OpenAI API key
  - "Test Connection" button → calls `POST /api/connection/test` with `{ type: 'openai', key }`
  - On success: show green checkmark + "Connection successful", enable "Continue" button
  - On failure: show red error message with the error text
  - Info note below input: "Your key is stored encrypted and never exposed to the browser after saving."
  - "Continue" button calls `onComplete(key)` — parent saves the key

- [ ] **Step 5: Run tests to confirm they pass**

  ```
  npx jest components/onboarding/__tests__/OpenAIKeyStep.test.tsx
  ```
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```
  git add app/api/connection/test/ components/onboarding/OpenAIKeyStep.tsx components/onboarding/__tests__/OpenAIKeyStep.test.tsx
  git commit -m "feat: add connection test API route and OpenAI key step component"
  ```

---

## Task 12: Sample Excel Generator

**Files:**
- Create: `app/api/onboarding/sample-excel/route.ts`

- [ ] **Step 1: Implement sample Excel API route**

  `app/api/onboarding/sample-excel/route.ts` — GET handler:
  - Use the `xlsx` package to create a workbook with one sheet called "Reservations"
  - Sheet headers (row 1): the 7 required columns — "Confirmation Code", "Listing Nickname", "Check-In Date", "Check-Out Date", "Nights", "Net Accommodation Fare", "Listing ID" — plus ~6 example optional columns to illustrate common ones companies tend to carry: "Source", "Channel", "Guest Name", "Commission", "Cleaning Fee", "Currency"
  - Sheet rows 2–4: 3 rows of realistic dummy property data (use fictional property names, realistic dates and revenue figures)
  - Add a second sheet called "Readme" with one row of guidance text: "The 7 required columns above must exist in your upload (any header name is fine — you'll map them in the next step). Any additional columns you include will be preserved as custom fields unless you choose to skip them."
  - Return the file as a binary stream with headers:
    - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - `Content-Disposition: attachment; filename="portlio-sample-upload.xlsx"`

- [ ] **Step 2: Verify manually**

  Navigate to `http://localhost:3000/api/onboarding/sample-excel` in the browser. Confirm a `.xlsx` file downloads with correct headers and 3 data rows.

- [ ] **Step 3: Commit**

  ```
  git add app/api/onboarding/sample-excel/
  git commit -m "feat: add sample Excel download endpoint for onboarding"
  ```

---

## Task 13: Column Mapping Step (Step 3)

**Files:**
- Create: `app/api/onboarding/column-mapping/route.ts`
- Create: `components/onboarding/ColumnMappingStep.tsx`
- Create: `components/onboarding/__tests__/ColumnMappingStep.test.tsx`

- [ ] **Step 1: Write failing tests for ColumnMappingStep**

  `components/onboarding/__tests__/ColumnMappingStep.test.tsx`:
  - Renders sample preview table and "Download Sample Excel" button before file upload
  - After file upload, renders a mapping row for each detected Excel header
  - Each row has a dropdown with three categories of options: the 7 required fields, "Include as custom field" (default for unmatched headers), and "Skip this column"
  - Each required field can only be assigned once — picking it in one row removes it from other rows' dropdowns
  - Shows hard error per-field if user tries to continue with any of the 7 required fields unmapped
  - "Continue" button disabled until all 7 required fields are mapped
  - On continue: calls `onComplete` callback

- [ ] **Step 2: Run to confirm they fail**

  ```
  npx jest components/onboarding/__tests__/ColumnMappingStep.test.tsx
  ```
  Expected: FAIL.

- [ ] **Step 3: Implement column mapping save API**

  `app/api/onboarding/column-mapping/route.ts` — POST handler:
  1. Validate session — get `company_id`
  2. Validate body with `columnMappingSchema`. Body shape: `{ mappings: Record<required_field, excel_header>, custom_fields: string[], skipped: string[], sample_headers: string[] }`. `custom_fields` holds Excel headers to preserve into the `data` jsonb; `skipped` holds headers to drop during ingest.
  3. Upsert into `column_mappings` table: `{ company_id, mappings, custom_fields, skipped, sample_headers }` (custom_fields + skipped live inside the same `mappings` jsonb blob — no schema change needed)
  4. If company `mode === 'hosted'`: set `companies.schema_deployed = true` and seed default `prompt_configs` row (if not already seeded)
  5. Return 200 with `{ schema_deployed: true }`

- [ ] **Step 4: Implement ColumnMappingStep**

  `components/onboarding/ColumnMappingStep.tsx` — props: `onComplete: () => void`, `mode: 'hosted' | 'byos'`.

  **Part A — Sample Preview panel (shown before upload):**
  - Scrollable table showing all column names with example values (2 sample rows)
  - "Download Sample Excel" button linking to `GET /api/onboarding/sample-excel`
  - "Column names in your file don't need to match — you'll map them in the next step."

  **Part B — Upload zone (shown after preview):**
  - Drag-and-drop or click-to-browse for `.xlsx`/`.xls` files
  - On file select: send to a client-side xlsx parser (`xlsx.read()`) to extract row 1 headers
  - Display mapping table: one row per detected header, with a dropdown to select the target field

  **Part C — Mapping table:**
  - Left column: detected Excel header name
  - Right column: dropdown with three option groups:
    - **Required fields** (7 total) — each shows "✓ Required" badge; an assigned required field is removed from other rows' dropdowns
    - **"Include as custom field"** — default selection for any header that doesn't fuzzy-match a required field; preserved into `data` jsonb under the original header as the key
    - **"Skip this column"** — drop during ingest
  - Pre-populate dropdown via fuzzy matching (e.g., "Booking Ref" → "Confirmation Code"); otherwise default to "Include as custom field"

  **Validation on "Continue":**
  - All 7 required fields must be mapped — show per-field error if not
  - No warnings for custom fields — they're first-class and expected

  On continue: derive `custom_fields` (headers mapped to "Include as custom field") and `skipped` (headers mapped to "Skip this column"). Call `POST /api/onboarding/column-mapping` with `{ mappings, custom_fields, skipped, sample_headers }`, then call `onComplete()`.

- [ ] **Step 5: Run tests to confirm they pass**

  ```
  npx jest components/onboarding/__tests__/ColumnMappingStep.test.tsx
  ```
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```
  git add app/api/onboarding/column-mapping/ components/onboarding/ColumnMappingStep.tsx components/onboarding/__tests__/ColumnMappingStep.test.tsx
  git commit -m "feat: add column mapping step with sample Excel preview and save API"
  ```

---

## Task 14: Deploy Schema Step — BYOS Only (Step 4)

**Files:**
- Create: `app/api/schema/deploy/route.ts`
- Create: `components/onboarding/DeploySchemaStep.tsx`
- Create: `components/onboarding/__tests__/DeploySchemaStep.test.tsx`

- [ ] **Step 1: Write failing tests for DeploySchemaStep**

  `components/onboarding/__tests__/DeploySchemaStep.test.tsx`:
  - Shows Supabase URL + service key inputs and "Test Connection" button
  - After successful connection test: shows the pre-deploy checklist (tables + views list)
  - "Deploy Schema Now" button only appears after connection test succeeds
  - During deployment: shows per-object progress (✓ created / ⟳ in progress)
  - On success: calls `onComplete`
  - On partial failure: shows which objects failed with error messages

- [ ] **Step 2: Run to confirm they fail**

  ```
  npx jest components/onboarding/__tests__/DeploySchemaStep.test.tsx
  ```
  Expected: FAIL.

- [ ] **Step 3: Implement schema deploy API**

  `app/api/schema/deploy/route.ts` — POST handler:
  1. Validate session — get `company_id`
  2. Validate body with `byosCredentialsSchema`
  3. Encrypt credentials with `encrypt()` and save to `companies` table
  4. Create Supabase client using the decrypted service role key
  5. Import the DDL array from `lib/schema/byos-ddl.ts` (see prep step below) and execute each entry in order against the user's Supabase. The array is the single source of truth for the BYOS schema.
  6. Track each object (success/fail) and return the results array
  7. If all required objects succeeded: set `companies.schema_deployed = true` and seed default `prompt_configs`
  8. Return 200 with `{ results: [{ object, status, error? }] }`

  **Prep: create `lib/schema/byos-ddl.ts`** — exports `BYOS_DDL: Array<{ name: string; type: 'table' | 'view'; sql: string }>`. Contents mirror the hosted migrations but without `company_id` columns, without RLS, and without RLS policies:
  - `reservations` table: 7 typed required columns + `data jsonb NOT NULL DEFAULT '{}'`, PRIMARY KEY on `confirmation_code` alone
  - `monthly_portfolio_briefings` table: `revenue_month` as sole PK
  - The 8 views from hosted mode with `company_id` columns and partitions stripped (since the whole BYOS database belongs to one company)

  Rate limit: max 3 requests per company per day (check `pipeline_runs` count or use a simple counter in the `companies` table).

- [ ] **Step 4: Implement DeploySchemaStep**

  `components/onboarding/DeploySchemaStep.tsx` — props: `onComplete: () => void`.

  **Sub-step A — Connect:**
  - Supabase Project URL input
  - Service Role Key input (password-masked)
  - "Test Connection" button → `POST /api/connection/test` with `{ type: 'supabase', url, service_key }`
  - On success: show green checkmark, reveal pre-deploy checklist

  **Sub-step B — Pre-deploy checklist:**
  ```
  Tables to create:
    ○ reservations
    ○ monthly_portfolio_briefings
  Views to create (8):
    ○ nights_exploded_silver
    ... (all 8)
  All operations are idempotent.
  ```
  "Deploy Schema Now" button.

  **Sub-step C — Deployment progress:**
  During deployment: poll or stream per-object results. Show:
  - `⟳` for in-progress
  - `✓` for success
  - `✕` with error text for failure

  On all-success: `onComplete()`.

- [ ] **Step 5: Run tests to confirm they pass**

  ```
  npx jest components/onboarding/__tests__/DeploySchemaStep.test.tsx
  ```
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```
  git add app/api/schema/deploy/ components/onboarding/DeploySchemaStep.tsx components/onboarding/__tests__/DeploySchemaStep.test.tsx
  git commit -m "feat: add schema deploy API route and BYOS deploy step component"
  ```

---

## Task 15: Onboarding Wizard Container

**Files:**
- Create: `components/onboarding/OnboardingWizard.tsx`
- Create: `app/(protected)/onboarding/page.tsx`

- [ ] **Step 1: Implement OnboardingWizard**

  `components/onboarding/OnboardingWizard.tsx` — client component managing step state:

  - Internal state: `currentStep` (1–4), `mode` ('hosted' | 'byos' | null), `openaiKey` (string | null)
  - Step labels: `['Choose Mode', 'OpenAI Key', 'Column Mapping', 'Deploy Schema']`
  - For hosted mode: renders steps 1–3 only (`totalSteps=3`)
  - For byos mode: renders all 4 steps (`totalSteps=4`)

  Step rendering:
  - Step 1 → `<ModeSelector selected={mode} onSelect={(m) => { setMode(m); setCurrentStep(2) }} />`
  - Step 2 → `<OpenAIKeyStep onComplete={(key) => { setOpenaiKey(key); setCurrentStep(3) }} />`
  - Step 3 → `<ColumnMappingStep mode={mode} onComplete={() => mode === 'byos' ? setCurrentStep(4) : router.push('/dashboard')} />`
  - Step 4 (byos only) → `<DeploySchemaStep onComplete={() => router.push('/dashboard')} />`

  Always renders `<StepIndicator currentStep={currentStep} totalSteps={...} labels={...} />` at top.

- [ ] **Step 2: Implement Onboarding Page**

  `app/(protected)/onboarding/page.tsx` — server component:
  - Page title: "Portlio — Setup"
  - Centered layout (max-width 680px, vertically centered)
  - Renders `<OnboardingWizard />`

- [ ] **Step 3: Smoke test end-to-end**

  1. Sign up a new account via `/auth`
  2. Confirm redirect to `/onboarding`
  3. Walk through all steps in hosted mode — confirm redirect to `/dashboard` after step 3
  4. Sign up another account, walk through BYOS mode — confirm all 4 steps and redirect

- [ ] **Step 4: Commit**

  ```
  git add components/onboarding/OnboardingWizard.tsx app/(protected)/onboarding/
  git commit -m "feat: add onboarding wizard container with step routing"
  ```

---

## Task 16: Dashboard Shell & Sidebar

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/DashboardLayout.tsx`
- Create: `app/(protected)/layout.tsx`
- Create: `app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Implement Sidebar**

  `components/layout/Sidebar.tsx` — client component:

  Navigation items (all links, none active in Phase 1):
  - Dashboard (`/dashboard`)
  - Properties (`/dashboard/properties`) — placeholder, no page yet
  - Reports (`/dashboard/reports`) — placeholder
  - Upload (`/dashboard/upload`) — placeholder
  - Divider
  - Settings (`/dashboard/settings`) — placeholder
  - Admin (`/admin`) — only rendered if `user.role === 'admin'`

  Active item style (based on `usePathname()`): `border-l-2 border-blue-500 bg-slate-800 text-white`
  Inactive item style: `text-slate-400 hover:bg-slate-800 hover:text-white`

  Bottom section: user display name, role badge, logout button (calls `supabase.auth.signOut()` then `router.push('/auth')`)

  Sidebar width: `240px` fixed on desktop. On mobile: collapsed to icon-only or hidden (hamburger toggle).

- [ ] **Step 2: Implement DashboardLayout**

  `components/layout/DashboardLayout.tsx` — props: `children: React.ReactNode`:
  - Flex row: `<Sidebar />` (240px fixed) + `<main className="flex-1 overflow-y-auto p-6">` wrapping children
  - Page background: `bg-slate-50`

- [ ] **Step 3: Implement Protected Layout**

  `app/(protected)/layout.tsx` — server component:
  - Fetch current user session via `createAppServerClient()`
  - Fetch user record (name, role, company) from the `users` table
  - Pass user data to `<DashboardLayout>` via a context provider or props

- [ ] **Step 4: Implement Dashboard Page Shell**

  `app/(protected)/dashboard/page.tsx` — server component:
  - Renders inside `DashboardLayout`
  - Page heading: "Portfolio Overview"
  - Empty state message: "Upload your first Excel file to see your dashboard." with a link to `/dashboard/upload`
  - No data fetching — this is a shell for Phase 1

- [ ] **Step 5: Smoke test**

  Log in as a user with `schema_deployed = true`. Confirm:
  - Sidebar renders correctly
  - Active item highlights based on current route
  - Admin link visible for admin users, hidden for members
  - Logout button signs out and redirects to `/auth`

- [ ] **Step 6: Commit**

  ```
  git add components/layout/ app/(protected)/
  git commit -m "feat: add dashboard shell with sidebar navigation and empty state"
  ```

---

## Task 17: Landing Page

**Files:**
- Create: `app/(public)/page.tsx`
- Create: `app/(public)/layout.tsx`

- [ ] **Step 1: Implement public layout**

  `app/(public)/layout.tsx` — minimal layout with:
  - Top nav: Portlio logo wordmark (left), "Log in" and "Get Started" buttons (right)
  - No sidebar

- [ ] **Step 2: Implement Landing Page**

  `app/(public)/page.tsx` — three sections:

  **Hero** (dark navy background):
  - Headline: "From Excel to AI-Powered Portfolio Intelligence in 15 Minutes."
  - Subheading: "Connect your Supabase project or upload your data. Get automated monthly briefings powered by GPT-4o."
  - Two CTAs: "Get Started Free" (→ `/auth?tab=signup`) and "Log In" (→ `/auth`)

  **How It Works** (3 steps):
  - 1. Connect or Upload / 2. Map Your Columns / 3. Analyze With AI
  - One sentence description per step

  **CTA section**:
  - "Start analyzing your portfolio today." + "Get Started Free" button

- [ ] **Step 3: Commit**

  ```
  git add app/(public)/
  git commit -m "feat: add minimal landing page with hero and how-it-works sections"
  ```

---

## Task 18: Full End-to-End Verification

- [ ] **Step 1: Run all tests**

  ```
  npx jest --coverage
  ```
  Expected: All tests pass. Coverage report generated.

- [ ] **Step 2: Test hosted mode signup flow**

  1. Go to `http://localhost:3000`
  2. Click "Get Started Free" → `/auth`
  3. Sign up with Company Name, Email, Password
  4. Confirm redirect to `/onboarding`
  5. Select "Upload Excel Only" (hosted mode)
  6. Enter a valid OpenAI key, test connection → success
  7. Download sample Excel, upload it, map columns (all 7 required), continue
  8. Confirm redirect to `/dashboard` with empty state

- [ ] **Step 3: Test BYOS mode signup flow**

  1. Sign up a second account
  2. Select "Bring Your Supabase"
  3. Enter OpenAI key → test → success
  4. Map columns → continue
  5. Enter Supabase URL + service key → test → success
  6. Deploy schema → confirm all 10 objects show ✓
  7. Confirm redirect to `/dashboard`

- [ ] **Step 4: Test route protection**

  1. Log out, try to access `/dashboard` → confirm redirect to `/auth`
  2. Log in as a member (non-admin), try to access `/admin` → confirm redirect to `/dashboard`
  3. Access `/onboarding` after `schema_deployed = true` → confirm redirect to `/dashboard`

- [ ] **Step 5: Final commit**

  ```
  git add .
  git commit -m "chore: Phase 1 complete — foundation, auth, and onboarding"
  ```

---

## Environment Setup Checklist

Before starting implementation, ensure:

- [ ] New Supabase project created at [supabase.com](https://supabase.com)
- [ ] `.env.local` created from `.env.local.example` with all values filled in
- [ ] `ENCRYPTION_SECRET` generated: run `openssl rand -hex 32`
- [ ] Supabase Auth configured: Email provider enabled, confirm email: optional for dev (disable for faster testing)
- [ ] Migrations run in Supabase SQL Editor in order: 001 → 002 → 003
- [ ] Node.js 18+ installed

---

## Notes for Implementer

- **Never commit `.env.local`** — it contains secrets
- **AES-256-GCM key must be exactly 64 hex characters** (32 bytes) — shorter keys will cause a runtime error
- **BYOS schema deployment** uses the original views from `Docs/schema_readme.md` (no `company_id`). Hosted mode views in the app DB filter via RLS — they are NOT the same SQL files.
- **Column mapping fuzzy match**: use a simple `includes()`/`toLowerCase()` check — do not add a fuzzy matching library for this
- **OpenAI key test**: the `/v1/models` endpoint is the lightest available — it costs no tokens
- **`schema_deployed` flag**: set to `true` only after the column mapping is saved (hosted) or schema deployment succeeds (BYOS). Middleware relies on this flag for routing.
- **GPT-4o property cap (Phase 4)**: limit to first 10 entries from `properties_data` — this is implemented in Phase 4, not here
