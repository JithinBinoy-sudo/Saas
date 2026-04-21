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
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white/95">Export Data</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Download reservation data as a formatted Excel report with Summary and Raw Reservations sheets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.55)] p-6">
          <ExportButton availableMonths={availableMonths} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,0,0,0.55)] p-6">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-secondary"
            >
              <span className="material-symbols-outlined text-[16px]">info</span>
            </span>
            <h2 className="text-sm font-semibold text-white/90">About the export</h2>
          </div>
          <ul className="mt-4 space-y-4 text-sm text-zinc-400">
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
              <div>
                <div className="font-semibold text-white/85">Summary Sheet</div>
                <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Aggregated metrics including total Revenue, booked nights, ADR (Average Daily Rate), and
                  Month-over-Month performance deltas.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
              <div>
                <div className="font-semibold text-white/85">Raw Reservations</div>
                <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                  The complete, unedited dataset of uploaded reservation data for granular analysis or import into
                  third-party systems.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
              <div>
                <div className="font-semibold text-white/85">AI Briefing</div>
                <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Automatically appended as a separate sheet if a generated briefing exists for the selected date range,
                  containing narrative insights.
                </div>
              </div>
            </li>
          </ul>

          <p className="mt-5 text-xs text-zinc-600">
            Maximum 50,000 rows per export. Use a narrower date range for larger datasets.
          </p>
        </div>
      </div>
    </div>
  );
}
