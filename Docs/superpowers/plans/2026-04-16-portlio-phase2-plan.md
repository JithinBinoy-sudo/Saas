# Portlio Phase 2 — Implementation Plan
# Excel Upload & Data Ingestion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable an onboarded company to upload an Excel file of reservations from the dashboard, have each row mapped via their saved `column_mappings`, validated, and upserted into their `reservations` table — hosted (App Supabase scoped by `company_id`) or BYOS (their own Supabase) — with a visible history of prior uploads.

**Architecture:**
- Client uploads Excel via multipart FormData to `POST /api/upload/reservations`.
- Server parses Excel with `xlsx`, loads the company's saved `column_mappings`, applies them to produce reservation records with the 7 required typed fields plus a `data` jsonb payload for custom columns.
- `getDataClient()` routes the upsert to the App Supabase (hosted) or the company's own Supabase (BYOS) — identical code path per mode.
- Validation is a pure layer (`lib/upload/validateRow.ts`) producing structured `{row, field, message}` errors.
- An `upload_runs` row records every attempt (status, counts, filename) for the history page.

**Tech Stack:** Next.js 14 App Router, TypeScript, `xlsx`, Zod, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Tailwind CSS, shadcn/ui, Jest.

**Reference:** `Docs/superpowers/specs/2026-04-14-portlio-phase1-design.md` (§2, §3, §5.3 for column mapping / reservations shape), `supabase/migrations/002_hosted_reservations.sql`, `lib/schema/byos-ddl.ts`.

---

## Folder Structure (new & modified files)

```
app/
├── api/
│   └── upload/
│       └── reservations/
│           ├── route.ts                     ← POST: parse, map, validate, upsert
│           └── __tests__/route.test.ts
└── (protected)/
    └── dashboard/
        └── upload/
            ├── page.tsx                     ← Upload page (server component shell)
            └── history/
                └── page.tsx                 ← Upload history table

components/
└── upload/
    ├── UploadDropzone.tsx                   ← Client: drag-drop + submit
    ├── UploadResultSummary.tsx              ← Shows row counts + errors
    └── __tests__/
        ├── UploadDropzone.test.tsx
        └── UploadResultSummary.test.tsx

lib/
└── upload/
    ├── parseExcel.ts                        ← xlsx → { headers, rows }
    ├── applyMapping.ts                      ← raw row + mapping → ReservationRecord
    ├── validateRow.ts                       ← ReservationRecord → errors[]
    ├── types.ts                             ← shared types
    └── __tests__/
        ├── parseExcel.test.ts
        ├── applyMapping.test.ts
        └── validateRow.test.ts

supabase/
└── migrations/
    └── 004_upload_runs.sql                  ← upload_runs table + RLS

Docs/
└── superpowers/
    └── plans/
        └── 2026-04-16-portlio-phase2-plan.md  ← this file
```

Files modified (not created):
- `components/layout/Sidebar.tsx` — the "Upload" nav item already exists; add "Upload History" under Settings area (small tweak).
- `tasks.md` — check off Tasks 19–22 as they land.

---

## Design Notes (read before starting)

### Reservation record shape (produced by `applyMapping`)

```ts
type ReservationRecord = {
  // Required (7, typed)
  confirmation_code: string;
  listing_nickname: string;
  check_in_date: string;     // ISO date 'YYYY-MM-DD'
  check_out_date: string;    // ISO date 'YYYY-MM-DD'
  nights: number;            // positive integer
  net_accommodation_fare: number;
  listing_id: string;
  // Everything else (mapped custom fields) goes here. Skipped headers do NOT.
  data: Record<string, string | number | null>;
};
```

### `column_mappings.mappings` shape (written by Phase 1 column-mapping route)

```ts
{
  required: { confirmation_code: "Booking Ref", listing_nickname: "Property", ... },
  custom_fields: ["Guest Name", "Channel", ...],   // excel header names
  skipped: ["Notes"]                               // excel header names
}
```

### Date coercion rules (in `applyMapping`)

Excel dates round-trip via `xlsx` as either:
1. A JS `Date` when cellDates: true (we opt in) — convert via `toISOString().slice(0,10)`.
2. A string like `"2026-03-03"` or `"3/3/2026"` — try `new Date(str)`; on NaN, treat as invalid (validator catches it).
3. A number (Excel serial) — we pass cellDates:true, so this should not happen; if it does, treat as invalid.

### Data mode contract

The upsert path differs by mode but lives entirely behind `getDataClient(company)`:
- **Hosted:** `supabase.from('reservations').upsert(rows.map(r => ({ ...r, company_id })), { onConflict: 'company_id,confirmation_code' })` — RLS is bypassed because we use the service-role app admin client for trusted server paths (same pattern as `column-mapping/route.ts`).
- **BYOS:** `supabase.from('reservations').upsert(rows, { onConflict: 'confirmation_code' })` — the `createClient(url, key)` in `getDataClient` already uses the service role key, so no RLS concern.

A helper `upsertReservations(client, companyId, mode, records)` lives at the top of the route (no separate module — only one caller).

### File size / row cap

Hard-cap the parsed row count at **10,000** server-side. Reject with 413. This is a Phase 2 guardrail to keep the synchronous upload path tractable; Phase 5+ may move to batched async.

---

