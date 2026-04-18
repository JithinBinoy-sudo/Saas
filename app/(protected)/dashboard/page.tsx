import Link from 'next/link';
import { createAppServerClient } from '@/lib/supabase/server';
import { fetchDashboardData } from '@/lib/analytics/queries';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { KpiCardRow } from '@/components/dashboard/KpiCardRow';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { ChannelMixChart } from '@/components/dashboard/ChannelMixChart';
import { PropertyTable } from '@/components/dashboard/PropertyTable';
import { RunPipelineButton } from '@/components/pipeline/RunPipelineButton';
import { PipelineStatusBadge } from '@/components/pipeline/PipelineStatusBadge';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import type { AIProviderName, PipelineRunStatus } from '@/lib/pipeline/types';

export const metadata = {
  title: 'Portlio — Dashboard',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow) return null;

  const { data: companyRow } = await supabase
    .from('companies')
    .select('openai_api_key, anthropic_api_key, google_api_key')
    .eq('id', userRow.company_id)
    .single();

  if (!companyRow) return null;

  const dashboardData = await fetchDashboardData(supabase, userRow.company_id, searchParams.month);

  if (dashboardData.availableMonths.length === 0) {
    return <DashboardEmptyState />;
  }

  // Briefing panel data (admin only)
  const isAdmin = userRow.role === 'admin';
  let briefing: { generated_at: string; model: string | null } | null = null;
  let lastRunStatus: PipelineRunStatus | null = null;
  let currentModel = 'gpt-4o';
  const configuredProviders: AIProviderName[] = [];

  if (isAdmin) {
    // Determine which providers have configured keys
    if (companyRow.openai_api_key) configuredProviders.push('openai');
    if (companyRow.anthropic_api_key) configuredProviders.push('anthropic');
    if (companyRow.google_api_key) configuredProviders.push('google');

    // Get current model preference
    const { data: promptConfig } = await supabase
      .from('prompt_configs')
      .select('model')
      .eq('company_id', userRow.company_id)
      .single();
    if (promptConfig?.model) currentModel = promptConfig.model;

    // Get latest briefing for selected month
    const { data: briefingRow } = await supabase
      .from('monthly_portfolio_briefings')
      .select('generated_at, model')
      .eq('company_id', userRow.company_id)
      .eq('revenue_month', dashboardData.selectedMonth)
      .single();
    if (briefingRow) briefing = briefingRow;

    // Get latest pipeline run status
    const { data: runRow } = await supabase
      .from('pipeline_runs')
      .select('status')
      .eq('company_id', userRow.company_id)
      .eq('revenue_month', dashboardData.selectedMonth)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    if (runRow) lastRunStatus = runRow.status as PipelineRunStatus;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          Portfolio Overview
        </h1>
        <MonthPicker
          availableMonths={dashboardData.availableMonths}
          selectedMonth={dashboardData.selectedMonth}
        />
      </header>

      <KpiCardRow
        summary={dashboardData.summary}
        priorSummary={dashboardData.priorSummary}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendChart data={dashboardData.trendData} />
        </div>
        <div>
          <ChannelMixChart data={dashboardData.channelMix} />
        </div>
      </div>

      <PropertyTable rows={dashboardData.properties} />

      {isAdmin && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Portfolio Briefing</h2>
              {briefing ? (
                <p className="text-sm text-slate-500">
                  Last generated: {new Date(briefing.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {briefing.model && SUPPORTED_MODELS[briefing.model] && (
                    <> with {SUPPORTED_MODELS[briefing.model].displayName}</>
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-500">No briefing generated yet for this month.</p>
              )}
            </div>
            {lastRunStatus && <PipelineStatusBadge status={lastRunStatus} />}
          </div>

          <div className="flex items-center gap-4">
            <RunPipelineButton
              currentModel={currentModel}
              revenueMonth={dashboardData.selectedMonth}
              configuredProviders={configuredProviders}
            />
            {briefing && (
              <Link
                href={`/dashboard/briefings/${dashboardData.selectedMonth}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View Briefing
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
