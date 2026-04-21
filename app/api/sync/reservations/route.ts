import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';

const REQUIRED_COLUMNS = [
  'confirmation_code',
  'listing_nickname',
  'check_in_date',
  'check_out_date',
  'nights',
  'net_accommodation_fare',
  'listing_id',
] as const;

const UPSERT_CHUNK_SIZE = 500;
const RATE_LIMIT_PER_DAY = 10;

export async function POST() {
  // 1. Authenticate user and resolve company_id
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const companyId: string = userRow.company_id;
  const admin = createAppAdminClient();

  // 2. Fetch company row; assert mode = 'byos'
  const { data: company } = await admin
    .from('companies')
    .select('id, mode, supabase_url, supabase_service_key')
    .eq('id', companyId)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  if (company.mode !== 'byos') {
    return NextResponse.json(
      { error: 'Sync is only available for BYOS companies' },
      { status: 400 },
    );
  }

  // 3. Rate limit: max 10 syncs per company per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: syncCount } = await admin
    .from('sync_runs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gt('started_at', oneDayAgo);

  if ((syncCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: 'Rate limit exceeded: max 10 syncs per company per day' },
      { status: 429 },
    );
  }

  // 4. Insert sync_runs row with status = 'running'
  const { data: syncRun, error: syncRunInsertError } = await admin
    .from('sync_runs')
    .insert({ company_id: companyId, status: 'running' })
    .select('id')
    .single();

  if (syncRunInsertError || !syncRun) {
    return NextResponse.json({ error: 'Failed to create sync run' }, { status: 500 });
  }

  const syncRunId: string = syncRun.id;

  const failSyncRun = async (errorMessage: string) => {
    await admin
      .from('sync_runs')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', syncRunId);
  };

  try {
    // 5. Connect to company's Supabase via getDataClient()
    const dataClient = getDataClient(company);

    // 6 & 7. SELECT * all rows from the BYOS reservations table
    const { data: byosRows, error: fetchError } = await dataClient
      .from('reservations')
      .select('*');

    if (fetchError) {
      await failSyncRun(`Failed to fetch reservations: ${fetchError.message}`);
      return NextResponse.json(
        { error: `Failed to fetch reservations from BYOS: ${fetchError.message}` },
        { status: 500 },
      );
    }

    const rows = byosRows ?? [];

    // 8. Map each row: extract required columns, merge extras into data jsonb
    type ReservationUpsertRow = {
      company_id: string;
      confirmation_code: unknown;
      listing_nickname: unknown;
      check_in_date: unknown;
      check_out_date: unknown;
      nights: unknown;
      net_accommodation_fare: unknown;
      listing_id: unknown;
      data: Record<string, unknown>;
    };

    const mappedRows: ReservationUpsertRow[] = rows.map((row: Record<string, unknown>) => {
      const required: Partial<ReservationUpsertRow> = {};
      const extra: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        if ((REQUIRED_COLUMNS as readonly string[]).includes(key)) {
          (required as Record<string, unknown>)[key] = value;
        } else if (key === 'arca_id') {
          // Legacy BYOS column name — same role as listing_id (Excel mapping uses listing_id).
          const cur = required.listing_id;
          if (cur === undefined || cur === null || String(cur).trim() === '') {
            (required as Record<string, unknown>).listing_id = value;
          }
        } else if (key === 'data') {
          // Spread existing data jsonb contents into extra — don't nest them
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(extra, value as Record<string, unknown>);
          }
        } else {
          extra[key] = value;
        }
      }

      return {
        company_id: companyId,
        confirmation_code: required.confirmation_code,
        listing_nickname: required.listing_nickname,
        check_in_date: required.check_in_date,
        check_out_date: required.check_out_date,
        nights: required.nights,
        net_accommodation_fare: required.net_accommodation_fare,
        listing_id: required.listing_id,
        data: extra,
      };
    });

    // 9. Upsert in chunks of 500
    for (let i = 0; i < mappedRows.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = mappedRows.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error: upsertError } = await admin
        .from('reservations')
        .upsert(chunk, { onConflict: 'company_id,confirmation_code' });

      if (upsertError) {
        await failSyncRun(`Upsert failed at row ${i}: ${upsertError.message}`);
        return NextResponse.json(
          { error: `Failed to upsert reservations: ${upsertError.message}` },
          { status: 500 },
        );
      }
    }

    // 10. Update sync_runs row: status = 'complete', rows_synced, completed_at
    const rowsSynced = mappedRows.length;
    await admin
      .from('sync_runs')
      .update({
        status: 'complete',
        rows_synced: rowsSynced,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRunId);

    // 11. Return success
    return NextResponse.json({ success: true, rows_synced: rowsSynced });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await failSyncRun(message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