## Task 19: Excel Upload API Route

The biggest task. Split into sub-modules with TDD so each layer is independently testable.

### Task 19a: Types & `parseExcel`

**Files:**
- Create: `lib/upload/types.ts`
- Create: `lib/upload/parseExcel.ts`
- Create: `lib/upload/__tests__/parseExcel.test.ts`

- [ ] **Step 1: Write types**

Create `lib/upload/types.ts`:

```ts
export type ParsedExcel = {
  headers: string[];
  rows: Record<string, unknown>[]; // keyed by original header
};

export type ColumnMappingsBlob = {
  required: Record<string, string>; // required_field -> excel header
  custom_fields: string[];
  skipped: string[];
};

export type ReservationRecord = {
  confirmation_code: string;
  listing_nickname: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  net_accommodation_fare: number;
  listing_id: string;
  data: Record<string, string | number | null>;
};

export type RowError = {
  row: number; // 1-indexed, matches the user's spreadsheet
  field: string;
  message: string;
};

export type UploadSummary = {
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: RowError[];
};
```

- [ ] **Step 2: Write failing parseExcel tests**

Create `lib/upload/__tests__/parseExcel.test.ts`:

```ts
import * as XLSX from 'xlsx';
import { parseExcel } from '../parseExcel';

function makeWorkbook(headers: string[], rows: (string | number | Date)[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buf as ArrayBuffer;
}

describe('parseExcel', () => {
  it('extracts headers and rows keyed by header', () => {
    const buf = makeWorkbook(
      ['Booking Ref', 'Property', 'Nights'],
      [['ABC-1', 'Villa', 4], ['ABC-2', 'Loft', 2]]
    );
    const parsed = parseExcel(buf);
    expect(parsed.headers).toEqual(['Booking Ref', 'Property', 'Nights']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({ 'Booking Ref': 'ABC-1', Property: 'Villa', Nights: 4 });
  });

  it('trims header whitespace', () => {
    const buf = makeWorkbook(['  Booking Ref  ', 'Property'], [['ABC-1', 'Villa']]);
    const parsed = parseExcel(buf);
    expect(parsed.headers).toEqual(['Booking Ref', 'Property']);
    expect(parsed.rows[0]).toHaveProperty('Booking Ref', 'ABC-1');
  });

  it('returns empty when sheet is blank', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const parsed = parseExcel(buf);
    expect(parsed.headers).toEqual([]);
    expect(parsed.rows).toEqual([]);
  });

  it('preserves Date cells as JS Date objects', () => {
    const buf = makeWorkbook(['Check In'], [[new Date('2026-03-03T00:00:00Z')]]);
    const parsed = parseExcel(buf);
    expect(parsed.rows[0]['Check In']).toBeInstanceOf(Date);
  });

  it('skips fully empty trailing rows', () => {
    const buf = makeWorkbook(['A'], [['x'], [''], ['y']]);
    const parsed = parseExcel(buf);
    expect(parsed.rows.map((r) => r.A)).toEqual(['x', 'y']);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

```
npm test -- parseExcel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `parseExcel`**

Create `lib/upload/parseExcel.ts`:

```ts
import * as XLSX from 'xlsx';
import type { ParsedExcel } from './types';

export function parseExcel(buffer: ArrayBuffer | Buffer): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet || !sheet['!ref']) return { headers: [], rows: [] };

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = sheet[addr];
    const raw = cell && cell.v != null ? String(cell.v).trim() : '';
    if (raw.length > 0) headers.push(raw);
  }

  if (headers.length === 0) return { headers: [], rows: [] };

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
    blankrows: false,
  });

  // sheet_to_json keys by untrimmed header — rebuild with trimmed keys.
  const rows = records
    .map((rec) => {
      const out: Record<string, unknown> = {};
      let nonEmpty = false;
      for (const [k, v] of Object.entries(rec)) {
        const key = k.trim();
        if (key.length === 0) continue;
        out[key] = v;
        if (v !== null && v !== undefined && String(v).length > 0) nonEmpty = true;
      }
      return nonEmpty ? out : null;
    })
    .filter((r): r is Record<string, unknown> => r !== null);

  return { headers, rows };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```
npm test -- parseExcel.test.ts
```

Expected: PASS (all 5 tests).

- [ ] **Step 6: Commit**

```
git add lib/upload/types.ts lib/upload/parseExcel.ts lib/upload/__tests__/parseExcel.test.ts
git commit -m "feat(upload): parseExcel helper with tests"
```

---

### Task 19b: `applyMapping`

**Files:**
- Create: `lib/upload/applyMapping.ts`
- Create: `lib/upload/__tests__/applyMapping.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/upload/__tests__/applyMapping.test.ts`:

```ts
import { applyMapping } from '../applyMapping';
import type { ColumnMappingsBlob } from '../types';

const MAPPING: ColumnMappingsBlob = {
  required: {
    confirmation_code: 'Booking Ref',
    listing_nickname: 'Property',
    check_in_date: 'Check In',
    check_out_date: 'Check Out',
    nights: 'Nights',
    net_accommodation_fare: 'Net Fare',
    listing_id: 'Property ID',
  },
  custom_fields: ['Channel', 'Guest'],
  skipped: ['Notes'],
};

