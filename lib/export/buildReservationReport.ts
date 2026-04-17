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
