import Link from 'next/link';
import { createAppServerClient } from '@/lib/supabase/server';
import { fetchMonthlySummary, fetchPropertyRows } from '@/lib/analytics/queries';
import type { PropertyMonthRow } from '@/lib/analytics/types';
import { SUPPORTED_MODELS } from '@/lib/pipeline/types';
import { cn } from '@/lib/utils';
import { UpdatedBriefingDetailClient } from '@/components/briefings/UpdatedBriefingDetailClient';
import { PropertyBreakdownTableClient } from '@/components/briefings/PropertyBreakdownTableClient';

export const metadata = {
  title: 'Portlio — Briefing',
};

function fmtMoney(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMoney2(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(pct: number) {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function Sparkline({
  points,
  strokeClass,
  fillClass,
}: {
  points: number[];
  strokeClass: string;
  fillClass: string;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1e-6, max - min);
  const w = 120;
  const h = 34;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const toY = (v: number) => h - ((v - min) / range) * h;

  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${toY(v).toFixed(1)}`)
    .join(' ');

  const area = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden>
      <path d={area} className={cn('opacity-20', fillClass)} />
      <path d={d} className={cn('fill-none stroke-[2.5]', strokeClass)} strokeLinecap="round" />
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-white/15"
          style={{ height: `${Math.max(6, Math.round((v / max) * 22))}px` }}
        />
      ))}
    </div>
  );
}

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
        <h1 className="text-xl font-semibold text-white">No briefing found</h1>
        <p className="text-sm text-zinc-500">
          No briefing has been generated for {params.month} yet.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-cyan-400/90 transition hover:text-cyan-300"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const [summary, properties] = await Promise.all([
    fetchMonthlySummary(supabase, params.month, userRow.company_id),
    fetchPropertyRows(supabase, params.month, userRow.company_id),
  ]);

  const { data: prevSummaryRow } = await supabase
    .from('monthly_portfolio_summary')
    .select('*')
    .eq('company_id', userRow.company_id)
    .lt('revenue_month', params.month)
    .order('revenue_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevSummary = prevSummaryRow ?? null;

  const deltaRevenuePct =
    summary && prevSummary && Number(prevSummary.total_revenue) !== 0
      ? ((Number(summary.total_revenue) - Number(prevSummary.total_revenue)) / Number(prevSummary.total_revenue)) * 100
      : null;
  const deltaAdrPct =
    summary && prevSummary && Number(prevSummary.portfolio_adr) !== 0
      ? ((Number(summary.portfolio_adr) - Number(prevSummary.portfolio_adr)) / Number(prevSummary.portfolio_adr)) * 100
      : null;
  const deltaNightsPct =
    summary && prevSummary && Number(prevSummary.total_nights) !== 0
      ? ((Number(summary.total_nights) - Number(prevSummary.total_nights)) / Number(prevSummary.total_nights)) * 100
      : null;

  const modelDisplay =
    briefing.model && SUPPORTED_MODELS[briefing.model]
      ? SUPPORTED_MODELS[briefing.model].displayName
      : briefing.model ?? 'Unknown model';

  const generatedAt = new Date(briefing.generated_at);
  const generatedLabel = generatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const statCards = [
    {
      label: 'Properties',
      value: summary ? String(summary.property_count) : '—',
      deltaLabel: null as string | null,
      deltaTone: 'neutral' as const,
      icon: 'apartment',
      hue: 'from-violet-500/25 to-fuchsia-600/10',
      footer: (
        <div className="mt-3">
          <div className="h-2.5 w-full rounded-full bg-white/5">
            <div className="h-2.5 w-[65%] rounded-full bg-gradient-to-r from-violet-400/70 to-cyan-300/70" />
          </div>
          <div className="mt-2 text-[10px] font-semibold text-zinc-500">85%</div>
        </div>
      ),
    },
    {
      label: 'ADR',
      value: summary ? `$${fmtMoney2(Number(summary.portfolio_adr))}` : '—',
      deltaLabel: deltaAdrPct === null ? '—' : fmtPct(deltaAdrPct),
      deltaTone: deltaAdrPct === null ? 'neutral' : deltaAdrPct >= 0 ? 'up' : 'down',
      icon: 'sell',
      hue: 'from-zinc-500/15 to-white/5',
      footer: (
        <div className="mt-3 flex items-end justify-between">
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            deltaAdrPct === null
              ? 'bg-white/5 text-zinc-500'
              : deltaAdrPct >= 0
                ? 'bg-emerald-400/10 text-emerald-200'
                : 'bg-rose-400/10 text-rose-200'
          )}>
            {deltaAdrPct === null ? '—' : fmtPct(deltaAdrPct)}
          </span>
          <Sparkline
            points={[18, 16, 15, 13, 12, 11, 10]}
            strokeClass="stroke-rose-300/90"
            fillClass="fill-rose-400/90"
          />
        </div>
      ),
    },
    {
      label: 'Occupied Nights',
      value: summary ? String(summary.total_nights) : '—',
      deltaLabel: deltaNightsPct === null ? '—' : fmtPct(deltaNightsPct),
      deltaTone: deltaNightsPct === null ? 'neutral' : deltaNightsPct >= 0 ? 'up' : 'down',
      icon: 'hotel',
      hue: 'from-sky-500/25 to-blue-600/10',
      footer: (
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[10px] font-semibold text-zinc-500">Trailing 30d</span>
          <MiniBars values={[8, 14, 10, 18, 12, 20]} />
        </div>
      ),
    },
    {
      label: 'Total Revenue',
      value: summary ? `$${fmtMoney(Number(summary.total_revenue))}` : '—',
      deltaLabel: deltaRevenuePct === null ? '—' : fmtPct(deltaRevenuePct),
      deltaTone: deltaRevenuePct === null ? 'neutral' : deltaRevenuePct >= 0 ? 'up' : 'down',
      icon: 'payments',
      hue: 'from-emerald-500/20 to-cyan-600/10',
      footer: (
        <div className="mt-3 flex items-end justify-between">
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            deltaRevenuePct === null
              ? 'bg-white/5 text-zinc-500'
              : deltaRevenuePct >= 0
                ? 'bg-emerald-400/10 text-emerald-200'
                : 'bg-rose-400/10 text-rose-200'
          )}>
            {deltaRevenuePct === null ? '—' : fmtPct(deltaRevenuePct)}
          </span>
          <Sparkline
            points={[10, 12, 11, 14, 16, 15, 18]}
            strokeClass="stroke-emerald-300/90"
            fillClass="fill-emerald-400/90"
          />
        </div>
      ),
    },
  ] as const;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-28 h-[min(55vh,34rem)] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.18),transparent_55%),radial-gradient(ellipse_at_70%_0%,rgba(34,211,238,0.10),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                auto_awesome
              </span>
              Generated with {modelDisplay}
            </span>
            <span aria-hidden className="text-zinc-700">
              •
            </span>
            <span>Auto-Analysis</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Updated Portfolio Briefing Detail
          </h1>
          <p className="text-xl font-semibold text-zinc-500">{params.month}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((c) => (
            <div
              key={c.label}
              className={cn(
                'rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]',
                'relative overflow-hidden'
              )}
            >
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" aria-hidden />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">{c.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{c.value}</p>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10',
                    c.hue
                  )}
                >
                  <span className="material-symbols-outlined text-[20px] text-white/90" aria-hidden>
                    {c.icon}
                  </span>
                </div>
              </div>

              {c.footer}
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-zinc-300" aria-hidden>
                description
              </span>
              <h2 className="text-sm font-semibold text-white">Executive Summary</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">{generatedLabel}</span>
              <UpdatedBriefingDetailClient briefingText={briefing.portfolio_summary ?? ''} />
            </div>
          </div>

          <div className="mt-4 columns-1 gap-10 text-sm leading-relaxed text-zinc-300 md:columns-2">
            <div className="whitespace-pre-wrap break-words">
              {briefing.portfolio_summary ?? ''}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 shadow-[0px_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.06]">
          <div className="flex items-start justify-between gap-6 px-6 py-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Property Breakdown</h2>
              <p className="mt-1 text-xs text-zinc-500">Trailing 30 days performance metrics by unit.</p>
            </div>
          </div>

          <PropertyBreakdownTableClient rows={properties as PropertyMonthRow[]} />
        </section>
      </div>
    </div>
  );
}
