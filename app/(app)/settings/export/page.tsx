import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { createAppServerClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ExportButton } from '@/components/settings/ExportButton';

export const metadata = {
  title: 'Portlio · Export',
};

export default async function ExportSettingsPage() {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userRow) redirect('/');

  let availableMonths: string[] = [];
  const { data: months } = await supabase
    .from('monthly_portfolio_summary')
    .select('revenue_month')
    .eq('company_id', userRow.company_id)
    .order('revenue_month', { ascending: false });
  availableMonths = (months ?? []).map(
    (m: { revenue_month: string }) => m.revenue_month,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Export Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download reservation data as a formatted Excel report with Summary and Raw
          Reservations sheets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <ExportButton availableMonths={availableMonths} />
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">About the export</h2>
          </div>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <div className="font-semibold">Summary Sheet</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Aggregated metrics including total Revenue, booked nights, ADR (Average
                Daily Rate), and Month-over-Month performance deltas.
              </div>
            </li>
            <li>
              <div className="font-semibold">Raw Reservations</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The complete, unedited dataset of uploaded reservation data for granular
                analysis or import into third-party systems.
              </div>
            </li>
            <li>
              <div className="font-semibold">AI Briefing</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Automatically appended as a separate sheet if a generated briefing exists
                for the selected date range.
              </div>
            </li>
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            Maximum 50,000 rows per export. Use a narrower date range for larger datasets.
          </p>
        </Card>
      </div>
    </div>
  );
}
