# Portlio Phase 3 — Implementation Plan
# Analytics Dashboard: KPI Cards, Revenue Trends & Property Table

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty dashboard shell with a real, data-driven analytics page that shows portfolio-wide KPI summary cards, a monthly revenue trend chart, and a per-property breakdown table — all powered by the SQL views deployed in Phase 1 and the reservation data ingested in Phase 2. Both Hosted and BYOS companies see identical UI; only the data source differs (routed transparently through `getDataClient`).

**Architecture:**
- All data is fetched server-side in React Server Components using `getDataClient(companyId)`.
- No client-side fetching except for interactive chart rendering (Recharts).
- The 3 analytics queries map directly to Phase 1 views: `monthly_portfolio_summary`, `final_reporting_gold`, and `channel_mix_summary`.
- A month-picker (single select dropdown) filters all panels simultaneously via a URL search param (`?month=2026-03`).
- KPI cards handle the case of no data gracefully (zero state).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS, shadcn/ui, Recharts (for charts), date-fns (date formatting).

**Reference:** `Docs/superpowers/specs/2026-04-14-portlio-phase1-design.md` (§2 — views, §3 — schema), `supabase/migrations/003_hosted_views.sql`.

---

## Folder Structure (new & modified files)

```
app/
└── (protected)/
    └── dashboard/
        └── page.tsx                         ← MODIFY: replace empty shell with data fetch + layout

components/
└── dashboard/
    ├── MonthPicker.tsx                      ← NEW: month selector (client component)
    ├── KpiCard.tsx                          ← NEW: single KPI metric card
    ├── KpiCardRow.tsx                       ← NEW: row of 4 KPI cards
    ├── RevenueTrendChart.tsx                ← NEW: Recharts line/bar chart (client)
    ├── PropertyTable.tsx                    ← NEW: per-property sortable table
    ├── ChannelMixChart.tsx                  ← NEW: Recharts pie/bar for channel mix
    ├── DashboardEmptyState.tsx              ← NEW: shown when no reservations exist
    └── __tests__/
        ├── KpiCard.test.tsx
        ├── KpiCardRow.test.tsx
        └── DashboardEmptyState.test.tsx

lib/
└── analytics/
    ├── queries.ts                           ← NEW: typed query functions against views
    ├── types.ts                             ← NEW: analytics data types
    └── __tests__/
        └── queries.test.ts

supabase/
└── migrations/
    └── (none needed — all views already deployed in 003)
```

Files modified (not created):
- `app/(protected)/dashboard/page.tsx` — wire up data fetching and render all panels.
- `components/layout/Sidebar.tsx` — ensure Dashboard nav item is marked active.
- `tasks.md` — check off Tasks 23–28 as they land.

---

## Design Notes (read before starting)

### Views used and their shapes

**`monthly_portfolio_summary`** (one row per company per month):
```sql
company_id, revenue_month, property_count, total_nights, total_revenue, portfolio_adr
```

**`final_reporting_gold`** (one row per property per month):
```sql
company_id, listing_id, listing_nickname, revenue_month,
revenue, occupied_nights, adr,
revenue_delta, nights_delta, adr_delta,
portfolio_median_revenue, portfolio_median_adr
```

**`channel_mix_summary`** (one row per company per channel label):
```sql
company_id, channel_label, total_nights, total_revenue, revenue_share
```

> Note: `channel_mix_summary` is NOT filtered by month — it is portfolio-wide across all time. A future phase may add a month dimension.

### Month picker behaviour

- URL param: `?month=YYYY-MM` (e.g. `?month=2026-03`).
- Default: most recent `revenue_month` present in `monthly_portfolio_summary` for the company.
- If no data exists at all: show `DashboardEmptyState`.

### KPI cards (4 cards)

| Card | Value | Delta label |
|------|-------|-------------|
| Total Revenue | `total_revenue` | vs prior month (`revenue_delta` summed) |
| Occupied Nights | `total_nights` | vs prior month |
| Portfolio ADR | `portfolio_adr` | vs prior month |
| Properties | `property_count` | — (no delta) |

Delta is shown as a coloured badge: green if positive, red if negative, grey if zero or no prior data.

