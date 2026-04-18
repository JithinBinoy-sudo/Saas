# Portlio Phase 5 — Implementation Plan
# Admin Prompt Management & Excel Report Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admin users two new superpowers:
1. **Prompt Management** — A settings page where admins can view and edit the AI pipeline's system prompt, user prompt template, model, temperature, and max tokens. Changes take effect on the next pipeline run. A "Test run" feature lets admins preview the output with the new prompt without saving a briefing.
2. **Excel Report Export** — A page (and API route) that generates a formatted `.xlsx` report from the company's reservation data for any selected month or date range. The report mirrors the structure users originally uploaded but enriched with computed metrics (ADR, MoM delta). Admins and members can both download.

**Architecture:**
- **Prompt Management:** `GET/PATCH /api/pipeline/prompt` reads and writes `prompt_configs`. The settings UI (`/dashboard/settings/prompt`) renders the current config in an editable form with live character count and a "Test prompt" button that calls `POST /api/pipeline/run` with `preview: true` (does not save a briefing or create a `pipeline_runs` record).
- **Excel Export:** `GET /api/export/reservations?month=YYYY-MM` (or `?from=&to=`) streams an `.xlsx` file built by the `xlsx` library (already installed). The export query hits `final_reporting_gold` for metrics and `reservations` for raw data. Both hosted and BYOS use `getDataClient`.
- Both features are admin-gated for prompt management; export is available to all authenticated users.

**Tech Stack:** Next.js 14 App Router, TypeScript, `xlsx` (already installed), Supabase, Tailwind CSS, shadcn/ui, Zod (validation).

**Reference:**
- `supabase/migrations/001_app_schema.sql` — `prompt_configs` table (all editable fields already exist)
- `supabase/migrations/003_hosted_views.sql` — `final_reporting_gold`, `monthly_portfolio_summary`
- `lib/pipeline/buildPrompt.ts` — prompt assembly (Phase 4)
- `lib/pipeline/providers/` — provider adapters for test-run (Phase 4)
- `lib/upload/types.ts` — `ReservationRecord` type
- `lib/getDataClient.ts` — data routing

---

## Folder Structure (new & modified files)

```
app/
├── api/
│   ├── pipeline/
│   │   └── prompt/
│   │       └── route.ts                        ← NEW: GET + PATCH prompt_configs
│   └── export/
│       └── reservations/
│           └── route.ts                        ← NEW: GET → streams .xlsx file
└── (protected)/
    └── dashboard/
        └── settings/
            ├── page.tsx                        ← NEW: settings hub (links to sub-pages)
            └── prompt/
                └── page.tsx                    ← NEW: prompt config editor

components/
└── settings/
    ├── PromptConfigForm.tsx                    ← NEW: form with all prompt_configs fields
    ├── PromptTestPanel.tsx                     ← NEW: test-run button + result preview
    ├── ExportButton.tsx                        ← NEW: month picker + download trigger
    └── __tests__/
        ├── PromptConfigForm.test.tsx
        └── ExportButton.test.tsx

lib/
└── export/
    ├── buildReservationReport.ts               ← NEW: builds xlsx Workbook from query results
    ├── types.ts                                ← NEW: export types
    └── __tests__/
        └── buildReservationReport.test.ts
```

Files modified (not created):
- `components/layout/Sidebar.tsx` — add "Settings" nav group with "Prompt" and "Export" links.
- `tasks.md` — check off Tasks 36–40.

---

## Design Notes (read before starting)

### `prompt_configs` fields (all editable in Phase 5)

| Field | Type | Default | UI Widget |
|-------|------|---------|-----------|
| `system_prompt` | `text` | (default prompt) | `<textarea>` — tall, monospace |
| `user_prompt_template` | `text` | (default template) | `<textarea>` — tall, monospace |
| `model` | `text` | `gpt-4o` | `<Select>` — same SUPPORTED_MODELS list from Phase 4 |
| `temperature` | `real` | `0.3` | `<Slider>` 0–1, step 0.05 |
| `max_tokens` | `integer` | `2000` | `<Input type="number">` 100–4000 |

The form shows a live **character count** for both prompt fields and a warning if the template is missing any required `{{variable}}` placeholders (`{{revenue_month}}`, `{{property_count}}`, `{{total_revenue}}`, `{{portfolio_adr}}`, `{{total_nights}}`, `{{property_table}}`).

### Prompt test run

- Clicking "Test prompt" calls `POST /api/pipeline/run` with `{ revenue_month, model, preview: true }`.
- When `preview: true`, the route runs the full pipeline (fetches data, builds prompts, calls AI) but does **not** upsert `monthly_portfolio_briefings` and does **not** insert a `pipeline_runs` row.
- The response is `{ briefing_text, model, prompt_tokens, completion_tokens }` — no hash, no persistence.
- The UI renders the result in a collapsible `PromptTestPanel` below the form.
- Token count and estimated cost (based on published pricing) are shown.

