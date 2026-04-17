import { createAppServerClient } from '@/lib/supabase/server';
import { getDataClient } from '@/lib/getDataClient';
import { fetchDashboardData } from '@/lib/analytics/queries';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { KpiCardRow } from '@/components/dashboard/KpiCardRow';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { ChannelMixChart } from '@/components/dashboard/ChannelMixChart';
import { PropertyTable } from '@/components/dashboard/PropertyTable';

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

  const dataClient = getDataClient({
    mode: companyRow.mode,
    supabase_url: companyRow.supabase_url,
    supabase_service_key: companyRow.supabase_service_key,
  });

  // For hosted mode, filter by company_id; BYOS views have no company_id column
  const companyId =
    companyRow.mode === 'hosted' ? userRow.company_id : undefined;

  const dashboardData = await fetchDashboardData(
    dataClient,
    companyId,
    searchParams.month
  );

  if (dashboardData.availableMonths.length === 0) {
    return <DashboardEmptyState />;
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
    </div>
  );
}
