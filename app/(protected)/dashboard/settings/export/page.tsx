import { redirect } from 'next/navigation';
import { createAppServerClient } from '@/lib/supabase/server';
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

  let availableMonths: string[] = [];
  const { data: months } = await supabase
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', userRow.company_id)
    .order('revenue_month', { ascending: false });
  availableMonths = (months ?? []).map((m: { revenue_month: string }) => m.revenue_month);

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
