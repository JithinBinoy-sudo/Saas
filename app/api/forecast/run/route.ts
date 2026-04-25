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
  // Fastest improvement: use exactly last 6 months to predict the 7th.
  const TRAINING_WINDOW_MONTHS = 6;

  let body: Body | null = null;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = null;
  }

  const revenueByMonth = new Map<string, number>();
  const listingIdsByMonth = new Map<string, Set<string>>();
  for (const row of metricsData as Array<Record<string, unknown>>) {
    const ds = String(row.revenue_month ?? '');
    if (!ds) continue;
    const y = Number(row.revenue ?? 0);
    revenueByMonth.set(ds, (revenueByMonth.get(ds) ?? 0) + y);

    const listingId = String(row.listing_id ?? '');
    if (listingId) {
      const cur = listingIdsByMonth.get(ds) ?? new Set<string>();
      cur.add(listingId);
      listingIdsByMonth.set(ds, cur);
    }
  }

  const portfolioSeries = Array.from(revenueByMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ds, totalRevenue]) => {
      const propertyCount = listingIdsByMonth.get(ds)?.size ?? 0;
      const perPropertyRevenue = propertyCount > 0 ? totalRevenue / propertyCount : 0;
      return { ds, y: perPropertyRevenue, listing_id: PORTFOLIO_LISTING_ID, property_count: propertyCount };
    });

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

  // Use a rolling window ending at asOfMonth (minimum 6 enforced above)
  const forecastData = eligible.slice(-Math.max(TRAINING_MIN_MONTHS, TRAINING_WINDOW_MONTHS));
  const asOfPropertyCount =
    eligible.length > 0 ? (eligible[eligible.length - 1] as { property_count?: number }).property_count ?? 0 : 0;
  const propertyCountHistory = forecastData.map((p) => ({
    ds: p.ds,
    property_count: (p as { property_count?: number }).property_count ?? 0,
  }));

  // 5. Cache + dedupe: if valid forecasts exist, don't recompute
  const { data: existing } = await admin
    .from('revenue_forecasts')
    .select('forecast_month, predicted_revenue')
    .eq('company_id', userRow.company_id)
    .eq('listing_id', PORTFOLIO_LISTING_ID)
    .eq('as_of_month', asOfMonth);

  const hasValidCache =
    existing &&
    existing.length > 0 &&
    existing.some((r: { predicted_revenue: number }) => r.predicted_revenue > 0);

  if (hasValidCache) {
    return NextResponse.json(
      { status: 'cached', as_of_month: asOfMonth, months_used: forecastData.length },
      { status: 200 }
    );
  }

  // If only zero-valued forecasts exist, delete them so we regenerate
  if (existing && existing.length > 0 && !hasValidCache) {
    await admin
      .from('revenue_forecasts')
      .delete()
      .eq('company_id', userRow.company_id)
      .eq('listing_id', PORTFOLIO_LISTING_ID)
      .eq('as_of_month', asOfMonth);

    // Also clear old lock so we can re-run
    await admin
      .from('forecast_runs')
      .delete()
      .eq('company_id', userRow.company_id)
      .eq('as_of_month', asOfMonth);
  }

  // Try to acquire a per-(company, as_of_month) lock row
  const { error: lockErr } = await admin.from('forecast_runs').insert({
    company_id: userRow.company_id,
    as_of_month: asOfMonth,
    status: 'running',
    started_at: new Date().toISOString(),
  });

  if (lockErr) {
    // If the lock table isn't deployed/migrated, surface a real error (don't loop forever).
    const msg =
      lockErr && typeof lockErr === 'object' && 'message' in lockErr
        ? String((lockErr as { message?: unknown }).message ?? '')
        : '';
    const code =
      lockErr && typeof lockErr === 'object' && 'code' in lockErr
        ? String((lockErr as { code?: unknown }).code ?? '')
        : '';

    // Unique violation (another run exists) -> inspect status + staleness.
    if (code === '23505' || msg.toLowerCase().includes('duplicate key')) {
      const { data: runRow } = await admin
        .from('forecast_runs')
        .select('status, started_at, completed_at, error')
        .eq('company_id', userRow.company_id)
        .eq('as_of_month', asOfMonth)
        .maybeSingle();

      // If it's been "running" for too long, mark failed so we can retry.
      const startedAt = runRow?.started_at ? new Date(runRow.started_at).getTime() : null;
      const isStale =
        runRow?.status === 'running' &&
        startedAt != null &&
        Date.now() - startedAt > 5 * 60 * 1000;

      if (isStale) {
        await admin
          .from('forecast_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: 'Stale running lock (auto-failed for retry)',
          })
          .eq('company_id', userRow.company_id)
          .eq('as_of_month', asOfMonth);
      }

      if (runRow?.status === 'complete') {
        // Verify actual forecast data exists for this as_of_month
        const { data: verify } = await admin
          .from('revenue_forecasts')
          .select('predicted_revenue')
          .eq('company_id', userRow.company_id)
          .eq('listing_id', PORTFOLIO_LISTING_ID)
          .eq('as_of_month', asOfMonth)
          .limit(1);

        if (verify && verify.length > 0) {
          return NextResponse.json(
            { status: 'cached', as_of_month: asOfMonth, months_used: forecastData.length },
            { status: 200 }
          );
        }

        // Lock says 'complete' but no data — stale lock from before fix; delete it
        await admin
          .from('forecast_runs')
          .delete()
          .eq('company_id', userRow.company_id)
          .eq('as_of_month', asOfMonth);

        return NextResponse.json(
          { status: 'retry', as_of_month: asOfMonth, error: 'Stale lock without data — retry' },
          { status: 409 }
        );
      }

      if (runRow?.status === 'failed' || isStale) {
        // Delete failed lock so next request can acquire it
        await admin
          .from('forecast_runs')
          .delete()
          .eq('company_id', userRow.company_id)
          .eq('as_of_month', asOfMonth);

        return NextResponse.json(
          { status: 'retry', as_of_month: asOfMonth, error: runRow?.error ?? null },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { status: 'running', as_of_month: asOfMonth },
        { status: 202 }
      );
    }

    // Otherwise, it's a real error (e.g. missing table/migration)
    return NextResponse.json(
      {
        error: 'Forecast dedupe table not available. Deploy Supabase migrations.',
        detail: msg || code,
        as_of_month: asOfMonth,
      },
      { status: 500 }
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
        as_of_month: asOfMonth,
        as_of_property_count: asOfPropertyCount,
        property_count_history: propertyCountHistory,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errMsg = body.detail ?? `Forecast service error (${response.status})`;

      await admin
        .from('forecast_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: String(errMsg),
        })
        .eq('company_id', userRow.company_id)
        .eq('as_of_month', asOfMonth);

      return NextResponse.json(
        { error: errMsg },
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
