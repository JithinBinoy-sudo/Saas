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
      [
        ['ABC-1', 'Villa', 4],
        ['ABC-2', 'Loft', 2],
      ]
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

  it('skips fully empty rows', () => {
    const buf = makeWorkbook(['A'], [['x'], [''], ['y']]);
    const parsed = parseExcel(buf);
    expect(parsed.rows.map((r) => r.A)).toEqual(['x', 'y']);
  });
});
