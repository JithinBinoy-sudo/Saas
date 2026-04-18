# BYOS View Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move analytics views out of BYOS company databases into Portlio's own DB. Add an on-demand sync mechanism so BYOS reservation data is pulled into Portlio for unified querying.

**Architecture:** All analytics reads switch from `getDataClient()` to the app Supabase client with `company_id` filtering — same path for hosted and BYOS. A new sync API pulls rows from the company's Supabase and upserts them into Portlio's hosted `reservations` table. The BYOS deploy step is trimmed to create only the `reservations` table.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (JS client v2), Tailwind CSS, shadcn/ui.

**Reference:**
- Spec: `Docs/superpowers/specs/2026-04-18-byos-view-migration-design.md`
- `supabase/migrations/002_hosted_reservations.sql` — hosted reservations table with `(company_id, confirmation_code)` PK
- `supabase/migrations/003_hosted_views.sql` — 8 hosted views with `company_id` + `security_invoker`
- `lib/getDataClient.ts` — factory returning hosted or BYOS Supabase client

---

## Folder Structure (new & modified files)

```
supabase/migrations/
  006_sync_runs.sql                              ← NEW: sync tracking table

lib/schema/
  byos-ddl.ts                                    ← MODIFY: remove views + monthly_portfolio_briefings

app/api/sync/reservations/
  route.ts                                       ← NEW: POST sync endpoint

app/api/upload/reservations/
  route.ts                                       ← MODIFY: add BYOS dual-write

lib/analytics/
  queries.ts                                     ← MODIFY: always require companyId (no optional)

app/api/pipeline/run/
  route.ts                                       ← MODIFY: use app client, always pass companyId

app/api/export/reservations/
  route.ts                                       ← MODIFY: use app client, always pass companyId

app/(protected)/dashboard/
  page.tsx                                       ← MODIFY: use app client, always pass companyId
  briefings/[month]/page.tsx                     ← MODIFY: use app client, always pass companyId
  settings/export/page.tsx                       ← MODIFY: use app client, always pass companyId
  settings/prompt/page.tsx                       ← MODIFY: use app client, always pass companyId
  settings/page.tsx                              ← MODIFY: add Data Sync card for BYOS

components/settings/
  SyncCard.tsx                                   ← NEW: sync status + button component
```

---

### Task 1: Create `sync_runs` Migration

**Files:**
- Create: `supabase/migrations/006_sync_runs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 006_sync_runs.sql — Tracks on-demand BYOS → Portlio reservation syncs

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

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_runs_company_isolation" ON sync_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/006_sync_runs.sql
git commit -m "feat(schema): add sync_runs migration for BYOS sync tracking"
```

---

### Task 2: Trim `byos-ddl.ts`

**Files:**
- Modify: `lib/schema/byos-ddl.ts:15-207`

- [ ] **Step 1: Remove views and monthly_portfolio_briefings from BYOS_DDL**

Keep only the `reservations` table entry. Remove the `monthly_portfolio_briefings` table entry (lines 36-48) and all 8 view entries (lines 49-206). The result should be:

```typescript
export const BYOS_DDL: DdlEntry[] = [
  {
    name: 'reservations',
    type: 'table',
    sql: `
CREATE TABLE IF NOT EXISTS reservations (
  confirmation_code         text          NOT NULL,
  listing_nickname          text          NOT NULL,
  check_in_date             date          NOT NULL,
  check_out_date            date          NOT NULL,
  nights                    integer       NOT NULL,
  net_accommodation_fare    numeric(14,2) NOT NULL,
  listing_id                text          NOT NULL,
  data                      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (confirmation_code)
);
CREATE INDEX IF NOT EXISTS reservations_check_in_idx ON reservations(check_in_date);
CREATE INDEX IF NOT EXISTS reservations_listing_idx  ON reservations(listing_id);
`.trim(),
  },
];
```

`BYOS_BOOTSTRAP_SQL` remains unchanged.

- [ ] **Step 2: Commit**

```bash
git add lib/schema/byos-ddl.ts
git commit -m "feat(byos): trim DDL to reservations table only, remove views"
```

---

