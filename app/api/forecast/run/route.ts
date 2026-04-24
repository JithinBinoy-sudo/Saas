import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL || '';

type Body = {
  as_of_month?: string; // 'YYYY-MM-DD'
};

export async function POST(req: Request) {
  // 1. Auth
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2. Get user row
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  if (!FORECAST_SERVICE_URL) {
    return NextResponse.json(
      { error: 'Forecast service URL not configured' },
      { status: 503 }
    );
  }

  const admin = createAppAdminClient();

  // 3. Fetch historical monthly data from monthly_metrics_silver
  const { data: metricsData, error: metricsError } = await admin
    .from('monthly_metrics_silver')
    .select('listing_id, revenue_month, revenue')
    .eq('company_id', userRow.company_id)
    .order('revenue_month', { ascending: true });

  if (metricsError || !metricsData || metricsData.length === 0) {
    return NextResponse.json(
      { error: 'No historical data available for forecasting' },
      { status: 404 }
    );
  }

  // 4. Portfolio-level forecast: aggregate revenue by month and train as-of a target month
  const PORTFOLIO_LISTING_ID = '__PORTFOLIO__';
  const TRAINING_MIN_MONTHS = 6;

  let body: Body | null = null;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = null;
  }

  const byMonth = new Map<string, number>();
  for (const row of metricsData as Array<Record<string, unknown>>) {
    const ds = String(row.revenue_month ?? '');
    if (!ds) continue;
    const y = Number(row.revenue ?? 0);
    byMonth.set(ds, (byMonth.get(ds) ?? 0) + y);
  }

  const portfolioSeries = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ds, y]) => ({ ds, y, listing_id: PORTFOLIO_LISTING_ID }));

  const latestMonth = portfolioSeries.length > 0 ? portfolioSeries[portfolioSeries.length - 1].ds : '';
  const asOfMonth = String(body?.as_of_month ?? latestMonth);

  const eligible = portfolioSeries.filter((p) => p.ds <= asOfMonth);
  if (eligible.length < TRAINING_MIN_MONTHS) {
    return NextResponse.json(
      {
        error: `Not enough history to forecast as-of ${asOfMonth}. Need at least ${TRAINING_MIN_MONTHS} months.`,
        as_of_month: asOfMonth,
        months_available: eligible.length,
      },
      { status: 400 }
    );
  }

  // Use all available history up to asOfMonth (minimum 6 enforced above)
  const forecastData = eligible;

  // 5. Cache + dedupe: if forecasts exist (or a run is in progress), don't recompute
  const { data: existing } = await admin
    .from('revenue_forecasts')
    .select('forecast_month')
    .eq('company_id', userRow.company_id)
    .eq('listing_id', PORTFOLIO_LISTING_ID)
    .eq('as_of_month', asOfMonth)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { status: 'cached', as_of_month: asOfMonth, months_used: forecastData.length },
      { status: 200 }
    );
  }

  // Try to acquire a per-(company, as_of_month) lock row
  const { error: lockErr } = await admin.from('forecast_runs').insert({
    company_id: userRow.company_id,
    as_of_month: asOfMonth,
    status: 'running',
    started_at: new Date().toISOString(),
  });

  if (lockErr) {
    // Someone else likely started it already
    return NextResponse.json(
      { status: 'running', as_of_month: asOfMonth },
      { status: 202 }
    );
  }

  // 6. Fire-and-forget POST to Railway service
  try {
    const response = await fetch(`${FORECAST_SERVICE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: userRow.company_id,
        data: forecastData,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.detail ?? `Forecast service error (${response.status})` },
        { status: response.status }
      );
    }

    const result = await response.json();

    await admin
      .from('forecast_runs')
      .update({
        status: 'complete',
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq('company_id', userRow.company_id)
      .eq('as_of_month', asOfMonth);

    return NextResponse.json({
      status: 'complete',
      as_of_month: asOfMonth,
      months_used: forecastData.length,
      forecast_months: forecastData.length > 0 ? forecastData.map((p) => p.ds) : [],
      forecasts: result.forecasts?.length ?? 0,
      warnings: result.warnings ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    await admin
      .from('forecast_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: message,
      })
      .eq('company_id', userRow.company_id)
      .eq('as_of_month', asOfMonth);

    return NextResponse.json(
      { error: `Failed to reach forecast service: ${message}` },
      { status: 502 }
    );
  }
}
