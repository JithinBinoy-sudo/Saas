import Link from 'next/link';
import { createAppServerClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { fetchMonthlySummary } from '@/lib/analytics/queries';
import { BriefingCard } from '@/components/pipeline/BriefingCard';
import { KpiCardRow } from '@/components/dashboard/KpiCardRow';

export const metadata = {
  title: 'Portlio — Briefing',
};

export default async function BriefingPage({
  params,
}: {
  params: { month: string };
}) {
  const supabase = createAppServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userRow) return null;

  const { data: companyRow } = await supabase
    .from('companies')
    .select('mode, supabase_url, supabase_service_key')
    .eq('id', userRow.company_id)
    .single();

  if (!companyRow) return null;

  // Fetch briefing from app Supabase (always stored there)
  const { data: briefing } = await supabase
    .from('monthly_portfolio_briefings')
    .select('*')
    .eq('company_id', userRow.company_id)
    .eq('revenue_month', params.month)
    .single();

  if (!briefing) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No briefing found</h1>
        <p className="text-sm text-slate-500">
          No briefing has been generated for {params.month} yet.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Fetch KPI summary for sidebar context
  const dataClient = getDataClient({
    mode: companyRow.mode,
    supabase_url: companyRow.supabase_url,
    supabase_service_key: companyRow.supabase_service_key,
  });
  const companyId = companyRow.mode === 'hosted' ? userRow.company_id : undefined;
  const summary = await fetchMonthlySummary(dataClient, params.month, companyId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            &larr; Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Briefing — {params.month}
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BriefingCard
            revenueMonth={params.month}
            briefingText={briefing.portfolio_summary ?? ''}
            generatedAt={briefing.generated_at}
            model={briefing.model ?? null}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">KPI Context</h3>
            {summary ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Properties</dt>
                  <dd className="font-medium">{summary.property_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Revenue</dt>
                  <dd className="font-medium">
                    ${summary.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">ADR</dt>
                  <dd className="font-medium">${summary.portfolio_adr.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Occupied Nights</dt>
                  <dd className="font-medium">{summary.total_nights}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No summary data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