### Task 3: Switch Analytics Queries to Always Require `companyId`

**Files:**
- Modify: `lib/analytics/queries.ts:1-162`

- [ ] **Step 1: Make `companyId` required in all query functions**

Change all function signatures: `companyId?: string` → `companyId: string`. Remove the `if (companyId)` guards — always apply `.eq('company_id', companyId)`.

Updated file:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MonthlyPortfolioSummary,
  PropertyMonthRow,
  ChannelMixRow,
  DashboardData,
} from './types';

export async function fetchAvailableMonths(
  client: SupabaseClient,
  companyId: string
): Promise<string[]> {
  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', companyId)
    .order('revenue_month', { ascending: false });

  if (error || !data) return [];
  return data.map((r: { revenue_month: string }) => r.revenue_month);
}

export async function fetchMonthlySummary(
  client: SupabaseClient,
  month: string,
  companyId: string
): Promise<MonthlyPortfolioSummary | null> {
  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('revenue_month', month)
    .eq('company_id', companyId)
    .single();

  if (error || !data) return null;
  return data as MonthlyPortfolioSummary;
}

export async function fetchTrendData(
  client: SupabaseClient,
  months: string[],
  companyId: string
): Promise<MonthlyPortfolioSummary[]> {
  const last12 = months.slice(0, 12);
  if (last12.length === 0) return [];

  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('company_id', companyId)
    .in('revenue_month', last12)
    .order('revenue_month', { ascending: true });

  if (error || !data) return [];
  return data as MonthlyPortfolioSummary[];
}

export async function fetchPropertyRows(
  client: SupabaseClient,
  month: string,
  companyId: string
): Promise<PropertyMonthRow[]> {
  const { data, error } = await client
    .from('final_reporting_gold')
    .select('*')
    .eq('revenue_month', month)
    .eq('company_id', companyId)
    .order('revenue', { ascending: false });

  if (error || !data) return [];
  return data as PropertyMonthRow[];
}

export async function fetchChannelMix(
  client: SupabaseClient,
  companyId: string
): Promise<ChannelMixRow[]> {
  const { data, error } = await client
    .from('channel_mix_summary')
    .select('*')
    .eq('company_id', companyId)
    .order('total_revenue', { ascending: false });

  if (error || !data) return [];
  return data as ChannelMixRow[];
}

