import { createAppServerClient } from '@/lib/supabase/server';
import { fetchDashboardData } from '@/lib/analytics/queries';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { ByosEmptyDashboard } from '@/components/dashboard/ByosEmptyDashboard';
import { HostedEmptyDashboard } from '@/components/dashboard/HostedEmptyDashboard';

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
    .select('mode')
    .eq('id', userRow.company_id)
    .single();

  const companyMode = companyRow?.mode === 'byos' ? 'byos' : 'hosted';

  const dashboardData = await fetchDashboardData(
    supabase,
    userRow.company_id,
    searchParams.month
  );

  if (dashboardData.availableMonths.length === 0) {
    if (companyMode === 'byos') {
      return (
        <div className="mx-auto flex min-h-[24rem] w-full max-w-2xl flex-col items-center justify-center gap-10 py-6">
          <ByosEmptyDashboard />
        </div>
      );
    }
    return (
      <div className="mx-auto flex min-h-[24rem] w-full max-w-2xl flex-col items-center justify-center py-6">
        <HostedEmptyDashboard isAdmin={userRow.role === 'admin'} />
      </div>
    );
  }

  return <DashboardContent {...dashboardData} />;
}
