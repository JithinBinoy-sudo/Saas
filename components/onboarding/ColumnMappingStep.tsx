'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'hosted' | 'byos';

type Props = {
  mode: Mode;
  onComplete: () => void;
};

const REQUIRED_FIELDS = [
  { key: 'confirmation_code', label: 'Confirmation Code' },
  { key: 'listing_nickname', label: 'Listing Nickname' },
  { key: 'check_in_date', label: 'Check-In Date' },
  { key: 'check_out_date', label: 'Check-Out Date' },
  { key: 'nights', label: 'Nights' },
  { key: 'net_accommodation_fare', label: 'Net Accommodation Fare' },
  { key: 'listing_id', label: 'Listing ID' },
] as const;

type RequiredKey = (typeof REQUIRED_FIELDS)[number]['key'];

type Assignment =
  | { kind: 'required'; field: RequiredKey }
  | { kind: 'custom' }
  | { kind: 'skip' };

const PREVIEW_HEADERS = [
  'Confirmation Code',
  'Listing Nickname',
  'Check-In Date',
  'Check-Out Date',
  'Nights',
  'Net Accommodation Fare',
  'Listing ID',
];

const PREVIEW_ROWS = [
  ['HM-10021', 'Sunset Loft', '2026-03-03', '2026-03-07', '4', '1280.00', 'LST-001'],
  ['HM-10022', 'Harbor View', '2026-03-10', '2026-03-13', '3', '945.50', 'LST-002'],
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const FUZZY_HINTS: Record<RequiredKey, string[]> = {
  confirmation_code: ['confirmation', 'bookingref', 'reservationid', 'resid', 'code'],
  listing_nickname: ['nickname', 'property', 'propertyname', 'listingname'],
  check_in_date: ['checkin', 'arrival', 'startdate', 'from'],
  check_out_date: ['checkout', 'departure', 'enddate', 'to'],
  nights: ['nights', 'numnights', 'losnights', 'los'],
  net_accommodation_fare: ['netaccommodationfare', 'revenue', 'netrevenue', 'payout', 'fare'],
  listing_id: ['listingid', 'propertyid', 'unitid'],
};

function guessField(header: string): RequiredKey | null {
  const n = normalize(header);
  let bestField: RequiredKey | null = null;
  let bestScore = 0;
  for (const [field, hints] of Object.entries(FUZZY_HINTS) as Array<[RequiredKey, string[]]>) {
    for (const hint of hints) {
      const hn = normalize(hint);
      if (!hn) continue;
      if (n === hn) return field;
      if (n.includes(hn) || hn.includes(n)) {
        const score = Math.min(n.length, hn.length);
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }
  }
  return bestField;
}

function initialAssignments(headers: string[]): Record<string, Assignment> {
  const taken = new Set<RequiredKey>();
  const result: Record<string, Assignment> = {};
  for (const header of headers) {
    const guess = guessField(header);
    if (guess && !taken.has(guess)) {
      taken.add(guess);
      result[header] = { kind: 'required', field: guess };
    } else {
      result[header] = { kind: 'custom' };
    }
  }
  return result;
}

function extractHeaders(workbook: XLSX.WorkBook): string[] {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = sheet[addr];
    if (cell && cell.v != null) {
      headers.push(String(cell.v).trim());
    }
  }
  return headers.filter((h) => h.length > 0);
}

function assignmentValue(a: Assignment | undefined): string {
  if (!a) return 'custom';
  if (a.kind === 'required') return `req:${a.field}`;
  if (a.kind === 'skip') return 'skip';
  return 'custom';
}

function parseAssignmentValue(value: string): Assignment {
  if (value.startsWith('req:')) {
    return { kind: 'required', field: value.slice(4) as RequiredKey };
  }
  if (value === 'skip') return { kind: 'skip' };
  return { kind: 'custom' };
}

export function ColumnMappingStep({ mode: _mode, onComplete }: Props) {
  void _mode;
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const takenFields = useMemo(() => {
    const map = new Map<RequiredKey, string>();
    for (const [header, a] of Object.entries(assignments)) {
      if (a.kind === 'required') {
        map.set(a.field, header);
      }
    }
    return map;
  }, [assignments]);

  const missingRequired = useMemo(() => {
    return REQUIRED_FIELDS.filter((f) => !takenFields.has(f.key));
  }, [takenFields]);

  async function handleFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const detected = extractHeaders(workbook);
    setHeaders(detected);
    setAssignments(initialAssignments(detected));
    setShowErrors(false);
  }

  function handleSelect(header: string, value: string) {
    const next: Record<string, Assignment> = { ...assignments };
    const parsed = parseAssignmentValue(value);

    if (parsed.kind === 'required') {
      // Release any other header that was holding the same required field.
      for (const [h, a] of Object.entries(next)) {
        if (h !== header && a.kind === 'required' && a.field === parsed.field) {
          next[h] = { kind: 'custom' };
        }
      }
    }

    next[header] = parsed;
    setAssignments(next);
  }

  async function handleSubmit() {
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    if (!headers) return;

    const requiredMap: Record<string, string> = {};
    for (const [header, a] of Object.entries(assignments)) {
      if (a.kind === 'required') {
        requiredMap[a.field] = header;
      }
    }
    const customFields = Object.entries(assignments)
      .filter(([, a]) => a.kind === 'custom')
      .map(([h]) => h);
    const skipped = Object.entries(assignments)
      .filter(([, a]) => a.kind === 'skip')
      .map(([h]) => h);

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/onboarding/column-mapping', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mappings: requiredMap,
          custom_fields: customFields,
          skipped,
          sample_headers: headers,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body.error ?? 'Failed to save mapping');
        return;
      }
      onComplete();
    } finally {
      setSubmitting(false);
    }
  }

  const continueDisabled = !headers || missingRequired.length > 0 || submitting;

  return (
    <div className="flex flex-col gap-6">
      {!headers && (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Sample preview</h3>
            <a
              href="/api/onboarding/sample-excel"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Download Sample Excel
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Column names in your file don&apos;t need to match — you&apos;ll map them in the next
            step.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {PREVIEW_HEADERS.map((h) => (
                    <th key={h} className="px-2 py-1 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Upload your Excel file</h3>
        <input
          data-testid="xlsx-file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="block text-sm"
        />
      </section>

      {headers && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Map your columns</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Excel column</th>
                  <th className="px-3 py-2 text-left font-medium">Map to</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header) => {
                  const a = assignments[header];
                  return (
                    <tr
                      key={header}
                      data-testid={`mapping-row-${header}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-800">{header}</td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          value={assignmentValue(a)}
                          onChange={(e) => handleSelect(header, e.target.value)}
                        >
                          <optgroup label="Required fields">
                            {REQUIRED_FIELDS.map((f) => {
                              const taken = takenFields.get(f.key);
                              const isMine = a?.kind === 'required' && a.field === f.key;
                              if (taken && !isMine) return null;
                              return (
                                <option key={f.key} value={`req:${f.key}`}>
                                  ✓ {f.label} (Required)
                                </option>
                              );
                            })}
                          </optgroup>
                          <optgroup label="Other">
                            <option value="custom">Include as custom field</option>
                            <option value="skip">Skip this column</option>
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showErrors && missingRequired.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">
                Missing required fields — map every column below before continuing:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
                {missingRequired.map((f) => (
                  <li key={f.key}>{f.label} — unmapped</li>
                ))}
              </ul>
            </div>
          )}

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowErrors(true)}
              disabled={missingRequired.length === 0}
            >
              Show missing fields
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={continueDisabled}
              className={cn(continueDisabled && 'opacity-50')}
            >
              {submitting ? 'Saving…' : 'Continue'}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
