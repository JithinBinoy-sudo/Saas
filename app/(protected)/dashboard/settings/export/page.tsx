import { redirect } from 'next/navigation';
import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { ExportButton } from '@/components/settings/ExportButton';

export default async function ExportSettingsPage() {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userRow) redirect('/dashboard');

  const admin = createAppAdminClient();
  const { data: company } = await admin
    .from('companies')
    .select('id, mode, supabase_url, supabase_service_key')
    .eq('id', userRow.company_id)
    .single();

  let availableMonths: string[] = [];
  if (company) {
    const dataClient = getDataClient({
      mode: company.mode,
      supabase_url: company.supabase_url,
      supabase_service_key: company.supabase_service_key,
    });

    const companyId = company.mode === 'hosted' ? company.id : undefined;
    let query = dataClient
      .from('monthly_portfolio_summary')
      .select('revenue_month')
      .order('revenue_month', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);

    const { data: months } = await query;
    availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download reservation data as a formatted Excel report with Summary and Raw Reservations sheets.
        </p>
      </div>

      <ExportButton availableMonths={availableMonths} />

      <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">About the export</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Summary sheet:</strong> Revenue, nights, ADR, and month-over-month deltas per property.</li>
          <li><strong>Raw Reservations sheet:</strong> All uploaded reservation data including custom fields.</li>
          <li>Maximum 50,000 rows per export. Use a narrower date range for larger datasets.</li>
        </ul>
      </div>
    </div>
  );
}