### Revenue trend chart

- X-axis: `revenue_month` (last 12 months).
- Y-axis: `total_revenue`.
- Secondary line: `portfolio_adr` (right Y-axis).
- Uses Recharts `ComposedChart`.

### Property table columns

| Column | Source |
|--------|--------|
| Property | `listing_nickname` |
| Revenue | `revenue` |
| vs Median | `revenue - portfolio_median_revenue` |
| Nights | `occupied_nights` |
| ADR | `adr` |
| vs Prev Month | `revenue_delta` (coloured) |

Sortable client-side by any column. Default: sort by Revenue descending.

### Empty state

Shown when `monthly_portfolio_summary` returns zero rows for the company. Displays a prompt to upload their first file and a link to `/dashboard/upload`.

---

## Task 23: Analytics Query Layer

**Files:**
- Create: `lib/analytics/types.ts`
- Create: `lib/analytics/queries.ts`
- Create: `lib/analytics/__tests__/queries.test.ts`

### Task 23a: Types

- [ ] **Step 1: Create `lib/analytics/types.ts`**

```ts
export type MonthlyPortfolioSummary = {
  revenue_month: string;     // 'YYYY-MM-DD'
  property_count: number;
  total_nights: number;
  total_revenue: number;
  portfolio_adr: number;
};

export type PropertyMonthRow = {
  listing_id: string;
  listing_nickname: string;
  revenue_month: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
  nights_delta: number | null;
  adr_delta: number | null;
  portfolio_median_revenue: number | null;
  portfolio_median_adr: number | null;
};

export type ChannelMixRow = {
  channel_label: string;
  total_nights: number;
  total_revenue: number;
  revenue_share: number;
};

export type DashboardData = {
  availableMonths: string[];              // sorted descending, 'YYYY-MM-DD'
  selectedMonth: string;                  // 'YYYY-MM-DD'
  summary: MonthlyPortfolioSummary | null;
  priorSummary: MonthlyPortfolioSummary | null;
  properties: PropertyMonthRow[];
  channelMix: ChannelMixRow[];
};
```

### Task 23b: Query functions

- [ ] **Step 1: Create `lib/analytics/queries.ts`**

```ts
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
  companyId: string,
  month: string
): Promise<MonthlyPortfolioSummary | null> {
  const { data, error } = await client
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('company_id', companyId)
    .eq('revenue_month', month)
    .single();

  if (error || !data) return null;
  return data as MonthlyPortfolioSummary;
}

export async function fetchPropertyRows(
  client: SupabaseClient,
  companyId: string,
  month: string
): Promise<PropertyMonthRow[]> {
  const { data, error } = await client
    .from('final_reporting_gold')
    .select('*')
    .eq('company_id', companyId)
    .eq('revenue_month', month)
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
      properties: [],
      channelMix: [],
    };
  }

  const selectedMonth = requestedMonth && availableMonths.includes(requestedMonth)
    ? requestedMonth
    : availableMonths[0];

  const priorIdx = availableMonths.indexOf(selectedMonth) + 1;
  const priorMonth = priorIdx < availableMonths.length ? availableMonths[priorIdx] : null;

  const [summary, priorSummary, properties, channelMix] = await Promise.all([
    fetchMonthlySummary(client, companyId, selectedMonth),
    priorMonth ? fetchMonthlySummary(client, companyId, priorMonth) : Promise.resolve(null),
    fetchPropertyRows(client, companyId, selectedMonth),
    fetchChannelMix(client, companyId),
  ]);

  return { availableMonths, selectedMonth, summary, priorSummary, properties, channelMix };
}
```

- [ ] **Step 2: Write tests for `queries.ts`** (mock Supabase client)

- [ ] **Step 3: Run tests — verify pass**

- [ ] **Step 4: Commit**
```
git add lib/analytics/
git commit -m "feat(analytics): query layer with types"
```

---

## Task 24: KPI Card Components

**Files:**
- Create: `components/dashboard/KpiCard.tsx`
- Create: `components/dashboard/KpiCardRow.tsx`
- Create: `components/dashboard/__tests__/KpiCard.test.tsx`

