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

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  } = {}
): AdminClient {
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
              data: { mode, supabase_url: null, supabase_service_key: null },
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
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      };
    }
    if (table === 'reservations') {
      // BYOS dual-write to app DB
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    throw new Error(`unexpected admin table ${table}`);
  });

  return { from };
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
    dataClientUpsert = jest.fn().mockResolvedValue({ error: null });
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
      ['', 'Loft', '2026-03-10', '2026-03-13', 3, 945.5, 'LST-2'],
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
    const header = [
      'Booking Ref',
      'Property',
      'Check In',
      'Check Out',
      'Nights',
      'Net Fare',
      'Property ID',
    ];
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
  }, 30000);
});
