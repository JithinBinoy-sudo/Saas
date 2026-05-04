import { createAppServerClient, createAppAdminClient } from '@/lib/supabase/server';
import { BriefingArchive } from '@/components/history/BriefingArchive';
import type { BriefingArchiveRow } from '@/components/history/BriefingArchive';

export const metadata = {
  title: 'Portlio — Run History',
};

const PAGE_SIZE = 20;

type BriefingRow = {
  revenue_month: string;
  portfolio_summary: string | null;
  generated_at: string;
  model: string | null;
  briefing_name: string | null;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
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
  const q = (searchParams.q ?? '').trim();

  const admin = createAppAdminClient();

  // Fetch runs with count
  const { data: runsRaw, count } = await admin
    .from('pipeline_runs')
    .select('*, users!triggered_by(name)', { count: 'exact' })
    .eq('company_id', userRow.company_id)
    .order('started_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count ?? 0;

  const runRows = (runsRaw ?? []).map((r: {
    id: string;
    revenue_month: string;
    status: string;
    model: string | null;
    users: { name: string } | null;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
  }) => r);

  const months = Array.from(new Set(runRows.map((r) => r.revenue_month))).filter(Boolean);
  const { data: briefingsRaw } = months.length
    ? await admin
        .from('monthly_portfolio_briefings')
        .select('revenue_month, portfolio_summary, generated_at, model, briefing_name')
        .eq('company_id', userRow.company_id)
        .in('revenue_month', months)
    : { data: [] as unknown[] };

  const briefings = (briefingsRaw ?? []) as BriefingRow[];
  const briefingByMonth = new Map<
    string,
    { portfolio_summary: string | null; generated_at: string; model: string | null; briefing_name: string | null }
  >(
    briefings.map((b) => [
      b.revenue_month,
      {
        portfolio_summary: b.portfolio_summary ?? null,
        generated_at: b.generated_at,
        model: b.model ?? null,
        briefing_name: b.briefing_name ?? null,
      },
    ])
  );

  const rows: BriefingArchiveRow[] = runRows.map((r) => {
    const briefing = briefingByMonth.get(r.revenue_month) ?? null;
    return {
      id: r.id,
      revenue_month: r.revenue_month,
      status: r.status as BriefingArchiveRow['status'],
      model: r.model ?? briefing?.model ?? null,
      started_at: r.started_at,
      completed_at: r.completed_at,
      error_message: r.error_message,
      generated_at: briefing?.generated_at ?? r.completed_at ?? r.started_at,
      portfolio_summary: briefing?.portfolio_summary ?? null,
      briefing_name: briefing?.briefing_name ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <BriefingArchive rows={rows} totalCount={totalCount} page={page} isAdmin={isAdmin} initialQuery={q} />
    </div>
  );
}