/** Convenience: fetch everything the dashboard needs in parallel. */
export async function fetchDashboardData(
  client: SupabaseClient,
  companyId: string,
  requestedMonth?: string
): Promise<DashboardData> {
  const availableMonths = await fetchAvailableMonths(client, companyId);

  if (availableMonths.length === 0) {
    return {
      availableMonths: [],
      selectedMonth: '',
      summary: null,
      priorSummary: null,
      trendData: [],
      properties: [],
      channelMix: [],
    };
  }

  const selectedMonth =
    requestedMonth && availableMonths.includes(requestedMonth)
      ? requestedMonth
      : availableMonths[0];

  const priorIdx = availableMonths.indexOf(selectedMonth) + 1;
  const priorMonth =
    priorIdx < availableMonths.length ? availableMonths[priorIdx] : null;

  const [summary, priorSummary, trendData, properties, channelMix] =
    await Promise.all([
      fetchMonthlySummary(client, selectedMonth, companyId),
      priorMonth
        ? fetchMonthlySummary(client, priorMonth, companyId)
        : Promise.resolve(null),
      fetchTrendData(client, availableMonths, companyId),
      fetchPropertyRows(client, selectedMonth, companyId),
      fetchChannelMix(client, companyId),
    ]);

  return {
    availableMonths,
    selectedMonth,
    summary,
    priorSummary,
    trendData,
    properties,
    channelMix,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/analytics/queries.ts
git commit -m "refactor(analytics): make companyId required in all query functions"
```

---

### Task 4: Update Dashboard Page — Use App Client

**Files:**
- Modify: `app/(protected)/dashboard/page.tsx:1-177`

- [ ] **Step 1: Remove getDataClient import and usage; use createAppServerClient for analytics**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 3).

Replace lines 48-56 (the dataClient + companyId block):

```typescript
// OLD:
const dataClient = getDataClient({
  mode: companyRow.mode,
  supabase_url: companyRow.supabase_url,
  supabase_service_key: companyRow.supabase_service_key,
});
const companyId =
  companyRow.mode === 'hosted' ? userRow.company_id : undefined;

// NEW:
const companyId = userRow.company_id;
```

Also change the `companies` select (line 42-43) to remove the BYOS credential fields — they're no longer needed here:

```typescript
// OLD:
.select('mode, supabase_url, supabase_service_key, openai_api_key, anthropic_api_key, google_api_key')

// NEW:
.select('mode, openai_api_key, anthropic_api_key, google_api_key')
```

Update the `fetchDashboardData` call (line 58-62):

```typescript
// OLD:
const dashboardData = await fetchDashboardData(
  dataClient,
  companyId,
  searchParams.month
);

// NEW:
const dashboardData = await fetchDashboardData(
  supabase,
  companyId,
  searchParams.month
);
```

- [ ] **Step 2: Commit**

```bash
git add "app/(protected)/dashboard/page.tsx"
git commit -m "refactor(dashboard): use app client for analytics queries"
```

---

### Task 5: Update Briefing Page — Use App Client

**Files:**
- Modify: `app/(protected)/dashboard/briefings/[month]/page.tsx:1-130`

- [ ] **Step 1: Remove getDataClient; use supabase (app client) for analytics**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 3).

Replace lines 29-35 (company select) — remove BYOS credential fields:

```typescript
// OLD:
const { data: companyRow } = await supabase
  .from('companies')
  .select('mode, supabase_url, supabase_service_key')
  .eq('id', userRow.company_id)
  .single();

if (!companyRow) return null;

// NEW (company row no longer needed for data client; keep it only if used elsewhere — here it's not):
```

Actually, `companyRow` is only used to build `getDataClient`. Since we no longer need it, remove the entire company fetch and simplify lines 63-69:

```typescript
// OLD:
const dataClient = getDataClient({
  mode: companyRow.mode,
  supabase_url: companyRow.supabase_url,
  supabase_service_key: companyRow.supabase_service_key,
});
const companyId = companyRow.mode === 'hosted' ? userRow.company_id : undefined;
const summary = await fetchMonthlySummary(dataClient, params.month, companyId);

// NEW:
const summary = await fetchMonthlySummary(supabase, params.month, userRow.company_id);
```

- [ ] **Step 2: Commit**

```bash
git add "app/(protected)/dashboard/briefings/[month]/page.tsx"
git commit -m "refactor(briefings): use app client for analytics queries"
```

---

### Task 6: Update Export Settings Page — Use App Client

**Files:**
- Modify: `app/(protected)/dashboard/settings/export/page.tsx:1-67`

- [ ] **Step 1: Remove getDataClient; use app client for month list**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 3).
Remove `import { createAppAdminClient } from '@/lib/supabase/server';` from the import (keep `createAppServerClient`).

Replace the company fetch + data client block (lines 19-42):

```typescript
// OLD:
const admin = createAppAdminClient();
const { data: company } = await admin
  .from('companies')
  .select('id, mode, supabase_url, supabase_service_key')
  .eq('id', userRow.company_id)
  .single();

let availableMonths: string[] = [];
if (company) {
  const dataClient = getDataClient({
    mode: company.mode,
    supabase_url: company.supabase_url,
    supabase_service_key: company.supabase_service_key,
  });

  const companyId = company.mode === 'hosted' ? company.id : undefined;
  let query = dataClient
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .order('revenue_month', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);

  const { data: months } = await query;
  availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);
}

// NEW:
const { data: months } = await supabase
  .from('monthly_portfolio_summary')
  .select('revenue_month')
  .eq('company_id', userRow.company_id)
  .order('revenue_month', { ascending: false });
const availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);
```

- [ ] **Step 2: Commit**

```bash
git add "app/(protected)/dashboard/settings/export/page.tsx"
git commit -m "refactor(export-settings): use app client for month list query"
```

---

### Task 7: Update Prompt Settings Page — Use App Client

**Files:**
- Modify: `app/(protected)/dashboard/settings/prompt/page.tsx:1-94`

- [ ] **Step 1: Remove getDataClient; use app client for month list**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 3).

Replace the company fetch + data client block for months (lines 47-71):

```typescript
// OLD:
// Fetch company for data client
const { data: company } = await admin
  .from('companies')
  .select('id, mode, supabase_url, supabase_service_key')
  .eq('id', userRow.company_id)
  .single();

