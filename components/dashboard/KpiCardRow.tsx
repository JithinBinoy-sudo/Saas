import type { MonthlyPortfolioSummary } from '@/lib/analytics/types';
import { KpiCard } from './KpiCard';

type Props = {
  summary: MonthlyPortfolioSummary | null;
  priorSummary: MonthlyPortfolioSummary | null;
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function KpiCardRow({ summary, priorSummary }: Props) {
  if (!summary) return null;

  const revenueDelta = priorSummary
    ? summary.total_revenue - priorSummary.total_revenue
    : null;
  const nightsDelta = priorSummary
    ? summary.total_nights - priorSummary.total_nights
    : null;
  const adrDelta = priorSummary
    ? summary.portfolio_adr - priorSummary.portfolio_adr
    : null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Total Revenue"
        value={fmtCurrency(summary.total_revenue)}
        delta={revenueDelta}
        deltaLabel="vs last month"
      />
      <KpiCard
        label="Occupied Nights"
        value={fmt(summary.total_nights)}
        delta={nightsDelta}
        deltaLabel="vs last month"
      />
      <KpiCard
        label="Portfolio ADR"
        value={fmtCurrency(summary.portfolio_adr)}
        delta={adrDelta}
        deltaLabel="vs last month"
      />
      <KpiCard
        label="Properties"
        value={fmt(summary.property_count)}
      />
    </div>
  );
}
