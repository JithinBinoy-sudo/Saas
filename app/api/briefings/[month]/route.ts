import { NextRequest, NextResponse } from 'next/server';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';

export async function DELETE(_request: NextRequest, { params }: { params: { month: string } }) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const month = (params.month ?? '').trim();
  if (!month) {
    return NextResponse.json({ error: 'Month is required' }, { status: 400 });
  }

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (userErr || !userRow) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const admin = createAppAdminClient();

  // Delete the generated briefing for this month (drives "Recent Briefings" and the briefing detail page).
  const { error: briefingDeleteErr } = await admin
    .from('monthly_portfolio_briefings')
    .delete()
    .eq('company_id', userRow.company_id)
    .eq('revenue_month', month);

  if (briefingDeleteErr) {
    return NextResponse.json({ error: briefingDeleteErr.message }, { status: 500 });
  }

  // Delete any pipeline runs for the same month so the archive no longer shows the row(s).
  const { error: runsDeleteErr } = await admin
    .from('pipeline_runs')
    .delete()
    .eq('company_id', userRow.company_id)
    .eq('revenue_month', month);

  if (runsDeleteErr) {
    return NextResponse.json({ error: runsDeleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