describe('applyMapping', () => {
  it('builds a ReservationRecord from a fully populated row', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': new Date('2026-03-03T00:00:00Z'),
      'Check Out': new Date('2026-03-07T00:00:00Z'),
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
      Channel: 'Airbnb',
      Guest: 'Amelia',
      Notes: 'secret',
    };
    const { record, errors } = applyMapping(row, MAPPING, 2);
    expect(errors).toEqual([]);
    expect(record).toEqual({
      confirmation_code: 'HM-1',
      listing_nickname: 'Villa',
      check_in_date: '2026-03-03',
      check_out_date: '2026-03-07',
      nights: 4,
      net_accommodation_fare: 1280,
      listing_id: 'LST-1',
      data: { Channel: 'Airbnb', Guest: 'Amelia' },
    });
  });

  it('accepts ISO date strings for date fields', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: '4',
      'Net Fare': '1280.50',
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 2);
    expect(errors).toEqual([]);
    expect(record?.check_in_date).toBe('2026-03-03');
    expect(record?.nights).toBe(4);
    expect(record?.net_accommodation_fare).toBe(1280.5);
  });

  it('reports a row error when a required field is missing', () => {
    const row = {
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 5);
    expect(record).toBeNull();
    expect(errors).toEqual([
      { row: 5, field: 'confirmation_code', message: 'Required field missing' },
    ]);
  });

  it('reports a row error when a numeric field is non-numeric', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 'four',
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 3);
    expect(record).toBeNull();
    expect(errors).toContainEqual({
      row: 3,
      field: 'nights',
      message: 'Must be a number',
    });
  });

  it('reports a row error when a date field is unparseable', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': 'not-a-date',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
    };
    const { record, errors } = applyMapping(row, MAPPING, 7);
    expect(record).toBeNull();
    expect(errors).toContainEqual({
      row: 7,
      field: 'check_in_date',
      message: 'Invalid date',
    });
  });

  it('excludes skipped headers and unmapped headers from data jsonb', () => {
    const row = {
      'Booking Ref': 'HM-1',
      Property: 'Villa',
      'Check In': '2026-03-03',
      'Check Out': '2026-03-07',
      Nights: 4,
      'Net Fare': 1280,
      'Property ID': 'LST-1',
      Channel: 'Airbnb',
      Notes: 'hidden',
      Extra: 'unexpected',
    };
    const { record } = applyMapping(row, MAPPING, 2);
    expect(record?.data).toEqual({ Channel: 'Airbnb', Guest: null });
    expect(record?.data).not.toHaveProperty('Notes');
    expect(record?.data).not.toHaveProperty('Extra');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```
npm test -- applyMapping.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `applyMapping`**

Create `lib/upload/applyMapping.ts`:

```ts
import type { ColumnMappingsBlob, ReservationRecord, RowError } from './types';

const REQUIRED_FIELDS = [
  'confirmation_code',
  'listing_nickname',
  'check_in_date',
  'check_out_date',
  'nights',
  'net_accommodation_fare',
  'listing_id',
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

const NUMERIC_FIELDS = new Set<RequiredField>(['nights', 'net_accommodation_fare']);
const DATE_FIELDS = new Set<RequiredField>(['check_in_date', 'check_out_date']);

function coerceDate(value: unknown): string | 'invalid' | 'missing' {
  if (value === null || value === undefined || value === '') return 'missing';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return 'invalid';
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (str.length === 0) return 'missing';
  const d = new Date(str);
  if (isNaN(d.getTime())) return 'invalid';
  return d.toISOString().slice(0, 10);
}

function coerceNumber(value: unknown): number | 'invalid' | 'missing' {
  if (value === null || value === undefined || value === '') return 'missing';
  if (typeof value === 'number') return Number.isFinite(value) ? value : 'invalid';
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 'invalid';
}

function coerceString(value: unknown): string | 'missing' {
  if (value === null || value === undefined) return 'missing';
  const str = String(value).trim();
  return str.length === 0 ? 'missing' : str;
}

export function applyMapping(
  row: Record<string, unknown>,
  mapping: ColumnMappingsBlob,
  rowNumber: number
): { record: ReservationRecord | null; errors: RowError[] } {
  const errors: RowError[] = [];
  const partial: Partial<ReservationRecord> = {};

  for (const field of REQUIRED_FIELDS) {
    const header = mapping.required[field];
    const raw = header ? row[header] : undefined;

    if (DATE_FIELDS.has(field)) {
      const r = coerceDate(raw);
      if (r === 'missing') {
        errors.push({ row: rowNumber, field, message: 'Required field missing' });
      } else if (r === 'invalid') {
        errors.push({ row: rowNumber, field, message: 'Invalid date' });
      } else {
        (partial as Record<string, unknown>)[field] = r;
      }
    } else if (NUMERIC_FIELDS.has(field)) {
      const r = coerceNumber(raw);
      if (r === 'missing') {
        errors.push({ row: rowNumber, field, message: 'Required field missing' });
      } else if (r === 'invalid') {
        errors.push({ row: rowNumber, field, message: 'Must be a number' });
      } else {
        (partial as Record<string, unknown>)[field] = r;
      }
    } else {
      const r = coerceString(raw);
      if (r === 'missing') {
        errors.push({ row: rowNumber, field, message: 'Required field missing' });
      } else {
        (partial as Record<string, unknown>)[field] = r;
      }
    }
  }

  if (errors.length > 0) return { record: null, errors };

  const data: Record<string, string | number | null> = {};
  for (const header of mapping.custom_fields) {
    const raw = row[header];
    if (raw === undefined || raw === null) {
      data[header] = null;
    } else if (typeof raw === 'number') {
      data[header] = Number.isFinite(raw) ? raw : null;
    } else if (raw instanceof Date) {
      data[header] = isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
    } else {
      const s = String(raw).trim();
      data[header] = s.length === 0 ? null : s;
    }
  }

  return {
    record: {
      confirmation_code: partial.confirmation_code!,
      listing_nickname: partial.listing_nickname!,
      check_in_date: partial.check_in_date!,
      check_out_date: partial.check_out_date!,
      nights: partial.nights!,
      net_accommodation_fare: partial.net_accommodation_fare!,
      listing_id: partial.listing_id!,
      data,
    },
    errors: [],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- applyMapping.test.ts
```

Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```
git add lib/upload/applyMapping.ts lib/upload/__tests__/applyMapping.test.ts
git commit -m "feat(upload): applyMapping with type coercion"
```

---

### Task 19c: `validateRow` (Task 21 logic — placed here because `upload/route.ts` will use it)

**Files:**
- Create: `lib/upload/validateRow.ts`
- Create: `lib/upload/__tests__/validateRow.test.ts`

This is "Task 21: Data Validation Layer" from tasks.md. It runs on records that already survived `applyMapping` — it checks *semantic* correctness (check-out after check-in, nights >= 1, fare >= 0, nights matches date delta within ±1).

- [ ] **Step 1: Write failing tests**

Create `lib/upload/__tests__/validateRow.test.ts`:

```ts
import { validateRow } from '../validateRow';
import type { ReservationRecord } from '../types';

const BASE: ReservationRecord = {
  confirmation_code: 'HM-1',
  listing_nickname: 'Villa',
  check_in_date: '2026-03-03',
  check_out_date: '2026-03-07',
  nights: 4,
  net_accommodation_fare: 1280,
  listing_id: 'LST-1',
  data: {},
};

describe('validateRow', () => {
  it('passes a clean record', () => {
    expect(validateRow(BASE, 2)).toEqual([]);
  });

  it('flags check_out_date <= check_in_date', () => {
    const errors = validateRow({ ...BASE, check_out_date: '2026-03-03' }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'check_out_date',
      message: 'Check-out must be after check-in',
    });
  });

  it('flags nights < 1', () => {
    const errors = validateRow({ ...BASE, nights: 0 }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'nights',
      message: 'Must be at least 1',
    });
  });

  it('flags negative fare', () => {
    const errors = validateRow({ ...BASE, net_accommodation_fare: -10 }, 5);
    expect(errors).toContainEqual({
      row: 5,
      field: 'net_accommodation_fare',
      message: 'Must be zero or positive',
    });
  });

  it('flags nights mismatching the date delta by more than 1', () => {
    // 3 nights between these dates, but nights says 10
    const errors = validateRow(
      { ...BASE, check_in_date: '2026-03-03', check_out_date: '2026-03-06', nights: 10 },
      5
    );
    expect(errors).toContainEqual({
      row: 5,
      field: 'nights',
      message: 'Does not match check-in/check-out span',
    });
  });

  it('allows nights off by 1 from date delta (partial-day tolerance)', () => {
    const errors = validateRow(
      { ...BASE, check_in_date: '2026-03-03', check_out_date: '2026-03-07', nights: 5 },
      5
    );
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```
npm test -- validateRow.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `validateRow`**

Create `lib/upload/validateRow.ts`:

```ts
import type { ReservationRecord, RowError } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateRow(record: ReservationRecord, rowNumber: number): RowError[] {
  const errors: RowError[] = [];

  const checkIn = new Date(record.check_in_date + 'T00:00:00Z');
  const checkOut = new Date(record.check_out_date + 'T00:00:00Z');

  if (checkOut.getTime() <= checkIn.getTime()) {
    errors.push({
      row: rowNumber,
      field: 'check_out_date',
      message: 'Check-out must be after check-in',
    });
  }

  if (record.nights < 1) {
    errors.push({ row: rowNumber, field: 'nights', message: 'Must be at least 1' });
  }

  if (record.net_accommodation_fare < 0) {
    errors.push({
      row: rowNumber,
      field: 'net_accommodation_fare',
      message: 'Must be zero or positive',
    });
  }

  if (checkOut.getTime() > checkIn.getTime() && record.nights >= 1) {
    const dateDelta = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
    if (Math.abs(dateDelta - record.nights) > 1) {
      errors.push({
        row: rowNumber,
        field: 'nights',
        message: 'Does not match check-in/check-out span',
      });
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- validateRow.test.ts
```

Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```
git add lib/upload/validateRow.ts lib/upload/__tests__/validateRow.test.ts
git commit -m "feat(upload): validateRow semantic checks"
```

---

### Task 19d: Upload API Route

**Files:**
- Create: `app/api/upload/reservations/route.ts`
- Create: `app/api/upload/reservations/__tests__/route.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `app/api/upload/reservations/__tests__/route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import * as XLSX from 'xlsx';

type AdminClient = {
  from: jest.Mock;
};

type ServerClient = {
  auth: { getUser: jest.Mock };
};

let adminClient: AdminClient;
let serverClient: ServerClient;
let getDataClientMock: jest.Mock;
let dataClientUpsert: jest.Mock;

jest.mock('@/lib/supabase/server', () => ({
  createAppAdminClient: jest.fn(() => adminClient),
  createAppServerClient: jest.fn(() => serverClient),
}));

jest.mock('@/lib/getDataClient', () => ({
  getDataClient: (...args: unknown[]) => getDataClientMock(...args),
}));

import { POST } from '../route';

function buildWorkbook(): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Booking Ref', 'Property', 'Check In', 'Check Out', 'Nights', 'Net Fare', 'Property ID', 'Channel'],
    ['HM-1', 'Villa', '2026-03-03', '2026-03-07', 4, 1280, 'LST-1', 'Airbnb'],
    ['HM-2', 'Loft', '2026-03-10', '2026-03-13', 3, 945.5, 'LST-2', 'VRBO'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const MAPPING = {
  required: {
    confirmation_code: 'Booking Ref',
    listing_nickname: 'Property',
    check_in_date: 'Check In',
    check_out_date: 'Check Out',
    nights: 'Nights',
    net_accommodation_fare: 'Net Fare',
    listing_id: 'Property ID',
  },
  custom_fields: ['Channel'],
  skipped: [],
};

function setupAdminForCompany(
  mode: 'hosted' | 'byos',
  opts: {
    mappingRow?: { mappings: unknown } | null;
    insertUploadRun?: { error: null | { message: string } };
  } = {}
) {
  const uploadRunInsert = jest
    .fn()
    .mockResolvedValue(opts.insertUploadRun ?? { error: null });
  const uploadRunUpdate = jest
    .fn()
    .mockResolvedValue({ error: null });

  const from = jest.fn((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { company_id: 'company-1' },
              error: null,
            }),
          })),
        })),
      };
    }
    if (table === 'companies') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                mode,
                supabase_url: null,
                supabase_service_key: null,
              },
              error: null,
            }),
          })),
        })),
      };
    }
    if (table === 'column_mappings') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: opts.mappingRow === undefined ? { mappings: MAPPING } : opts.mappingRow,
              error: null,
            }),
          })),
        })),
      };
    }
    if (table === 'upload_runs') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'upload-run-1' },
              error: (opts.insertUploadRun ?? { error: null }).error,
            }),
          })),
        })),
        update: jest.fn(() => ({ eq: uploadRunUpdate })),
      };
    }
    throw new Error(`unexpected admin table ${table}`);
  });

  return { from, uploadRunUpdate, uploadRunInsert } as AdminClient & {
    uploadRunUpdate: jest.Mock;
    uploadRunInsert: jest.Mock;
  };
}

function makeMultipartRequest(buf: ArrayBuffer, filename = 'test.xlsx'): Request {
  const form = new FormData();
  form.append('file', new Blob([buf]), filename);
  return new Request('http://localhost/api/upload/reservations', {
    method: 'POST',
    body: form,
  });
}

describe('POST /api/upload/reservations', () => {
  beforeEach(() => {
    serverClient = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null }),
      },
    };
    dataClientUpsert = jest.fn().mockResolvedValue({ error: null, count: 2 });
    getDataClientMock = jest.fn().mockReturnValue({
      from: jest.fn(() => ({ upsert: dataClientUpsert })),
    });
    adminClient = setupAdminForCompany('hosted');
  });

  it('returns 401 when unauthenticated', async () => {
    serverClient.auth.getUser = jest
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeMultipartRequest(buildWorkbook()));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is attached', async () => {
    const form = new FormData();
    const req = new Request('http://localhost/api/upload/reservations', {
      method: 'POST',
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 409 when the company has no column mapping', async () => {
    adminClient = setupAdminForCompany('hosted', { mappingRow: null });
    const res = await POST(makeMultipartRequest(buildWorkbook()));
    expect(res.status).toBe(409);
  });

  it('parses, maps, and upserts rows with company_id for hosted mode', async () => {
    const res = await POST(makeMultipartRequest(buildWorkbook()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_rows).toBe(2);
    expect(body.inserted).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);

    expect(dataClientUpsert).toHaveBeenCalledTimes(1);
    const [rows, opts] = dataClientUpsert.mock.calls[0];
    expect(rows[0]).toMatchObject({
      company_id: 'company-1',
      confirmation_code: 'HM-1',
      listing_id: 'LST-1',
      data: { Channel: 'Airbnb' },
    });
    expect(opts).toEqual({ onConflict: 'company_id,confirmation_code' });
  });

  it('uses BYOS onConflict without company_id when mode is byos', async () => {
    adminClient = setupAdminForCompany('byos');
    const res = await POST(makeMultipartRequest(buildWorkbook()));
    expect(res.status).toBe(200);
    const [rows, opts] = dataClientUpsert.mock.calls[0];
    expect(rows[0]).not.toHaveProperty('company_id');
    expect(opts).toEqual({ onConflict: 'confirmation_code' });
  });

  it('skips invalid rows, reports errors, and still inserts the valid ones', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Booking Ref', 'Property', 'Check In', 'Check Out', 'Nights', 'Net Fare', 'Property ID'],
      ['HM-1', 'Villa', '2026-03-03', '2026-03-07', 4, 1280, 'LST-1'],
      ['', 'Loft', '2026-03-10', '2026-03-13', 3, 945.5, 'LST-2'], // missing confirmation_code
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const res = await POST(makeMultipartRequest(buf));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_rows).toBe(2);
    expect(body.inserted).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.errors[0]).toMatchObject({ field: 'confirmation_code' });
    expect(dataClientUpsert).toHaveBeenCalledTimes(1);
    const [rows] = dataClientUpsert.mock.calls[0];
    expect(rows).toHaveLength(1);
  });

  it('returns 413 when the workbook exceeds the row cap', async () => {
    const header = ['Booking Ref', 'Property', 'Check In', 'Check Out', 'Nights', 'Net Fare', 'Property ID'];
    const rows: (string | number)[][] = [header];
    for (let i = 0; i < 10001; i++) {
      rows.push([`HM-${i}`, 'Villa', '2026-03-03', '2026-03-07', 4, 1280, 'LST-1']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const res = await POST(makeMultipartRequest(buf));
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```
npm test -- app/api/upload/reservations
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

Create `app/api/upload/reservations/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createAppAdminClient, createAppServerClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { parseExcel } from '@/lib/upload/parseExcel';
import { applyMapping } from '@/lib/upload/applyMapping';
import { validateRow } from '@/lib/upload/validateRow';
import type { ColumnMappingsBlob, ReservationRecord, RowError } from '@/lib/upload/types';

const MAX_ROWS = 10_000;
const MAX_ERRORS_REPORTED = 100;

type CompanyRow = {
  mode: 'hosted' | 'byos';
  supabase_url: string | null;
  supabase_service_key: string | null;
};

export async function POST(request: Request) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const filename =
    (file as Blob & { name?: string }).name && (file as { name: string }).name.length > 0
      ? (file as { name: string }).name
      : 'upload.xlsx';

  const admin = createAppAdminClient();

  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }
  const companyId = userRow.company_id as string;

  const { data: companyRow, error: companyError } = await admin
    .from('companies')
    .select('mode, supabase_url, supabase_service_key')
    .eq('id', companyId)
    .single();
  if (companyError || !companyRow) {
    return NextResponse.json({ error: 'Company record not found' }, { status: 404 });
  }
  const company = companyRow as CompanyRow;

  const { data: mappingRow } = await admin
    .from('column_mappings')
    .select('mappings')
    .eq('company_id', companyId)
    .single();
  if (!mappingRow) {
    return NextResponse.json(
      { error: 'Column mapping not found — please complete onboarding first' },
      { status: 409 }
    );
  }
  const mapping = mappingRow.mappings as ColumnMappingsBlob;

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseExcel(buffer);

  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${MAX_ROWS})` },
      { status: 413 }
    );
  }

  // Record the run up front so we have a stable id for the history page.
  const { data: runRow, error: runError } = await admin
    .from('upload_runs')
    .insert({
      company_id: companyId,
      filename,
      total_rows: parsed.rows.length,
      inserted: 0,
      failed: 0,
      status: 'running',
    })
    .select('id')
    .single();
  if (runError || !runRow) {
    return NextResponse.json({ error: 'Failed to start upload run' }, { status: 500 });
  }
  const runId = runRow.id as string;

  const validRecords: ReservationRecord[] = [];
  const errors: RowError[] = [];
  parsed.rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header row, +1 for 1-indexing
    const { record, errors: mapErrors } = applyMapping(row, mapping, rowNumber);
    if (!record) {
      errors.push(...mapErrors);
      return;
    }
    const validationErrors = validateRow(record, rowNumber);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      return;
    }
    validRecords.push(record);
  });

  let inserted = 0;
  let upsertError: string | null = null;

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
    }
  }

  const failed = parsed.rows.length - inserted;
  const status = upsertError ? 'failed' : 'complete';

  await admin
    .from('upload_runs')
    .update({
      inserted,
      failed,
      status,
      error_message: upsertError,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError, upload_run_id: runId },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      upload_run_id: runId,
      filename,
      total_rows: parsed.rows.length,
      inserted,
      failed,
      errors: errors.slice(0, MAX_ERRORS_REPORTED),
    },
    { status: 200 }
  );
}
```

- [ ] **Step 4: Provisionally add the migration for `upload_runs`**

Route tests reference the `upload_runs` table — we need the migration in place so the route can even be type-checked against our mental model. See Task 22 Step 1 below for the full SQL; for the route-test phase it is enough that the route compiles.

Create a placeholder migration `supabase/migrations/004_upload_runs.sql` now (contents defined in Task 22 Step 1). Tests mock the table, so no real DB interaction happens here.

- [ ] **Step 5: Run tests to verify they pass**

```
npm test -- app/api/upload/reservations
```

Expected: PASS (all 7 tests).

- [ ] **Step 6: Commit**

```
git add app/api/upload/reservations supabase/migrations/004_upload_runs.sql
git commit -m "feat(upload): reservations upload API with hosted/BYOS routing"
```

---

## Task 20: Upload Page UI

**Files:**
- Create: `components/upload/UploadDropzone.tsx`
- Create: `components/upload/UploadResultSummary.tsx`
- Create: `components/upload/__tests__/UploadDropzone.test.tsx`
- Create: `components/upload/__tests__/UploadResultSummary.test.tsx`
- Create: `app/(protected)/dashboard/upload/page.tsx`

### Task 20a: `UploadResultSummary`

- [ ] **Step 1: Write failing test**

Create `components/upload/__tests__/UploadResultSummary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { UploadResultSummary } from '../UploadResultSummary';

