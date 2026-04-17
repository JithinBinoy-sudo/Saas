import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { buildReservationReport } from '@/lib/export/buildReservationReport';
import type { SummaryRow, RawReservationRow } from '@/lib/export/types';

const ROW_CAP = 50_000;

const monthSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });
const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  // 1. Auth
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const admin = createAppAdminClient();
  const { data: company } = await admin
    .from('companies')
    .select('id, name, mode, supabase_url, supabase_service_key')
    .eq('id', userRow.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // 2. Parse query params
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  let summaryFilter: { type: 'month'; month: string } | { type: 'range'; from: string; to: string };
  let filename: string;

  const monthParsed = monthSchema.safeParse(params);
  const rangeParsed = rangeSchema.safeParse(params);

  if (monthParsed.success) {
    summaryFilter = { type: 'month', month: `${monthParsed.data.month}-01` };
    filename = `portlio-export-${monthParsed.data.month}.xlsx`;
  } else if (rangeParsed.success) {
    summaryFilter = { type: 'range', from: rangeParsed.data.from, to: rangeParsed.data.to };
    filename = `portlio-export-${rangeParsed.data.from}-to-${rangeParsed.data.to}.xlsx`;
  } else {
    // Default to most recent month — we'll resolve after fetching
    summaryFilter = { type: 'month', month: '' };
    filename = 'portlio-export.xlsx';
  }

  // 3. Get data client
  const dataClient = getDataClient({
    mode: company.mode,
    supabase_url: company.supabase_url,
    supabase_service_key: company.supabase_service_key,
  });

  const companyId = company.mode === 'hosted' ? company.id : undefined;

  // If default month, find the most recent one
  if (summaryFilter.type === 'month' && summaryFilter.month === '') {
    let q = dataClient
      .from('monthly_portfolio_summary')
      .select('revenue_month')
      .order('revenue_month', { ascending: false })
      .limit(1);
    if (companyId) q = q.eq('company_id', companyId);
    const { data: latest } = await q.single();
    if (!latest) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }
    summaryFilter = { type: 'month', month: latest.revenue_month };
    filename = `portlio-export-${latest.revenue_month.slice(0, 7)}.xlsx`;
  }

  // 4. Query Summary (final_reporting_gold)
  let summaryQuery = dataClient
    .from('final_reporting_gold')
    .select('revenue_month, listing_nickname, revenue, occupied_nights, adr, revenue_delta, portfolio_median_revenue');
  if (companyId) summaryQuery = summaryQuery.eq('company_id', companyId);

  if (summaryFilter.type === 'month') {
    summaryQuery = summaryQuery.eq('revenue_month', summaryFilter.month);
  } else {
    summaryQuery = summaryQuery.gte('revenue_month', summaryFilter.from).lte('revenue_month', summaryFilter.to);
  }
  summaryQuery = summaryQuery.order('revenue_month', { ascending: true });

  const { data: summaryData } = await summaryQuery;
  const summary: SummaryRow[] = (summaryData ?? []).map((r: Record<string, unknown>) => ({
    revenue_month: r.revenue_month as string,
    listing_nickname: r.listing_nickname as string,
    revenue: r.revenue as number,
    occupied_nights: r.occupied_nights as number,
    adr: r.adr as number,
    revenue_delta: (r.revenue_delta as number) ?? null,
    portfolio_median_revenue: (r.portfolio_median_revenue as number) ?? null,
  }));

  // 5. Query Raw Reservations
  let resQuery = dataClient
    .from('reservations')
    .select('confirmation_code, listing_nickname, check_in_date, check_out_date, nights, net_accommodation_fare, listing_id, data');
  if (companyId) resQuery = resQuery.eq('company_id', companyId);

  if (summaryFilter.type === 'month') {
    // Filter by month — check_in_date in that month
    const monthStart = summaryFilter.month;
    const [y, m] = monthStart.split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    resQuery = resQuery.gte('check_in_date', monthStart).lt('check_in_date', nextMonth);
  } else {
    resQuery = resQuery.gte('check_in_date', summaryFilter.from).lte('check_in_date', summaryFilter.to);
  }

  const { data: resData } = await resQuery;
  const reservations: RawReservationRow[] = (resData ?? []).map((r: Record<string, unknown>) => ({
    confirmation_code: r.confirmation_code as string,
    listing_nickname: r.listing_nickname as string,
    check_in_date: r.check_in_date as string,
    check_out_date: r.check_out_date as string,
    nights: r.nights as number,
    net_accommodation_fare: r.net_accommodation_fare as number,
    listing_id: r.listing_id as string,
    data: (r.data as Record<string, string | number | null>) ?? {},
  }));

  // 6. Check row cap
  if (reservations.length > ROW_CAP) {
    return NextResponse.json(
      { error: `Export exceeds ${ROW_CAP.toLocaleString()} rows. Use a narrower date range.` },
      { status: 413 },
    );
  }

  // 7. Build report
  const buffer = buildReservationReport({
    summary,
    reservations,
    generatedAt: new Date(),
    companyName: company.name,
  });

  // 8. Return file
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