### Estimated cost display

Simple lookup table of per-1K-token prices (both input and output) for each supported model, hardcoded in the frontend. Formula: `(promptTokens / 1000) * inputPrice + (completionTokens / 1000) * outputPrice`. Shown as "~$0.04" in small grey text next to the token count.

### Excel export: sheet structure

The export produces a single `.xlsx` file with **two sheets**:

**Sheet 1: "Summary"** — mirrors `final_reporting_gold` for the selected period:
```
Month | Property | Revenue | Nights | ADR | vs Prev Revenue | vs Median Revenue
```

**Sheet 2: "Raw Reservations"** — mirrors the original upload shape (the 7 required columns + all keys from the `data` jsonb expanded as columns):
```
Confirmation Code | Listing | Check In | Check Out | Nights | Net Fare | Listing ID | [custom fields...]
```

Custom JSONB fields are dynamically discovered by scanning all rows for keys. Headers are auto-sized.

### Export: date range

Two modes, driven by query params:
- `?month=YYYY-MM` — single month (uses `revenue_month` filter on `final_reporting_gold`)
- `?from=YYYY-MM-DD&to=YYYY-MM-DD` — date range on `check_in_date`

The route validates params with Zod. If no params, defaults to the most recent month.

### Export: streaming vs. buffered

For Phase 5, the export is **buffered** (not streamed) — the entire workbook is built in memory and returned as a `Buffer`. Cap: **50,000 rows** server-side; return `413` if exceeded with a message to use a narrower date range.

---

## Task 36: Prompt Config API Route

**Files:**
- Create: `app/api/pipeline/prompt/route.ts`
- Create: `app/api/pipeline/prompt/__tests__/route.test.ts`

### `GET /api/pipeline/prompt`

Returns the company's current `prompt_configs` row, or the built-in defaults if no row exists yet.

**Response:**
```json
{
  "system_prompt": "...",
  "user_prompt_template": "...",
  "model": "gpt-4o",
  "temperature": 0.3,
  "max_tokens": 2000,
  "updated_at": "2026-04-17T..."
}
```

### `PATCH /api/pipeline/prompt`

Admin-only. Accepts a partial update — only provided fields are updated. Validates with Zod:

```ts
const patchSchema = z.object({
  system_prompt:        z.string().min(20).max(4000).optional(),
  user_prompt_template: z.string().min(20).max(4000).optional(),
  model:                z.enum(Object.keys(SUPPORTED_MODELS) as [string, ...string[]]).optional(),
  temperature:          z.number().min(0).max(1).optional(),
  max_tokens:           z.number().int().min(100).max(4000).optional(),
});
```

Upserts the `prompt_configs` row (one per company). Sets `updated_by = auth.uid()` and `updated_at = now()`.

**Response:** `200 { success: true }` or validation errors.

- [ ] **Step 1: Write route tests** (mock Supabase; test GET defaults, PATCH validation, admin guard)
- [ ] **Step 2: Implement `GET /api/pipeline/prompt`**
- [ ] **Step 3: Implement `PATCH /api/pipeline/prompt`** (admin-only, Zod validation, upsert)
- [ ] **Step 4: Update `POST /api/pipeline/run`** (Phase 4) to handle `preview: true` — skip DB writes, return raw result
- [ ] **Step 5: Run tests — verify pass**
- [ ] **Step 6: Commit**
```
git add app/api/pipeline/prompt/
git commit -m "feat(settings): GET + PATCH /api/pipeline/prompt"
```

---

## Task 37: Prompt Config UI

**Files:**
- Create: `app/(protected)/dashboard/settings/prompt/page.tsx`
- Create: `app/(protected)/dashboard/settings/page.tsx`
- Create: `components/settings/PromptConfigForm.tsx`
- Create: `components/settings/PromptTestPanel.tsx`

### `PromptConfigForm`

Client component. Props: `initialConfig: PromptConfig`. Features:
- Controlled `<textarea>` for `system_prompt` with character count badge (max 4000, turns red if over).
- Controlled `<textarea>` for `user_prompt_template` with missing-placeholder warnings (yellow inline list).
- `<Select>` for `model` using the SUPPORTED_MODELS list from Phase 4 (with provider group headings and "Preview" badges).
- shadcn/ui `<Slider>` for `temperature` (0–1, step 0.05) with live numeric display.
- `<Input type="number">` for `max_tokens`.
- "Save changes" button — calls `PATCH /api/pipeline/prompt`. Shows spinner + success/error toast.
- "Reset to defaults" link — resets form state to built-in defaults (does not save until user clicks Save).

### `PromptTestPanel`

