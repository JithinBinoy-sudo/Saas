import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { RunHistoryTable } from '@/components/history/RunHistoryTable';
import type { PipelineRunRow } from '@/components/history/RunHistoryTable';

export const metadata = {
  title: 'Portlio — Run History',
};

const PAGE_SIZE = 20;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
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

  const isAdmin = userRow.role === 'admin';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createAppAdminClient();

  // Fetch runs with count
  const { data: runsRaw, count } = await admin
    .from('pipeline_runs')
    .select('*, users!triggered_by(name)', { count: 'exact' })
    .eq('company_id', userRow.company_id)
    .order('started_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count ?? 0;

  const runs: PipelineRunRow[] = (runsRaw ?? []).map((r: {
    id: string;
    revenue_month: string;
    status: string;
    model: string | null;
    users: { name: string } | null;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
  }) => ({
    id: r.id,
    revenue_month: r.revenue_month,
    status: r.status as PipelineRunRow['status'],
    model: r.model,
    triggered_by_name: r.users?.name ?? null,
    started_at: r.started_at,
    completed_at: r.completed_at,
    error_message: r.error_message,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline Run History</h1>
        <p className="mt-1 text-sm text-slate-500">
          All pipeline runs for your company, most recent first.
        </p>
      </header>

      <RunHistoryTable
        runs={runs}
        totalCount={totalCount}
        page={page}
        isAdmin={isAdmin}
      />
    </div>
  );
}
