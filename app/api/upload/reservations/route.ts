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
    const rowNumber = i + 2;
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
