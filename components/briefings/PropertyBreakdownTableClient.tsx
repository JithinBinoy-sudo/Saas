'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PropertyMonthRow } from '@/lib/analytics/types';

function fmtMoney2(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(pct: number) {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

type Props = {
  rows: PropertyMonthRow[];
};

const DEFAULT_VISIBLE = 3;

export function PropertyBreakdownTableClient({ rows }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visibleRows = useMemo(
    () => (expanded ? rows : rows.slice(0, DEFAULT_VISIBLE)),
    [expanded, rows]
  );

  const showViewAll = !expanded && rows.length > DEFAULT_VISIBLE;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-t border-white/10 text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-4">Property</th>
              <th className="px-6 py-4">Revenue</th>
              <th className="px-6 py-4">vs Median</th>
              <th className="px-6 py-4">Nights</th>
              <th className="px-6 py-4">ADR</th>
              <th className="px-6 py-4">vs Prev</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {visibleRows.map((p) => {
              const median = p.portfolio_median_revenue ?? 0;
              const revenue = p.revenue ?? 0;
              const nights = p.occupied_nights ?? 0;
              const adr = p.adr ?? 0;

              const revenueDelta = p.revenue_delta ?? null;
              const prevRevenue = revenueDelta === null ? null : revenue - revenueDelta;
              const vsPrevPct =
                prevRevenue && prevRevenue !== 0 ? (revenue - prevRevenue) / prevRevenue : null;
              const vsMedianPct = median && median !== 0 ? revenue / median - 1 : null;

              const vsPrevCls =
                vsPrevPct === null
                  ? 'text-zinc-500'
                  : vsPrevPct >= 0
                    ? 'text-emerald-300'
                    : 'text-rose-300';
              const vsMedianCls =
                vsMedianPct === null
                  ? 'text-zinc-500'
                  : vsMedianPct >= 0
                    ? 'text-emerald-300'
                    : 'text-rose-300';

              return (
                <tr key={p.listing_id ?? p.listing_nickname}>
                  <td className="px-6 py-4 font-medium text-white">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-sky-400/80" aria-hidden />
                      {p.listing_nickname ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-200">${fmtMoney2(revenue)}</td>
                  <td className={cn('px-6 py-4 text-xs font-semibold', vsMedianCls)}>
                    {vsMedianPct === null ? '—' : fmtPct(vsMedianPct * 100)}
                  </td>
                  <td className="px-6 py-4 text-zinc-200">{nights}</td>
                  <td className="px-6 py-4 text-zinc-200">${fmtMoney2(adr)}</td>
                  <td className={cn('px-6 py-4 text-xs font-semibold', vsPrevCls)}>
                    {vsPrevPct === null ? '—' : fmtPct(vsPrevPct * 100)}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-zinc-500" colSpan={6}>
                  No property data available for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showViewAll && (
        <div className="flex items-center justify-center border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs font-semibold text-cyan-400/90 transition hover:text-cyan-300"
          >
            View All Properties
          </button>
        </div>
      )}
    </>
  );
}

