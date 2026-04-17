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