- [ ] **Step 1: Implement `KpiCard.tsx`**

Props:
```ts
type KpiCardProps = {
  label: string;
  value: string;           // pre-formatted (e.g. "€ 48,200")
  delta?: number | null;   // raw numeric delta; component decides color
  deltaLabel?: string;     // e.g. "vs last month"
  icon?: React.ReactNode;
};
```

Renders a white rounded card with label, large value, and optional coloured delta badge. Green if `delta > 0`, red if `delta < 0`, grey if `delta === 0` or absent.

- [ ] **Step 2: Implement `KpiCardRow.tsx`**

Accepts `DashboardData` and `priorSummary`, derives the 4 card props, renders a responsive 2×2 → 4×1 grid using Tailwind.

- [ ] **Step 3: Write tests** — renders correctly, delta colours applied.

- [ ] **Step 4: Run tests — verify pass**

- [ ] **Step 5: Commit**
```
git add components/dashboard/KpiCard.tsx components/dashboard/KpiCardRow.tsx
git commit -m "feat(dashboard): KPI card components"
```

---

## Task 25: Revenue Trend Chart

**Files:**
- Create: `components/dashboard/RevenueTrendChart.tsx`

- [ ] **Step 1: Install Recharts**
```
npm install recharts
npm install --save-dev @types/recharts
```

- [ ] **Step 2: Implement `RevenueTrendChart.tsx`**

Client component (`'use client'`). Props:
```ts
type Props = {
  data: Pick<MonthlyPortfolioSummary, 'revenue_month' | 'total_revenue' | 'portfolio_adr'>[];
};
```

Uses Recharts `ComposedChart`:
- `Bar` for `total_revenue` (primary left Y-axis, blue fill).
- `Line` for `portfolio_adr` (secondary right Y-axis, amber stroke).
- `XAxis` formatted as `MMM yy` using date-fns.
- Responsive via `ResponsiveContainer`.
- Tooltip shows both values.
- Shows last 12 months. If fewer months exist, shows all.

- [ ] **Step 3: Install date-fns if not present**
```
npm install date-fns
```

- [ ] **Step 4: Commit**
```
git add components/dashboard/RevenueTrendChart.tsx
git commit -m "feat(dashboard): revenue trend chart (Recharts)"
```

---

## Task 26: Property Breakdown Table

**Files:**
- Create: `components/dashboard/PropertyTable.tsx`

- [ ] **Step 1: Implement `PropertyTable.tsx`**

Client component. Props:
```ts
type Props = {
  rows: PropertyMonthRow[];
};
```

Features:
- Client-side sortable: clicking a column header toggles `asc`/`desc`. Default: `revenue desc`.
- Colour-coded `revenue_delta` cell (green/red arrow + value).
- `vs Median` column shows `revenue - portfolio_median_revenue` with sign and colour.
- Revenue and ADR values formatted as locale currency (`toLocaleString`).
- Responsive: on mobile, hide `vs Median` and `ADR delta` columns.
- Uses shadcn/ui `Table` primitives.

- [ ] **Step 2: Commit**
```
git add components/dashboard/PropertyTable.tsx
git commit -m "feat(dashboard): property breakdown table"
```

---

## Task 27: Channel Mix Chart

**Files:**
- Create: `components/dashboard/ChannelMixChart.tsx`

- [ ] **Step 1: Implement `ChannelMixChart.tsx`**

Client component. Props:
```ts
type Props = {
  data: ChannelMixRow[];
};
```

Uses Recharts `PieChart` with `Pie` + `Tooltip` + `Legend`. Each slice is a `channel_label`. Shows `revenue_share` as percentage in tooltip. Max 8 slices; anything beyond is grouped as "Other". Uses a harmonious colour palette (slate/blue/amber/teal family, 8 colours defined as constant).

- [ ] **Step 2: Commit**
```
git add components/dashboard/ChannelMixChart.tsx
git commit -m "feat(dashboard): channel mix pie chart"
```

---

## Task 28: Wire Up Dashboard Page