Client component. Props: `model: string`. Features:
- Month selector dropdown (fetches available months from `monthly_portfolio_summary`).
- "Test prompt" button — calls `POST /api/pipeline/run` with `preview: true` + current form values (without saving). Disabled if no month selected.
- Loading state with streaming-style ellipsis animation.
- Result panel: collapsible card showing the briefing text, token counts, and estimated cost.
- Note: "This is a test run. No briefing will be saved."

### Settings page

```tsx
// /dashboard/settings/prompt — Server Component shell
// Fetches current prompt_configs via the API and renders PromptConfigForm + PromptTestPanel
```

### Settings hub

```tsx
// /dashboard/settings — simple page with card links to sub-sections:
// • "AI Prompt" → /dashboard/settings/prompt
// • "Export" → /dashboard/settings/export (built in Task 39)
```

- [ ] **Step 1: Implement `PromptConfigForm.tsx`** with all fields, validation, save
- [ ] **Step 2: Implement `PromptTestPanel.tsx`** with test-run + result display
- [ ] **Step 3: Implement settings prompt page** (server shell that fetches and passes config)
- [ ] **Step 4: Implement settings hub page**
- [ ] **Step 5: Write component tests** (form renders fields, placeholder warnings, save button state)
- [ ] **Step 6: Run tests — verify pass**
- [ ] **Step 7: Commit**
```
git add components/settings/PromptConfigForm.tsx components/settings/PromptTestPanel.tsx
git add app/(protected)/dashboard/settings/
git commit -m "feat(settings): prompt management UI"
```

---

## Task 38: Excel Export Library

**Files:**
- Create: `lib/export/types.ts`
- Create: `lib/export/buildReservationReport.ts`
- Create: `lib/export/__tests__/buildReservationReport.test.ts`

### Types

```ts
// lib/export/types.ts

export type SummaryRow = {
  revenue_month: string;
  listing_nickname: string;
  revenue: number;
  occupied_nights: number;
  adr: number;
  revenue_delta: number | null;
  portfolio_median_revenue: number | null;
};

export type RawReservationRow = {
  confirmation_code: string;
  listing_nickname: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  net_accommodation_fare: number;
  listing_id: string;
  data: Record<string, string | number | null>;
};

export type ReportInput = {
  summary: SummaryRow[];
  reservations: RawReservationRow[];
  generatedAt: Date;
  companyName: string;
};
```

### `buildReservationReport`

```ts
import * as XLSX from 'xlsx';
import type { ReportInput } from './types';

export function buildReservationReport(input: ReportInput): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = input.summary.map((r) => ({
    Month: r.revenue_month,
    Property: r.listing_nickname,
    Revenue: r.revenue,
    Nights: r.occupied_nights,
    ADR: r.adr,
    'vs Prev Month Revenue': r.revenue_delta ?? '',
    'vs Portfolio Median': r.portfolio_median_revenue != null
      ? r.revenue - r.portfolio_median_revenue
      : '',
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Raw Reservations — discover all JSONB keys first
  const jsonbKeys = Array.from(
    new Set(input.reservations.flatMap((r) => Object.keys(r.data)))
  ).sort();

  const rawRows = input.reservations.map((r) => ({
    'Confirmation Code': r.confirmation_code,
    'Listing Nickname': r.listing_nickname,
    'Check In': r.check_in_date,
    'Check Out': r.check_out_date,
    Nights: r.nights,
    'Net Fare': r.net_accommodation_fare,
    'Listing ID': r.listing_id,
    ...Object.fromEntries(jsonbKeys.map((k) => [k, r.data[k] ?? ''])),
  }));
  const rawSheet = XLSX.utils.json_to_sheet(rawRows);
  XLSX.utils.book_append_sheet(wb, rawSheet, 'Raw Reservations');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
```

- [ ] **Step 1: Write failing tests**

Key cases:
- Single reservation produces correct Summary and Raw Reservations rows.
- JSONB keys are discovered and expanded as columns.
- Missing JSONB keys in some rows produce empty cells (not undefined).
- Empty inputs produce sheets with only headers.

- [ ] **Step 2: Implement `lib/export/types.ts`**
- [ ] **Step 3: Implement `lib/export/buildReservationReport.ts`**
- [ ] **Step 4: Run tests — verify pass**
- [ ] **Step 5: Commit**
```
git add lib/export/
git commit -m "feat(export): buildReservationReport xlsx builder"
```

---

## Task 39: Excel Export API Route & UI

**Files:**
- Create: `app/api/export/reservations/route.ts`
- Create: `app/(protected)/dashboard/settings/export/page.tsx`
- Create: `components/settings/ExportButton.tsx`

### Route: `GET /api/export/reservations`