// Fetch available months
let availableMonths: string[] = [];
if (company) {
  const dataClient = getDataClient({
    mode: company.mode,
    supabase_url: company.supabase_url,
    supabase_service_key: company.supabase_service_key,
  });

  const companyId = company.mode === 'hosted' ? company.id : undefined;
  let query = dataClient
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .order('revenue_month', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);

  const { data: months } = await query;
  availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);
}

// NEW:
// Fetch available months
const { data: monthsData } = await admin
  .from('monthly_portfolio_summary')
  .select('revenue_month')
  .eq('company_id', userRow.company_id)
  .order('revenue_month', { ascending: false });
const availableMonths = (monthsData ?? []).map((m: { revenue_month: string }) => m.revenue_month);
```

Note: keep the `admin` client here since this page already uses it for `prompt_configs` and the admin client bypasses RLS (needed for `monthly_portfolio_summary` query by arbitrary company_id).

- [ ] **Step 2: Commit**

```bash
git add "app/(protected)/dashboard/settings/prompt/page.tsx"
git commit -m "refactor(prompt-settings): use app client for month list query"
```

---

### Task 8: Update Pipeline Route — Use App Client

**Files:**
- Modify: `app/api/pipeline/run/route.ts:1-268`

- [ ] **Step 1: Remove getDataClient; use admin client for reads**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 4).

Remove the company select of BYOS credential fields. Change line 61:

```typescript
// OLD:
.select('id, mode, openai_api_key, anthropic_api_key, google_api_key, supabase_url, supabase_service_key')

// NEW:
.select('id, mode, openai_api_key, anthropic_api_key, google_api_key')
```

Replace lines 92-98 (dataClient + companyId):

```typescript
// OLD:
const dataClient = getDataClient({
  mode: company.mode,
  supabase_url: company.supabase_url,
  supabase_service_key: company.supabase_service_key,
});
const companyId = company.mode === 'hosted' ? company.id : undefined;

// NEW:
const companyId = company.id;
```

Replace lines 101-106 (summary query):

```typescript
// OLD:
let summaryQuery = dataClient
  .from('monthly_portfolio_summary')
  .select('*')
  .eq('revenue_month', revenue_month);
if (companyId) summaryQuery = summaryQuery.eq('company_id', companyId);
const { data: summaryData, error: summaryError } = await summaryQuery.single();

// NEW:
const { data: summaryData, error: summaryError } = await admin
  .from('monthly_portfolio_summary')
  .select('*')
  .eq('revenue_month', revenue_month)
  .eq('company_id', companyId)
  .single();
```

Replace lines 113-120 (properties query):

```typescript
// OLD:
let propsQuery = dataClient
  .from('final_reporting_gold')
  .select('listing_id, listing_nickname, revenue, occupied_nights, adr, revenue_delta')
  .eq('revenue_month', revenue_month)
  .order('revenue', { ascending: false })
  .limit(PROPERTY_CAP);
if (companyId) propsQuery = propsQuery.eq('company_id', companyId);
const { data: propertyRows } = await propsQuery;

// NEW:
const { data: propertyRows } = await admin
  .from('final_reporting_gold')
  .select('listing_id, listing_nickname, revenue, occupied_nights, adr, revenue_delta')
  .eq('revenue_month', revenue_month)
  .eq('company_id', companyId)
  .order('revenue', { ascending: false })
  .limit(PROPERTY_CAP);
```

- [ ] **Step 2: Commit**

```bash
git add app/api/pipeline/run/route.ts
git commit -m "refactor(pipeline): use app client for analytics reads"
```

---

### Task 9: Update Export Route — Use App Client

**Files:**
- Modify: `app/api/export/reservations/route.ts:1-168`

- [ ] **Step 1: Remove getDataClient; use admin client for reads**

Remove `import { getDataClient } from '@/lib/getDataClient';` (line 4).

Change company select (line 37):

```typescript
// OLD:
.select('id, name, mode, supabase_url, supabase_service_key')