describe('UploadResultSummary', () => {
  it('renders success state', () => {
    render(
      <UploadResultSummary
        result={{
          filename: 'q1.xlsx',
          total_rows: 10,
          inserted: 10,
          failed: 0,
          errors: [],
        }}
      />
    );
    expect(screen.getByText(/10 of 10 rows uploaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Errors/i)).not.toBeInTheDocument();
  });

  it('renders partial failure with up to 10 errors listed', () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      row: i + 2,
      field: 'nights',
      message: 'Must be at least 1',
    }));
    render(
      <UploadResultSummary
        result={{
          filename: 'q1.xlsx',
          total_rows: 15,
          inserted: 0,
          failed: 15,
          errors,
        }}
      />
    );
    expect(screen.getByText(/0 of 15 rows uploaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Row 2/)).toBeInTheDocument();
    expect(screen.getByText(/\+ 5 more errors/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```
npm test -- UploadResultSummary
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `UploadResultSummary`**

Create `components/upload/UploadResultSummary.tsx`:

```tsx
type RowError = { row: number; field: string; message: string };

export type UploadResult = {
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  errors: RowError[];
};

type Props = { result: UploadResult };

const VISIBLE = 10;

export function UploadResultSummary({ result }: Props) {
  const allSucceeded = result.failed === 0 && result.inserted === result.total_rows;
  const visibleErrors = result.errors.slice(0, VISIBLE);
  const extra = Math.max(0, result.errors.length - VISIBLE);

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${
        allSucceeded
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <p className="font-medium text-slate-900">
        {result.inserted} of {result.total_rows} rows uploaded
        <span className="text-slate-500"> — {result.filename}</span>
      </p>
      {result.errors.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-medium text-slate-900">Errors:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
            {visibleErrors.map((e, i) => (
              <li key={i}>
                Row {e.row} — <span className="font-mono text-xs">{e.field}</span>: {e.message}
              </li>
            ))}
          </ul>
          {extra > 0 && (
            <p className="mt-1 text-xs text-slate-500">+ {extra} more errors</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test**

```
npm test -- UploadResultSummary
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add components/upload/UploadResultSummary.tsx components/upload/__tests__/UploadResultSummary.test.tsx
git commit -m "feat(upload): UploadResultSummary component"
```

---

### Task 20b: `UploadDropzone`

- [ ] **Step 1: Write failing test**

Create `components/upload/__tests__/UploadDropzone.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UploadDropzone } from '../UploadDropzone';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

function mockFetchSuccess() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      filename: 'test.xlsx',
      total_rows: 3,
      inserted: 3,
      failed: 0,
      errors: [],
    }),
  });
}

describe('UploadDropzone', () => {
  it('shows the default state', () => {
    render(<UploadDropzone />);
    expect(screen.getByText(/Drop your Excel file here/i)).toBeInTheDocument();
  });

  it('uploads via fetch when a file is selected and shows the result summary', async () => {
    mockFetchSuccess();
    render(<UploadDropzone />);
    const input = screen.getByTestId('upload-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload/reservations',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await screen.findByText(/3 of 3 rows uploaded/i)).toBeInTheDocument();
  });

  it('shows an error when the server returns non-ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'boom' }),
    });
    render(<UploadDropzone />);
    const input = screen.getByTestId('upload-file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([1])], 'bad.xlsx');
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/Upload failed: boom/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```
npm test -- UploadDropzone
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `UploadDropzone`**

Create `components/upload/UploadDropzone.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { UploadResultSummary, type UploadResult } from './UploadResultSummary';
import { cn } from '@/lib/utils';

type State =
  | { kind: 'idle' }
  | { kind: 'uploading'; filename: string }
  | { kind: 'success'; result: UploadResult }
  | { kind: 'error'; message: string };

export function UploadDropzone() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setState({ kind: 'uploading', filename: file.name });
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/upload/reservations', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ kind: 'error', message: body.error ?? `HTTP ${res.status}` });
        return;
      }
      const result = (await res.json()) as UploadResult;
      setState({ kind: 'success', result });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white'
        )}
      >
        <p className="text-sm font-medium text-slate-700">Drop your Excel file here</p>
        <p className="text-xs text-slate-500">or</p>
        <label className="mt-2 cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Browse files
          <input
            data-testid="upload-file-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">.xlsx or .xls — up to 10,000 rows</p>
      </div>

      {state.kind === 'uploading' && (
        <p className="text-sm text-slate-600">Uploading {state.filename}…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          Upload failed: {state.message}
        </p>
      )}
      {state.kind === 'success' && <UploadResultSummary result={state.result} />}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```
npm test -- UploadDropzone
```

Expected: PASS (3 tests).

- [ ] **Step 5: Create the upload page**

Create `app/(protected)/dashboard/upload/page.tsx`:

```tsx
import { UploadDropzone } from '@/components/upload/UploadDropzone';

export const metadata = { title: 'Portlio — Upload Reservations' };

export default function UploadPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Upload reservations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Drop a reservation Excel export. We&apos;ll map columns using your saved onboarding
          mapping, validate each row, and insert or update your data.
        </p>
      </header>
      <UploadDropzone />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```
git add components/upload app/(protected)/dashboard/upload/page.tsx
git commit -m "feat(upload): dashboard upload page with dropzone UI"
```

---

## Task 21: Data Validation Layer

Already implemented as Task 19c (`lib/upload/validateRow.ts`). No additional code needed. Check it off in `tasks.md` at this point.

- [ ] **Step 1: Mark Task 21 done in `tasks.md`**

```
- [x] Task 21: Data Validation Layer (Row-level validation checks)
```

- [ ] **Step 2: Commit the checklist update alongside Task 22 below (no separate commit).**

---

## Task 22: Upload History

### Task 22a: Migration

**Files:**
- Create: `supabase/migrations/004_upload_runs.sql` (if not already present from Task 19d)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/004_upload_runs.sql`:

```sql
-- Phase 2 — upload_runs
-- Records every reservation-upload attempt per company. Status transitions:
-- running → complete | failed. Errors aren't stored per-row here — the API
-- response surfaces the per-row errors while errors_message captures any
-- global failure (e.g. upsert rejection).

CREATE TABLE IF NOT EXISTS upload_runs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filename       text        NOT NULL,
  total_rows     integer     NOT NULL DEFAULT 0,
  inserted       integer     NOT NULL DEFAULT 0,
  failed         integer     NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'complete', 'failed')),
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS upload_runs_company_started_idx
  ON upload_runs(company_id, started_at DESC);

ALTER TABLE upload_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upload_runs_company_isolation" ON upload_runs
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
```

(If this file was already created during Task 19d, overwrite with the contents above.)

---

### Task 22b: History Page

**Files:**
- Create: `app/(protected)/dashboard/upload/history/page.tsx`
- Modify: `components/layout/Sidebar.tsx` — add "Upload History" under the existing "Upload" item.

- [ ] **Step 1: Write the history page (server component, no new tests — static rendering of supabase data)**

Create `app/(protected)/dashboard/upload/history/page.tsx`:

```tsx
import { createAppServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'Portlio — Upload History' };

type Run = {
  id: string;
  filename: string;
  total_rows: number;
  inserted: number;
  failed: number;
  status: 'running' | 'complete' | 'failed';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default async function UploadHistoryPage() {
  const supabase = createAppServerClient();
  const { data: runs } = await supabase
    .from('upload_runs')
    .select(
      'id, filename, total_rows, inserted, failed, status, error_message, started_at, completed_at'
    )
    .order('started_at', { ascending: false })
    .limit(50);

  const rows = (runs ?? []) as Run[];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Upload history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Last 50 upload attempts for your company.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No uploads yet. Head to{' '}
          <a className="text-blue-600 hover:underline" href="/dashboard/upload">
            Upload
          </a>{' '}
          to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Inserted</th>
                <th className="px-3 py-2 font-medium">Failed</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{formatDate(r.started_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.filename}</td>
                  <td className="px-3 py-2 text-slate-700">{r.total_rows}</td>
                  <td className="px-3 py-2 text-emerald-700">{r.inserted}</td>
                  <td className="px-3 py-2 text-amber-700">{r.failed}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === 'complete'
                          ? 'inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                          : r.status === 'failed'
                            ? 'inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                            : 'inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700'
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add sidebar link**

Edit `components/layout/Sidebar.tsx` — add a new NAV_ITEM entry right after `Upload`:

```ts
{ href: '/dashboard/upload/history', label: 'Upload History' },
```

- [ ] **Step 3: Update `tasks.md`**

Check off all four Phase 2 items:

```
- [x] Task 19: Excel Upload API Route (Parse Excel, map columns, upsert to reservations)
- [x] Task 20: Upload Page UI (Drag-and-drop, UI preview, progress feedback)
- [x] Task 21: Data Validation Layer (Row-level validation checks)
- [x] Task 22: Upload History (Optional: upload_runs table and history page)
```

- [ ] **Step 4: Final verification**

```
npm run typecheck
npm test
npm run build
```

Expected: typecheck clean, all tests pass (including all new suites), production build succeeds.

- [ ] **Step 5: Commit**

```
git add app/(protected)/dashboard/upload/history components/layout/Sidebar.tsx supabase/migrations/004_upload_runs.sql tasks.md
git commit -m "feat(upload): upload_runs table, history page, sidebar link"
```

---

## Self-Review Checklist (performed by author)

- **Spec coverage:** Each of Tasks 19–22 from `tasks.md` is covered by one or more sub-tasks above.
- **Types:** `ReservationRecord`, `ColumnMappingsBlob`, `RowError`, `UploadResult` are defined once in `lib/upload/types.ts` and reused consistently.
- **Mode routing:** Hosted vs BYOS diverge only in the single `payload`/`onConflict` branch in the route — `getDataClient` abstracts everything else.
- **No placeholders / TBDs.** Every code block is complete.
- **Commits:** Five commits across the plan (parseExcel, applyMapping, validateRow, route+migration, UI, history+sidebar), one per logical unit.
