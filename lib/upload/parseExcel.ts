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
