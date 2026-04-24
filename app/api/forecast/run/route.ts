import { NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL || '';

export async function POST() {
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

  // 4. Limit training window to most recent 6 months per listing
  const byListing = new Map<string, { ds: string; y: number; listing_id: string }[]>();
  for (const row of metricsData as Array<Record<string, unknown>>) {
    const listing_id = String(row.listing_id ?? '');
    if (!listing_id) continue;
    const ds = String(row.revenue_month ?? '');
    const y = Number(row.revenue ?? 0);
    const arr = byListing.get(listing_id) ?? [];
    arr.push({ ds, y, listing_id });
    byListing.set(listing_id, arr);
  }

  const forecastData = Array.from(byListing.values()).flatMap((rows) =>
    rows.slice(-6)
  );

  // 5. Fire-and-forget POST to Railway service
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
    return NextResponse.json({
      status: 'complete',
      forecasts: result.forecasts?.length ?? 0,
      warnings: result.warnings ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to reach forecast service: ${message}` },
      { status: 502 }
    );
  }
}