// NEW:
.select('id, name, mode')
```

Replace lines 67-73 (dataClient + companyId):

```typescript
// OLD:
const dataClient = getDataClient({
  mode: company.mode,
  supabase_url: company.supabase_url,
  supabase_service_key: company.supabase_service_key,
});
const companyId = company.mode === 'hosted' ? company.id : undefined;

// NEW:
const companyId = company.id;
```

Replace all `dataClient` usages with `admin` in the remaining queries (lines 77-131). For each query, also remove the `if (companyId)` guard and always apply `.eq('company_id', companyId)`.

Default month query (lines 77-83):

```typescript
// OLD:
let q = dataClient
  .from('monthly_portfolio_summary')
  .select('revenue_month')
  .order('revenue_month', { ascending: false })
  .limit(1);
if (companyId) q = q.eq('company_id', companyId);
const { data: latest } = await q.single();

// NEW:
const { data: latest } = await admin
  .from('monthly_portfolio_summary')
  .select('revenue_month')
  .eq('company_id', companyId)
  .order('revenue_month', { ascending: false })
  .limit(1)
  .single();
```

Summary query (lines 92-103):

```typescript
// OLD:
let summaryQuery = dataClient
  .from('final_reporting_gold')
  .select('revenue_month, listing_nickname, revenue, occupied_nights, adr, revenue_delta, portfolio_median_revenue');
if (companyId) summaryQuery = summaryQuery.eq('company_id', companyId);

// NEW:
let summaryQuery = admin
  .from('final_reporting_gold')
  .select('revenue_month, listing_nickname, revenue, occupied_nights, adr, revenue_delta, portfolio_median_revenue')
  .eq('company_id', companyId);
```

Raw reservations query (lines 116-119):

```typescript
// OLD:
let resQuery = dataClient
  .from('reservations')
  .select('confirmation_code, listing_nickname, check_in_date, check_out_date, nights, net_accommodation_fare, listing_id, data');
if (companyId) resQuery = resQuery.eq('company_id', companyId);

// NEW:
let resQuery = admin
  .from('reservations')
  .select('confirmation_code, listing_nickname, check_in_date, check_out_date, nights, net_accommodation_fare, listing_id, data')
  .eq('company_id', companyId);
```

- [ ] **Step 2: Commit**

```bash
git add app/api/export/reservations/route.ts
git commit -m "refactor(export): use app client for analytics reads"
```

---

### Task 10: Create Sync API Route

**Files:**
- Create: `app/api/sync/reservations/route.ts`

- [ ] **Step 1: Implement the sync route**

```typescript
import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';

/** Required columns in BYOS reservations table (typed columns in Portlio). */
const REQUIRED_FIELDS = new Set([
  'confirmation_code',
  'listing_nickname',
  'check_in_date',
  'check_out_date',
  'nights',
  'net_accommodation_fare',
  'listing_id',
]);

const MAX_SYNCS_PER_DAY = 10;
const BATCH_SIZE = 500;