Query params validated with Zod:
```ts
const exportSchema = z.union([
  z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }),
  z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({}), // defaults to most recent month
]);
```

Route logic:
```
1. Auth → get user + company
2. Validate and resolve date range
3. getDataClient(company)
4. Query final_reporting_gold (for Summary sheet) filtered by date range
5. Query reservations table (for Raw sheet) filtered by check_in_date range
6. Check row count ≤ 50,000 → 413 if exceeded
7. buildReservationReport({ summary, reservations, generatedAt, companyName })
8. Return Buffer with headers:
   Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   Content-Disposition: attachment; filename="portlio-export-{month}.xlsx"
```

### Export page: `/dashboard/settings/export`

Server component shell. Lists available months (from `monthly_portfolio_summary`). Renders `ExportButton`.

### `ExportButton`

Client component. Features:
- Month range selector: two shadcn/ui `<Select>` dropdowns (From / To month) pre-populated with available months. Single-month mode: same value for both.
- "Export to Excel" button — triggers `GET /api/export/reservations?from=&to=` as a browser download (sets `window.location.href` or uses a hidden `<a>` tag with `download`).
- Loading spinner while the request is in progress (uses `fetch` with `Blob` response to detect completion before triggering download, so the spinner resolves correctly).
- Shows row count estimate fetched from a lightweight `GET /api/export/reservations?count=true` call.
- Error state if export fails or 413.

- [ ] **Step 1: Implement `app/api/export/reservations/route.ts`**
- [ ] **Step 2: Implement `lib/export/` modules** (done in Task 38)
- [ ] **Step 3: Implement `ExportButton.tsx`** with range selector + download trigger
- [ ] **Step 4: Implement export settings page**
- [ ] **Step 5: Add "Export" link to `Sidebar.tsx`** (within Settings group)
- [ ] **Step 6: Write component tests** (ExportButton renders, handles 413 error)
- [ ] **Step 7: Run tests — verify pass**
- [ ] **Step 8: Commit**
```
git add app/api/export/ app/(protected)/dashboard/settings/export/
git add components/settings/ExportButton.tsx
git commit -m "feat(export): Excel report export route + UI"
```

---

## Task 40: Sidebar Update & Full Verification

**Files:**
- Modify: `components/layout/Sidebar.tsx`

### Sidebar additions

Add a "Settings" group (visible to admin only for Prompt; visible to all for Export):

```
Settings
  ├── AI Prompt      → /dashboard/settings/prompt   (admin only)
  └── Export Data    → /dashboard/settings/export   (all users)
```

- [ ] **Step 1: Update `Sidebar.tsx`** with Settings group + correct role-gating
- [ ] **Step 2: Full manual verification**
  - Navigate to `/dashboard/settings/prompt` as admin → form loads with current config.
  - Edit system prompt → save → next pipeline run uses new prompt.
  - Click "Test prompt" → see AI response without any DB record created.
  - Navigate to `/dashboard/settings/prompt` as member → redirected (403).
  - Navigate to `/dashboard/settings/export` as any user → month selector appears.
  - Select a month and click "Export to Excel" → `.xlsx` downloads.
  - Open downloaded file in Excel/Sheets → Summary sheet and Raw Reservations sheet both have correct data.
  - JSONB custom fields appear as named columns in Raw Reservations sheet.
  - Test with a date range spanning multiple months → Summary sheet has one row per property per month.
  - Upload >50,000 rows (mock in test) → route returns 413.
- [ ] **Step 3: Run all tests**
```
npm test
```
- [ ] **Step 4: Commit**
```
git add components/layout/Sidebar.tsx
git commit -m "feat(settings): sidebar Settings group + Phase 5 complete"
```

---

## Verification Plan

### Automated Tests
- `app/api/pipeline/prompt/__tests__/route.test.ts` — GET defaults, PATCH validation, admin guard, preview mode.
- `lib/export/__tests__/buildReservationReport.test.ts` — sheet structure, JSONB expansion, empty inputs.
- `components/settings/__tests__/PromptConfigForm.test.tsx` — renders all fields, placeholder warning, save state.
- `components/settings/__tests__/ExportButton.test.tsx` — render, 413 error handling.
- Full suite: `npm test` should remain green.

### Manual Verification
1. Admin edits system prompt → saves → triggers pipeline → briefing reflects new prompt.
2. "Test prompt" — AI response appears in panel; no row in `pipeline_runs`; no briefing saved.
3. Placeholder warning fires when `{{property_table}}` is removed from template.
4. Member user cannot access `/dashboard/settings/prompt` (middleware redirect).
5. Export downloads valid `.xlsx` with two correctly populated sheets.
6. Custom JSONB fields (Channel, Guest, etc.) appear as columns in Raw Reservations sheet.
7. BYOS company export works (queries their Supabase, not app Supabase).
