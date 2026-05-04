import { createAppServerClient } from '@/lib/supabase/server';
import { fetchDashboardData } from '@/lib/analytics/queries';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard';
import { toProperties } from '@/lib/adapters/property';
import { toChartData } from '@/lib/adapters/chart';
import { toKpis } from '@/lib/adapters/kpis';
import { toBriefingSummaries, type BriefingDbRow } from '@/lib/adapters/briefing';
import {
  isoToYearMonth,
  monthOptionsFromIsoList,
  yearsFromIsoList,
} from '@/lib/utils/month';

type Props = {
  userId: string;
  monthParam?: string;
};

const SHORT_MONTH = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

const ISO_DATE = (iso: string | null | undefined) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : 'unknown';

export async function DashboardPage({ userId, monthParam }: Props) {
  const supabase = createAppServerClient();

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id, role, name, email')
    .eq('id', userId)
    .single();

  if (!userRow) return null;

  const user = {
    name: userRow.name,
    email: userRow.email,
    role: (userRow.role ?? 'member') as 'admin' | 'member',
  };

  const { data: companyRow } = await supabase
    .from('companies')
    .select('mode')
    .eq('id', userRow.company_id)
    .single();

  const companyMode =
    String(companyRow?.mode ?? '').trim().toLowerCase() === 'byos' ? 'byos' : 'hosted';

  const dashboardData = await fetchDashboardData(
    supabase,
    userRow.company_id,
    monthParam,
  );

  if (dashboardData.availableMonths.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader user={user} />
        <main className="container mx-auto px-6 py-12">
          <EmptyDashboard mode={companyMode} isAdmin={user.role === 'admin'} />
        </main>
      </div>
    );
  }

  const properties = toProperties(dashboardData.properties);
  const chartData = toChartData(dashboardData.trendData, dashboardData.forecastSeries);
  const kpis = toKpis(dashboardData.summary, dashboardData.priorSummary);

  const monthOptions = monthOptionsFromIsoList(dashboardData.availableMonths);
  const yearOptions = yearsFromIsoList(dashboardData.availableMonths);
  const selectedYearMonth = isoToYearMonth(dashboardData.selectedMonth);

  const lastTrendIso = dashboardData.trendData.length
    ? dashboardData.trendData[dashboardData.trendData.length - 1].revenue_month
    : null;
  const forecastBoundaryLabel = lastTrendIso ? SHORT_MONTH(lastTrendIso) : null;

  const forecastModelLabel = dashboardData.forecastSeries[0]?.model_used
    ? dashboardData.forecastSeries[0].model_used === 'prophet'
      ? 'Prophet model'
      : 'ARIMA model'
    : 'No forecast yet';

  const { data: briefingRows } = await supabase
    .from('monthly_portfolio_briefings')
    .select('revenue_month, portfolio_summary, generated_at, model, briefing_name')
    .eq('company_id', userRow.company_id)
    .order('generated_at', { ascending: false })
    .limit(4);

  const briefings = toBriefingSummaries((briefingRows ?? []) as BriefingDbRow[]);

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-6 py-8">
        <DashboardView
          selectedMonth={selectedYearMonth}
          selectedMonthIso={dashboardData.selectedMonth}
          monthOptions={monthOptions}
          yearOptions={yearOptions}
          kpis={kpis}
          chartData={chartData}
          forecastBoundaryLabel={forecastBoundaryLabel}
          forecastModelLabel={forecastModelLabel}
          asOfLabel={ISO_DATE(dashboardData.selectedMonth)}
          hasForecast={dashboardData.forecastSeries.length > 0}
          properties={properties}
          briefings={briefings}
        />
      </main>
    </div>
  );
}
