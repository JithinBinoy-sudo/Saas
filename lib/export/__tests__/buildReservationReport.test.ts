/**
 * @jest-environment node
 */

import * as XLSX from 'xlsx';
import { buildReservationReport } from '../buildReservationReport';
import type { ReportInput, SummaryRow, RawReservationRow } from '../types';

function parseWorkbook(buffer: Buffer) {
  return XLSX.read(buffer, { type: 'buffer' });
}

function sheetToJson(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet);
}

function sheetHeaders(wb: XLSX.WorkBook, name: string): string[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell?.v ?? '');
  }
  return headers;
}

const baseSummary: SummaryRow = {
  revenue_month: '2026-03-01',
  listing_nickname: 'Beach House',
  revenue: 5000,
  occupied_nights: 20,
  adr: 250,
  revenue_delta: 0.15,
  portfolio_median_revenue: 4000,
};

const baseReservation: RawReservationRow = {
  confirmation_code: 'ABC123',
  listing_nickname: 'Beach House',
  check_in_date: '2026-03-01',
  check_out_date: '2026-03-05',
  nights: 4,
  net_accommodation_fare: 1000,
  listing_id: 'lst-1',
  data: { Channel: 'Airbnb', Guest: 'John' },
};

describe('buildReservationReport', () => {
  it('produces a workbook with Summary and Raw Reservations sheets', () => {
    const input: ReportInput = {
      summary: [baseSummary],
      reservations: [baseReservation],
      generatedAt: new Date('2026-04-17'),
      companyName: 'Test Co',
    };

    const buffer = buildReservationReport(input);
    const wb = parseWorkbook(buffer);

    expect(wb.SheetNames).toEqual(['Summary', 'Raw Reservations']);
  });

  it('Summary sheet has correct row values', () => {
    const input: ReportInput = {
      summary: [baseSummary],
      reservations: [baseReservation],
      generatedAt: new Date('2026-04-17'),
      companyName: 'Test Co',
    };

    const buffer = buildReservationReport(input);
    const wb = parseWorkbook(buffer);
    const rows = sheetToJson(wb, 'Summary');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Month: '2026-03-01',
      Property: 'Beach House',
      Revenue: 5000,
      Nights: 20,
      ADR: 250,
      'vs Prev Month Revenue': 0.15,
      'vs Portfolio Median': 1000,
    });
  });

  it('Raw Reservations sheet expands JSONB keys as columns', () => {
    const input: ReportInput = {
      summary: [],
      reservations: [baseReservation],
      generatedAt: new Date('2026-04-17'),
      companyName: 'Test Co',
    };

    const buffer = buildReservationReport(input);
    const wb = parseWorkbook(buffer);
    const headers = sheetHeaders(wb, 'Raw Reservations');

    expect(headers).toContain('Channel');
    expect(headers).toContain('Guest');
    expect(headers).toContain('Confirmation Code');

    const rows = sheetToJson(wb, 'Raw Reservations');
    expect(rows[0]).toMatchObject({
      'Confirmation Code': 'ABC123',
      Channel: 'Airbnb',
      Guest: 'John',
    });
  });

  it('fills empty string for missing JSONB keys across rows', () => {
    const res1: RawReservationRow = {
      ...baseReservation,
      data: { Channel: 'Airbnb' },
    };
    const res2: RawReservationRow = {
      ...baseReservation,
      confirmation_code: 'DEF456',
      data: { Guest: 'Jane' },
    };

    const input: ReportInput = {
      summary: [],
      reservations: [res1, res2],
      generatedAt: new Date('2026-04-17'),
      companyName: 'Test Co',
    };

    const buffer = buildReservationReport(input);
    const wb = parseWorkbook(buffer);
    const rows = sheetToJson(wb, 'Raw Reservations');

    // Row 1 has Channel but not Guest
    expect(rows[0]).toMatchObject({ Channel: 'Airbnb' });
    // Guest should be empty string (xlsx reads as empty or missing)
    expect(rows[0]).not.toHaveProperty('Guest', undefined);

    // Row 2 has Guest but not Channel
    expect(rows[1]).toMatchObject({ Guest: 'Jane' });
  });

  it('produces sheets with only headers when inputs are empty', () => {
    const input: ReportInput = {
      summary: [],
      reservations: [],
      generatedAt: new Date('2026-04-17'),
      companyName: 'Test Co',
    };

    const buffer = buildReservationReport(input);
    const wb = parseWorkbook(buffer);

    expect(wb.SheetNames).toEqual(['Summary', 'Raw Reservations']);
    // Sheets exist but have no data rows
    const summaryRows = sheetToJson(wb, 'Summary');
    const rawRows = sheetToJson(wb, 'Raw Reservations');
    expect(summaryRows).toHaveLength(0);
    expect(rawRows).toHaveLength(0);
  });
});