export async function POST() {
  // 1. Auth
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAppAdminClient();

  // 2. Get user → company
  const { data: userRow } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const companyId = userRow.company_id as string;

  // 3. Assert BYOS mode
  const { data: company } = await admin
    .from('companies')
    .select('id, mode, supabase_url, supabase_service_key')
    .eq('id', companyId)
    .single();
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  if (company.mode !== 'byos') {
    return NextResponse.json({ error: 'Sync is only available for BYOS companies' }, { status: 400 });
  }

  // 4. Rate limit: max 10 syncs per day
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('sync_runs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('started_at', dayAgo);
  if ((count ?? 0) >= MAX_SYNCS_PER_DAY) {
    return NextResponse.json(
      { error: `Rate limit: max ${MAX_SYNCS_PER_DAY} syncs per day` },
      { status: 429 }
    );
  }

  // 5. Create sync_runs record
  const { data: runRow, error: runError } = await admin
    .from('sync_runs')
    .insert({ company_id: companyId, status: 'running' })
    .select('id')
    .single();
  if (runError || !runRow) {
    return NextResponse.json({ error: 'Failed to start sync' }, { status: 500 });
  }
  const runId = runRow.id as string;

  try {
    // 6. Connect to company's Supabase
    const byosClient = getDataClient({
      mode: company.mode,
      supabase_url: company.supabase_url,
      supabase_service_key: company.supabase_service_key,
    });

    // 7. Fetch all rows from company's reservations
    const { data: rows, error: fetchError } = await byosClient
      .from('reservations')
      .select('*');
    if (fetchError) {
      throw new Error(`Failed to fetch reservations: ${fetchError.message}`);
    }
    if (!rows || rows.length === 0) {
      // No rows — mark complete with 0
      await admin
        .from('sync_runs')
        .update({ status: 'complete', rows_synced: 0, completed_at: new Date().toISOString() })
        .eq('id', runId);
      return NextResponse.json({ sync_run_id: runId, rows_synced: 0 });
    }

    // 8. Discover extra columns from the returned row keys
    const allColumns = Object.keys(rows[0]);
    const extraColumns = allColumns.filter((c) => !REQUIRED_FIELDS.has(c) && c !== 'data');

    // 9. Map rows: extract required fields, merge extras into data
    const mapped = rows.map((row: Record<string, unknown>) => {
      const existingData = (row.data as Record<string, unknown>) ?? {};
      const extraData: Record<string, unknown> = {};
      for (const col of extraColumns) {
        if (row[col] !== undefined && row[col] !== null) {
          extraData[col] = row[col];
        }
      }

      return {
        company_id: companyId,
        confirmation_code: row.confirmation_code as string,
        listing_nickname: row.listing_nickname as string,
        check_in_date: row.check_in_date as string,
        check_out_date: row.check_out_date as string,
        nights: row.nights as number,
        net_accommodation_fare: row.net_accommodation_fare as number,
        listing_id: row.listing_id as string,
        data: { ...existingData, ...extraData },
      };
    });

    // 10. Upsert into Portlio's hosted reservations in batches
    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await admin
        .from('reservations')
        .upsert(batch, { onConflict: 'company_id,confirmation_code' });
      if (upsertError) {
        throw new Error(`Upsert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`);
      }
    }

    // 11. Mark complete
    await admin
      .from('sync_runs')
      .update({
        status: 'complete',
        rows_synced: mapped.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return NextResponse.json({ sync_run_id: runId, rows_synced: mapped.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await admin
      .from('sync_runs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
    return NextResponse.json({ error: message, sync_run_id: runId }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/sync/reservations/route.ts
git commit -m "feat(sync): add POST /api/sync/reservations for BYOS data pull"
```

---

### Task 11: Add Dual-Write to Upload Route for BYOS

**Files:**
- Modify: `app/api/upload/reservations/route.ts:126-146`

- [ ] **Step 1: After the existing BYOS upsert, add a second upsert into Portlio's DB**

Replace lines 126-146 with:

```typescript
  if (validRecords.length > 0) {
    const dataClient = getDataClient({
      mode: company.mode,
      supabase_url: company.supabase_url,
      supabase_service_key: company.supabase_service_key,
    });

    const payload =
      company.mode === 'hosted'
        ? validRecords.map((r) => ({ ...r, company_id: companyId }))
        : validRecords;
    const onConflict =
      company.mode === 'hosted' ? 'company_id,confirmation_code' : 'confirmation_code';

    const { error } = await dataClient.from('reservations').upsert(payload, { onConflict });
    if (error) {
      upsertError = error.message;
    } else {
      inserted = validRecords.length;

      // Dual-write: BYOS uploads also go into Portlio's hosted reservations table
      if (company.mode === 'byos') {
        const hostedPayload = validRecords.map((r) => ({ ...r, company_id: companyId }));
        await admin
          .from('reservations')
          .upsert(hostedPayload, { onConflict: 'company_id,confirmation_code' });
        // Dual-write failure is non-fatal — data will be pulled on next sync
      }
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/reservations/route.ts
git commit -m "feat(upload): add BYOS dual-write to Portlio hosted reservations"
```

---

### Task 12: Create SyncCard Component

**Files:**
- Create: `components/settings/SyncCard.tsx`

- [ ] **Step 1: Build the SyncCard client component**

```tsx
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SyncRun = {
  status: string;
  rows_synced: number | null;
  error_message: string | null;
  completed_at: string | null;
};

export function SyncCard({ lastRun }: { lastRun: SyncRun | null }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    status: 'success' | 'error';
    message: string;
  } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/sync/reservations', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        setResult({ status: 'error', message: body.error ?? 'Sync failed' });
      } else {
        setResult({
          status: 'success',
          message: `Synced ${body.rows_synced} reservation${body.rows_synced === 1 ? '' : 's'}`,
        });
      }
    } catch {
      setResult({ status: 'error', message: 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncLabel = lastRun?.completed_at
    ? `Last sync: ${new Date(lastRun.completed_at).toLocaleString()} — ${lastRun.rows_synced ?? 0} rows`
    : 'Never synced';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Sync</CardTitle>
        <CardDescription>
          Pull reservations from your Supabase into Portlio for analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{lastSyncLabel}</p>

        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>

        {result && (
          <p
            className={`text-sm ${
              result.status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {result.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/settings/SyncCard.tsx
git commit -m "feat(settings): add SyncCard component for BYOS data sync"
```

---

### Task 13: Add Data Sync Card to Settings Page

**Files:**
- Modify: `app/(protected)/dashboard/settings/page.tsx:1-65`

- [ ] **Step 1: Add the Data Sync section for BYOS companies**

Replace the entire file:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SyncCard } from '@/components/settings/SyncCard';

const SECTIONS = [
  {
    title: 'AI Prompt',
    description: 'Customize system prompt, user template, model, and parameters.',
    href: '/dashboard/settings/prompt',
    adminOnly: true,
  },
  {
    title: 'Export Data',
    description: 'Download reservation data as formatted Excel reports.',
    href: '/dashboard/settings/export',
    adminOnly: false,
  },
];

export default async function SettingsPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  const role = userRow?.role ?? 'member';
  const companyId = userRow?.company_id as string | undefined;

  // Check company mode for sync card visibility
  const admin = createAppAdminClient();
  let isByos = false;
  let lastSyncRun: { status: string; rows_synced: number | null; error_message: string | null; completed_at: string | null } | null = null;

  if (companyId) {
    const { data: company } = await admin
      .from('companies')
      .select('mode')
      .eq('id', companyId)
      .single();
    isByos = company?.mode === 'byos';

    if (isByos) {
      const { data: lastRun } = await admin
        .from('sync_runs')
        .select('status, rows_synced, error_message, completed_at')
        .eq('company_id', companyId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      lastSyncRun = lastRun;
    }
  }

  const visibleSections = SECTIONS.filter((s) => !s.adminOnly || role === 'admin');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your pipeline configuration and data exports.
        </p>
      </div>

      {isByos && <SyncCard lastRun={lastSyncRun} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {visibleSections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-blue-600 hover:underline">
                  Open &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(protected)/dashboard/settings/page.tsx" components/settings/SyncCard.tsx
git commit -m "feat(settings): show Data Sync card for BYOS companies"
```

---

## Summary of Changes

| Task | Type | What |
|------|------|------|
| 1 | Schema | `sync_runs` migration |
| 2 | Schema | Trim `byos-ddl.ts` to reservations-only |
| 3 | Refactor | Make `companyId` required in `queries.ts` |
| 4 | Refactor | Dashboard page → app client |
| 5 | Refactor | Briefing page → app client |
| 6 | Refactor | Export settings → app client |
| 7 | Refactor | Prompt settings → app client |
| 8 | Refactor | Pipeline route → app client |
| 9 | Refactor | Export route → app client |
| 10 | Feature | Sync API route |
| 11 | Feature | Upload dual-write for BYOS |
| 12 | Feature | SyncCard component |
| 13 | Feature | Settings page sync card |
