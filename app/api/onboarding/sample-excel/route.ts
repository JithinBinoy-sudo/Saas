import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-static';

const HEADERS = [
  'Confirmation Code',
  'Listing Nickname',
  'Check-In Date',
  'Check-Out Date',
  'Nights',
  'Net Accommodation Fare',
  'Listing ID',
  'Source',
  'Channel',
  'Guest Name',
  'Commission',
  'Cleaning Fee',
  'Currency',
];

const SAMPLE_ROWS: Array<Array<string | number>> = [
  [
    'HM-10021',
    'Sunset Loft (Downtown)',
    '2026-03-03',
    '2026-03-07',
    4,
    1280.0,
    'LST-001',
    'Airbnb',
    'Airbnb',
    'Amelia Carter',
    153.6,
    120.0,
    'USD',
  ],
  [
    'HM-10022',
    'Harbor View Cottage',
    '2026-03-10',
    '2026-03-13',
    3,
    945.5,
    'LST-002',
    'VRBO',
    'VRBO',
    'David Wong',
    94.55,
    90.0,
    'USD',
  ],
  [
    'HM-10023',
    'Maple Ridge Cabin',
    '2026-03-14',
    '2026-03-20',
    6,
    2100.0,
    'LST-003',
    'Direct',
    'Direct',
    'Priya Shah',
    0,
    150.0,
    'USD',
  ],
];

const README_TEXT =
  "The 7 required columns above must exist in your upload (any header name is fine — you'll map them in the next step). Any additional columns you include will be preserved as custom fields unless you choose to skip them.";

export async function GET() {
  const reservations = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS]);
  const readme = XLSX.utils.aoa_to_sheet([['Readme'], [README_TEXT]]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reservations, 'Reservations');
  XLSX.utils.book_append_sheet(workbook, readme, 'Readme');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="portlio-sample-upload.xlsx"',
      'Content-Length': String(body.byteLength),
    },
  });
}