**Files:**
- Modify: `app/(protected)/dashboard/page.tsx`
- Create: `components/dashboard/MonthPicker.tsx`
- Create: `components/dashboard/DashboardEmptyState.tsx`

### 28a: Empty State Component

- [ ] **Step 1: Create `DashboardEmptyState.tsx`**

```tsx
// Simple centred message with a CTA link to /dashboard/upload
export function DashboardEmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm text-slate-500">No reservation data yet.</p>
      <Link href="/dashboard/upload" className="text-sm font-medium text-blue-600 hover:underline">
        Upload your first Excel file →
      </Link>
    </div>
  );
}
```

### 28b: Month Picker

- [ ] **Step 1: Create `MonthPicker.tsx`**

Client component. Receives `availableMonths: string[]` and `selectedMonth: string`. Renders a shadcn/ui `Select` dropdown. On change, updates the URL search param `?month=` via `router.push` (shallow navigation).

### 28c: Dashboard Page

- [ ] **Step 1: Modify `app/(protected)/dashboard/page.tsx`**

```tsx
// Server Component
import { createAppAdminClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { fetchDashboardData } from '@/lib/analytics/queries';
// ... import components

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const appClient = createAppAdminClient();
  const { data: { user } } = await appClient.auth.getUser(); // via cookie

  // Get company_id from users table
  const { data: userRow } = await appClient
    .from('users')
    .select('company_id')
    .eq('id', user!.id)
    .single();

  const { client, company } = await getDataClient(userRow!.company_id);

  const dashboardData = await fetchDashboardData(
    client,
    company.mode === 'hosted' ? userRow!.company_id : undefined, // BYOS has no company_id filter
    searchParams.month
  );

  if (dashboardData.availableMonths.length === 0) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Portfolio Overview</h1>
        <MonthPicker
          availableMonths={dashboardData.availableMonths}
          selectedMonth={dashboardData.selectedMonth}
        />
      </header>

      <KpiCardRow
        summary={dashboardData.summary}
        priorSummary={dashboardData.priorSummary}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={/* last 12 months from availableMonths */} />
        </div>
        <div>
          <ChannelMixChart data={dashboardData.channelMix} />
        </div>
      </div>

      <PropertyTable rows={dashboardData.properties} />
    </div>
  );
}
```

> Note on BYOS: `getDataClient` returns the company's own Supabase client. The views deployed during onboarding (via `byos-ddl.ts`) have no `company_id` column. The query functions in `lib/analytics/queries.ts` must accept an optional `companyId` param and omit the `.eq('company_id', ...)` filter when in BYOS mode. This branching lives in the page, not in the query functions.

- [ ] **Step 2: Update `lib/analytics/queries.ts`** — make `companyId` optional; skip filter if undefined.

- [ ] **Step 3: Full manual verification**
  - Sign in → check dashboard loads with data / empty state as appropriate.
  - Change month via picker → page re-renders with correct data.
  - Verify KPI delta colours are correct.
  - Verify property table sort works.
  - Verify channel mix chart renders correctly.

- [ ] **Step 4: Run all tests**
```
npm test
```

- [ ] **Step 5: Commit**
```
git add app/(protected)/dashboard/page.tsx components/dashboard/
git commit -m "feat(dashboard): analytics page — KPIs, charts, property table"
```

---

## Verification Plan

### Automated Tests
- `lib/analytics/__tests__/queries.test.ts` — mock Supabase, verify query shaping.
- `components/dashboard/__tests__/KpiCard.test.tsx` — snapshot + delta colour logic.
- `components/dashboard/__tests__/DashboardEmptyState.test.tsx` — renders CTA link.
- Full suite: `npm test` should remain green.

### Manual Verification
1. Log in as a company with uploaded reservation data → see KPI cards populated.
2. Log in as a company with no reservations → see `DashboardEmptyState`.
3. Month picker changes reflect in KPI cards and property table.
4. Property table sorts correctly on each column.
5. Revenue trend chart renders last N months without error.
6. Channel mix pie chart renders if `channel`/`source` JSONB data present; hidden or empty if not.
7. BYOS company: same data flow, no `company_id` in queries.
8. Mobile viewport (375px wide): table hides optional columns, layout stacks correctly.
